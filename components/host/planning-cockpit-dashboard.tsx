"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { BookOpen, FolderOpen, HardDrive, LayoutDashboard, Plus, Trash2, Download } from "lucide-react";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import type { BookPlanningContext } from "../../lib/book-planning-context";
import {
  defaultWorkspaceState,
  loadWorkspaceState,
  readFilesAsPack,
  saveWorkspaceState,
  type PlanningPack,
  type WorkspaceProject,
  type WorkspaceStateV1,
} from "../../lib/workspace-storage";

export type PlanningCockpitDashboardProps = {
  /** Live monorepo pane (APIs, placeholder, or full PlanningCockpit). */
  livePane: React.ReactNode;
  /** When set (e.g. opened from reader), show book strip + optional reader tab. */
  bookContext?: BookPlanningContext;
  /**
   * Build reader iframe URL when bookContext.embedReader is true.
   * Defaults to `/apps/reader?book=<slug>` — override for custom reader base paths.
   */
  readerAppHref?: (opts: { book: string }) => string;
  /**
   * Preloaded packs (e.g. from `/planning-embed/builtin-packs.json`).
   * Not duplicated into `localStorage` packs; selection uses `surfaceBuiltinPackId`.
   */
  builtinPacks?: PlanningPack[];
};

function defaultReaderAppHref(opts: { book: string }): string {
  const p = new URLSearchParams();
  p.set("book", opts.book);
  return `/apps/reader?${p.toString()}`;
}

export function PlanningCockpitDashboard({
  livePane,
  bookContext,
  readerAppHref = defaultReaderAppHref,
  builtinPacks = [],
}: PlanningCockpitDashboardProps) {
  const [state, setState] = useState<WorkspaceStateV1>(defaultWorkspaceState);
  const [hydrated, setHydrated] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<"workspace" | "reader">("workspace");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setState(loadWorkspaceState());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: WorkspaceStateV1) => {
    setState(next);
    const r = saveWorkspaceState(next);
    if (!r.ok) setSaveError(r.error);
    else setSaveError(null);
  }, []);

  const liveProject = useMemo((): Extract<WorkspaceProject, { kind: "live" }> => {
    const lp = state.projects.find((p): p is Extract<WorkspaceProject, { kind: "live" }> => p.kind === "live");
    return lp ?? { id: "live", kind: "live", label: "This repository" };
  }, [state.projects]);

  const surfaceBuiltinId = state.surfaceBuiltinPackId ?? null;
  const userActive = state.projects.find((p) => p.id === state.activeProjectId);
  const userPackProjects = useMemo(
    () => state.projects.filter((p): p is Extract<WorkspaceProject, { kind: "pack" }> => p.kind === "pack"),
    [state.projects],
  );

  const activePackForMarkdown = useMemo((): PlanningPack | undefined => {
    if (surfaceBuiltinId) {
      return builtinPacks.find((bp) => bp.id === surfaceBuiltinId);
    }
    if (userActive?.kind === "pack") {
      return state.packs[userActive.packId];
    }
    return undefined;
  }, [surfaceBuiltinId, builtinPacks, userActive, state.packs]);

  const showLivePane = hydrated && state.activeProjectId === liveProject.id && !surfaceBuiltinId;

  const selectLive = () => {
    persist({ ...state, activeProjectId: liveProject.id, surfaceBuiltinPackId: null });
  };

  const selectBuiltin = (packId: string) => {
    persist({ ...state, activeProjectId: liveProject.id, surfaceBuiltinPackId: packId });
  };

  const selectUserPackProject = (id: string) => {
    persist({ ...state, activeProjectId: id, surfaceBuiltinPackId: null });
  };

  const addPackFromFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setSaveError(null);
    try {
      const pack = await readFilesAsPack(files);
      const projectId = `pack-${pack.id}`;
      const next: WorkspaceStateV1 = {
        ...state,
        packs: { ...state.packs, [pack.id]: pack },
        projects: [...state.projects, { id: projectId, kind: "pack", label: pack.name, packId: pack.id }],
        activeProjectId: projectId,
        surfaceBuiltinPackId: null,
      };
      persist(next);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeActivePackProject = () => {
    if (surfaceBuiltinId) return;
    const ua = userActive;
    if (!ua || ua.kind !== "pack") return;
    const packId = ua.packId;
    const nextProjects = state.projects.filter((p) => p.id !== ua.id);
    const { [packId]: _removed, ...restPacks } = state.packs;
    persist({
      ...state,
      projects: nextProjects.length ? nextProjects : defaultWorkspaceState().projects,
      packs: restPacks,
      activeProjectId: "live",
      surfaceBuiltinPackId: null,
    });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `repo-planner-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const readerSrc = bookContext?.embedReader ? readerAppHref({ book: bookContext.bookSlug }) : null;

  const workspaceBody = !hydrated ? (
    <div className="rounded-2xl border border-border bg-dark-alt/50 p-8 text-center text-text-muted">
      Loading workspace…
    </div>
  ) : (
    <div className="flex min-h-[28rem] flex-col gap-4 lg:flex-row lg:gap-0">
      <aside className="flex w-full flex-shrink-0 flex-col border-border lg:w-64 lg:border-r lg:pr-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
          <LayoutDashboard size={14} className="text-accent" />
          Dashboard
        </div>
        <p className="mb-3 text-xs leading-relaxed text-text-muted">
          <strong className="text-text">This repository</strong> uses live planning APIs. Built-in packs ship with the site;
          your uploads live in{" "}
          <code className="rounded bg-dark-alt px-1 py-0.5 text-[11px]">localStorage</code> — export JSON to back up.
        </p>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={selectLive}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                showLivePane ? "bg-accent/15 text-primary" : "text-text-muted hover:bg-white/5 hover:text-primary"
              }`}
            >
              <HardDrive size={16} className="flex-shrink-0 opacity-70" />
              <span className="truncate">{liveProject.label}</span>
            </button>
          </li>
          {builtinPacks.map((bp) => (
            <li key={bp.id}>
              <button
                type="button"
                onClick={() => selectBuiltin(bp.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  surfaceBuiltinId === bp.id
                    ? "bg-accent/15 text-primary"
                    : "text-text-muted hover:bg-white/5 hover:text-primary"
                }`}
              >
                <FolderOpen size={16} className="flex-shrink-0 opacity-70" />
                <span className="truncate">{bp.name}</span>
              </button>
            </li>
          ))}
          {userPackProjects.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => selectUserPackProject(p.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  !surfaceBuiltinId && p.id === state.activeProjectId
                    ? "bg-accent/15 text-primary"
                    : "text-text-muted hover:bg-white/5 hover:text-primary"
                }`}
              >
                <FolderOpen size={16} className="flex-shrink-0 opacity-70" />
                <span className="truncate">{p.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".md,.mdx,.xml,.toml,.txt,text/markdown,text/plain,application/xml"
          className="hidden"
          onChange={(e) => addPackFromFiles(e.target.files)}
        />
        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-border"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus size={16} />
            Add pack from files
          </Button>
          {userActive?.kind === "pack" && !surfaceBuiltinId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-rose-300 hover:text-rose-200"
              onClick={removeActivePackProject}
            >
              <Trash2 size={16} />
              Remove pack workspace
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={exportJson}
          >
            <Download size={16} />
            Export workspace JSON
          </Button>
        </div>
        {saveError ? (
          <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/30 p-2 text-xs text-rose-200">{saveError}</p>
        ) : null}
      </aside>

      <div className="min-w-0 flex-1 lg:pl-4">
        {showLivePane ? (
          <div className="min-h-[24rem] overflow-hidden rounded-2xl border border-border bg-dark-alt/40">{livePane}</div>
        ) : null}
        {activePackForMarkdown ? (
          <div className="space-y-4 rounded-2xl border border-border bg-dark-alt/40 p-4">
            <header>
              <h2 className="text-lg font-semibold text-primary">{activePackForMarkdown.name}</h2>
              <p className="mt-1 text-xs text-text-muted">
                {Array.isArray(activePackForMarkdown.files) ? activePackForMarkdown.files.length : 0} file(s) · read-only
                in browser · not written to the server
                {surfaceBuiltinId ? " · built-in pack" : ""}
              </p>
            </header>
            <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
              {(Array.isArray(activePackForMarkdown.files) ? activePackForMarkdown.files : []).map((f, index) => (
                <article
                  key={`${f.path}-${index}`}
                  className="border-b border-border/60 pb-6 last:border-0"
                >
                  <h3 className="mb-2 font-mono text-sm text-accent">{f.path}</h3>
                  <div className="prose prose-invert prose-sm max-w-none text-text">
                    <ReactMarkdown>{f.content ? f.content : "_Empty file_"}</ReactMarkdown>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        {!showLivePane && !activePackForMarkdown ? (
          <p className="text-text-muted">Pack data missing — pick another workspace or re-upload.</p>
        ) : null}
      </div>
    </div>
  );

  const bookStrip =
    bookContext && (bookContext.planningLinks?.length || bookContext.bookTitle || bookContext.embedReader) ? (
      <div className="mb-4 rounded-xl border border-border/80 bg-dark-alt/50 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Book</span>
          <span className="text-sm text-primary">{bookContext.bookTitle ?? bookContext.bookSlug}</span>
          {bookContext.planningLinks?.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-border/60 bg-dark/40 px-2.5 py-1 text-xs text-text-muted transition hover:border-accent/40 hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    ) : null;

  if (!readerSrc) {
    return (
      <div className="flex flex-col">
        {bookStrip}
        {workspaceBody}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {bookStrip}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "workspace" | "reader")} className="w-full">
        <TabsList className="mb-3 bg-dark-alt/80">
          <TabsTrigger value="workspace" className="gap-1.5 data-[state=active]:bg-dark-elevated">
            <LayoutDashboard size={14} />
            Planning workspace
          </TabsTrigger>
          <TabsTrigger value="reader" className="gap-1.5 data-[state=active]:bg-dark-elevated">
            <BookOpen size={14} />
            EPUB reader
          </TabsTrigger>
        </TabsList>
        <TabsContent value="workspace" className="mt-0">
          {workspaceBody}
        </TabsContent>
        <TabsContent value="reader" className="mt-0">
          <div className="overflow-hidden rounded-xl border border-border bg-black/20">
            <iframe
              title={`Reader: ${bookContext?.bookSlug ?? "book"}`}
              src={readerSrc}
              className="h-[min(72vh,800px)] w-full border-0 bg-dark"
            />
          </div>
          <p className="mt-2 text-center text-[11px] text-text-muted">
            Same reader as{" "}
            <Link href={readerSrc} className="text-accent underline" target="_blank" rel="noreferrer">
              Apps → Reader
            </Link>{" "}
            — embedded here so you can keep planning docs alongside the book.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
