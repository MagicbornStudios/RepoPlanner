"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  FolderUp,
  HardDrive,
  LayoutDashboard,
  Layers,
  LineChart,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { PlanningCockpit } from "../organisms/planning-cockpit";
import type { CockpitHostContext } from "../../lib/cockpit-host-context";
import type { PlanningCockpitBundle } from "../../lib/planning-cockpit-data-source";
import type { PlanningHostPolicy } from "../../lib/planning-host-policy";
import { resolvePlanningHostPolicy } from "../../lib/planning-host-policy";
import { createPlanningPackDataSource } from "../../lib/planning-pack-cockpit";
import { computePackKpis } from "../../lib/planning-pack-kpis";
import {
  defaultWorkspaceState,
  loadWorkspaceState,
  readFilesAsPack,
  readPreviewUploadAsPack,
  saveWorkspaceState,
  type PlanningPack,
  type WorkspaceProject,
  type WorkspaceStateV1,
} from "../../lib/workspace-storage";
import { PlanningFileInspector } from "./planning-file-inspector";
import { PlanningPackOverview } from "./planning-pack-overview";
import { PlanningWorkspaceSidebar } from "./planning-workspace-sidebar";

export type PlanningCockpitDashboardProps = {
  livePane: React.ReactNode;
  hostContext?: CockpitHostContext;
  builtinPacks?: PlanningPack[];
  preferBuiltinPackId?: string;
  hostPolicy?: Partial<PlanningHostPolicy>;
  /**
   * Ephemeral embed: do not read/write `localStorage` workspace — state resets on reload.
   * Use for static site demos where persistence would confuse visitors.
   */
  demoMode?: boolean;
  /**
   * Hide the live repository / API pane (static hosting has no planning GET routes).
   * Pack mode, built-ins, and optional file uploads still work in-session.
   */
  packOnly?: boolean;
};

export function PlanningCockpitDashboard({
  livePane,
  hostContext,
  builtinPacks = [],
  preferBuiltinPackId,
  hostPolicy,
  demoMode = false,
  packOnly = false,
}: PlanningCockpitDashboardProps) {
  const [state, setState] = useState<WorkspaceStateV1>(defaultWorkspaceState);
  const [previewPack, setPreviewPack] = useState<PlanningPack | null>(null);
  const [previewSelected, setPreviewSelected] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<"cockpit" | "inspector" | "overview">("cockpit");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [modeOverride, setModeOverride] = useState<"live" | "pack" | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [packBundle, setPackBundle] = useState<PlanningCockpitBundle | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const appliedPreferBuiltin = useRef(false);
  const policy = useMemo(() => resolvePlanningHostPolicy(hostPolicy), [hostPolicy]);

  useEffect(() => {
    if (demoMode) {
      setState(defaultWorkspaceState());
    } else {
      setState(loadWorkspaceState());
    }
    setHydrated(true);
  }, [demoMode]);

  const persist = useCallback(
    (next: WorkspaceStateV1) => {
      setState(next);
      if (demoMode) {
        setSaveError(null);
        return;
      }
      const result = saveWorkspaceState(next);
      if (!result.ok) setSaveError(result.error);
      else setSaveError(null);
    },
    [demoMode],
  );

  useEffect(() => {
    if (!hydrated || !preferBuiltinPackId || appliedPreferBuiltin.current) return;
    if (!builtinPacks.some((pack) => pack.id === preferBuiltinPackId)) return;
    appliedPreferBuiltin.current = true;
    const pack = builtinPacks.find((entry) => entry.id === preferBuiltinPackId);
    const firstPath = pack?.files?.[0]?.path ?? null;
    setModeOverride("pack");
    setPreviewSelected(false);
    setState((prev) => {
      const next = {
        ...prev,
        activeProjectId: prev.projects.find((project) => project.kind === "live")?.id ?? "live",
        surfaceBuiltinPackId: preferBuiltinPackId,
      };
      const result = saveWorkspaceState(next);
      if (!result.ok) setSaveError(result.error);
      else setSaveError(null);
      return next;
    });
    setSelectedFilePath(firstPath);
    setWorkspaceTab("inspector");
  }, [builtinPacks, hydrated, preferBuiltinPackId]);

  const liveProject = useMemo((): Extract<WorkspaceProject, { kind: "live" }> => {
    const live = state.projects.find(
      (project): project is Extract<WorkspaceProject, { kind: "live" }> => project.kind === "live",
    );
    return live ?? { id: "live", kind: "live", label: "This repository" };
  }, [state.projects]);

  const surfaceBuiltinId = state.surfaceBuiltinPackId ?? null;
  const userActive = state.projects.find((project) => project.id === state.activeProjectId);
  const userPackProjects = useMemo(
    () =>
      state.projects.filter(
        (project): project is Extract<WorkspaceProject, { kind: "pack" }> => project.kind === "pack",
      ),
    [state.projects],
  );

  const activePack = useMemo((): PlanningPack | undefined => {
    if (previewSelected && previewPack) return previewPack;
    if (surfaceBuiltinId) return builtinPacks.find((pack) => pack.id === surfaceBuiltinId);
    if (userActive?.kind === "pack") return state.packs[userActive.packId];
    return undefined;
  }, [builtinPacks, previewPack, previewSelected, state.packs, surfaceBuiltinId, userActive]);

  const derivedMode =
    hydrated && state.activeProjectId === liveProject.id && !surfaceBuiltinId && !previewSelected ? "live" : "pack";
  /** Static embeds have no server-side planning APIs — keep UI in pack mode. */
  const activeMode = packOnly ? "pack" : (modeOverride ?? derivedMode);
  const showLivePane = !packOnly && hydrated && activeMode === "live";
  const packReadOnly = Boolean(surfaceBuiltinId) || previewSelected || activeMode === "live";

  const kpis = useMemo(() => {
    if (!activePack?.files?.length) return null;
    return computePackKpis(activePack.files);
  }, [activePack]);

  const packDataSource = useMemo(() => {
    if (!activePack) return null;
    return createPlanningPackDataSource(activePack, {
      badgeLabel: previewSelected ? "Preview pack" : surfaceBuiltinId ? "Built-in pack" : "Local pack",
    });
  }, [activePack, previewSelected, surfaceBuiltinId]);

  const selectedFile = useMemo(() => {
    if (!activePack?.files || !selectedFilePath) return null;
    return activePack.files.find((file) => file.path === selectedFilePath) ?? null;
  }, [activePack, selectedFilePath]);

  useEffect(() => {
    let cancelled = false;
    if (!packDataSource || activeMode !== "pack") {
      setPackBundle(null);
      return () => {
        cancelled = true;
      };
    }
    packDataSource
      .getBundle()
      .then((bundle) => {
        if (!cancelled) setPackBundle(bundle);
      })
      .catch(() => {
        if (!cancelled) setPackBundle(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeMode, packDataSource]);

  const handleSelectFile = useCallback((path: string) => {
    setSelectedFilePath(path);
    setWorkspaceTab("inspector");
  }, []);

  const selectLive = useCallback(() => {
    if (packOnly) return;
    setSelectedFilePath(null);
    setModeOverride("live");
    setPreviewSelected(false);
    persist({ ...state, activeProjectId: liveProject.id, surfaceBuiltinPackId: null });
  }, [liveProject.id, packOnly, persist, state]);

  const selectBuiltin = useCallback((packId: string) => {
    const pack = builtinPacks.find((entry) => entry.id === packId);
    setSelectedFilePath(pack?.files?.[0]?.path ?? null);
    setModeOverride("pack");
    setPreviewSelected(false);
    persist({ ...state, activeProjectId: liveProject.id, surfaceBuiltinPackId: packId });
  }, [builtinPacks, liveProject.id, persist, state]);

  const selectUserPackProject = useCallback((projectId: string) => {
    const project = userPackProjects.find((entry) => entry.id === projectId);
    const pack = project ? state.packs[project.packId] : null;
    setSelectedFilePath(pack?.files?.[0]?.path ?? null);
    setModeOverride("pack");
    setPreviewSelected(false);
    persist({ ...state, activeProjectId: projectId, surfaceBuiltinPackId: null });
  }, [persist, state, userPackProjects]);

  const selectPreviewPack = useCallback(() => {
    if (!previewPack) return;
    setSelectedFilePath(previewPack.files[0]?.path ?? null);
    setModeOverride("pack");
    setPreviewSelected(true);
  }, [previewPack]);

  const addPackFromFiles = useCallback(
    async (files: FileList | null) => {
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
        setSelectedFilePath(pack.files[0]?.path ?? null);
        setWorkspaceTab("cockpit");
        setModeOverride("pack");
        setPreviewSelected(false);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : String(error));
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [persist, state],
  );

  const addPreviewPackFromUpload = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setSaveError(null);
    try {
      const pack = await readPreviewUploadAsPack(files);
      setPreviewPack(pack);
      setPreviewSelected(true);
      setSelectedFilePath(pack.files[0]?.path ?? null);
      setWorkspaceTab("cockpit");
      setModeOverride("pack");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    }
    if (previewInputRef.current) previewInputRef.current.value = "";
  }, []);

  const handleSaveFiles = useCallback(
    (updates: Array<{ path: string; content: string }>) => {
      if (packReadOnly || showLivePane) return;
      const activeProject = userActive;
      if (!activeProject || activeProject.kind !== "pack") return;
      const pack = state.packs[activeProject.packId];
      if (!pack) return;
      if (updates.length === 0) return;
      const updateMap = new Map(updates.map((entry) => [entry.path, entry.content]));
      const seen = new Set<string>();
      const nextFiles = pack.files.map((file) => {
        const updatedContent = updateMap.get(file.path);
        if (updatedContent == null) return file;
        seen.add(file.path);
        return { ...file, content: updatedContent };
      });
      for (const entry of updates) {
        if (seen.has(entry.path)) continue;
        nextFiles.push({ path: entry.path, content: entry.content });
      }
      persist({
        ...state,
        packs: {
          ...state.packs,
          [activeProject.packId]: { ...pack, files: nextFiles },
        },
      });
    },
    [packReadOnly, persist, showLivePane, state, userActive],
  );

  const switchToPackMode = useCallback(() => {
    setModeOverride("pack");
    if (previewPack) {
      selectPreviewPack();
      return;
    }
    if (surfaceBuiltinId || userActive?.kind === "pack") return;
    const preferredBuiltin =
      preferBuiltinPackId && builtinPacks.some((pack) => pack.id === preferBuiltinPackId)
        ? preferBuiltinPackId
        : builtinPacks[0]?.id;
    if (preferredBuiltin) {
      selectBuiltin(preferredBuiltin);
      return;
    }
    if (userPackProjects[0]) {
      selectUserPackProject(userPackProjects[0].id);
    }
  }, [
    builtinPacks,
    preferBuiltinPackId,
    previewPack,
    selectBuiltin,
    selectPreviewPack,
    selectUserPackProject,
    surfaceBuiltinId,
    userActive?.kind,
    userPackProjects,
  ]);

  const exportWorkspace = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `repo-planner-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }, [state]);

  const exportActivePack = useCallback(() => {
    if (!activePack || showLivePane) return;
    const blob = new Blob([JSON.stringify(activePack, null, 2)], { type: "application/json" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    const safe = activePack.name.replace(/[^\w\-]+/g, "-").slice(0, 48) || "pack";
    anchor.download = `planning-pack-${safe}.json`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }, [activePack, showLivePane]);

  const contextStrip =
    hostContext &&
    (hostContext.quickLinks?.length || hostContext.surfaceLabel || hostContext.readingTargetId) ? (
      <div className="mb-4 rounded-xl border border-border/80 bg-muted/30 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Context
          </span>
          <span className="text-sm text-foreground">
            {hostContext.surfaceLabel ?? hostContext.readingTargetId}
          </span>
          {hostContext.quickLinks?.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    ) : null;

  const workspaceBody = !hydrated ? (
    <div className="flex min-h-[28rem] items-center justify-center rounded-xl border border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
      Loading workspace...
    </div>
  ) : (
    <div className="grid min-h-[min(70vh,44rem)] gap-0 overflow-hidden rounded-xl border border-border/80 bg-background/40 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <PlanningWorkspaceSidebar
        activeMode={activeMode}
        liveLabel={liveProject.label}
        showLiveSelected={showLivePane}
        onSelectLive={selectLive}
        previewPack={previewPack}
        showPreviewSelected={previewSelected}
        onSelectPreview={selectPreviewPack}
        builtinPacks={builtinPacks}
        surfaceBuiltinId={surfaceBuiltinId}
        onSelectBuiltin={selectBuiltin}
        userPackProjects={userPackProjects}
        packs={state.packs}
        activeProjectId={state.activeProjectId}
        onSelectUserPackProject={selectUserPackProject}
        selectedFilePath={selectedFilePath}
        onSelectFile={handleSelectFile}
        saveError={saveError}
      />

      <div className="relative flex min-h-0 min-w-0 flex-col border-border/80 bg-background/50 lg:border-l">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".md,.mdx,.xml,.toml,.txt,text/markdown,text/plain,application/xml"
          className="hidden"
          onChange={(event) => void addPackFromFiles(event.target.files)}
        />
        <input
          ref={previewInputRef}
          type="file"
          accept=".zip,.json,application/zip,application/json"
          className="hidden"
          onChange={(event) => void addPreviewPackFromUpload(event.target.files)}
        />
        <div className="border-b border-border/80 bg-muted/30 px-3 py-3 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              {packOnly ? (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Pack demo</span> — built-in snapshot and browser-local
                  uploads only. No live repository API on this host.
                </p>
              ) : (
                <>
                  <div className="inline-flex rounded-lg border border-border/70 bg-background/70 p-1">
                    <button
                      type="button"
                      onClick={selectLive}
                      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        activeMode === "live" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <HardDrive className="size-3.5" />
                      Live
                    </button>
                    <button
                      type="button"
                      onClick={switchToPackMode}
                      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        activeMode === "pack" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Layers className="size-3.5" />
                      Pack
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeMode === "live"
                      ? "Live reads the configured planning roots through the server bundle and stays read-only in this embed."
                      : "Pack mode uses built-in, preview, or local uploaded files in this browser. No live repository labels or server writes are implied here."}
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-border/70 bg-background/70 p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FolderUp className="size-4" />
                  Import
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => previewInputRef.current?.click()}
                >
                  <Layers className="size-4" />
                  Preview upload
                </Button>
              </div>
              {!packOnly ? (
                <div className="inline-flex rounded-lg border border-border/70 bg-background/70 p-1">
                  <a
                    href="/api/planning-templates/minimal"
                    className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-foreground transition hover:bg-muted/60"
                  >
                    <Download className="size-4" />
                    Init template
                  </a>
                </div>
              ) : null}
              <div className="inline-flex rounded-lg border border-border/70 bg-background/70 p-1">
                <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={exportWorkspace}>
                  <Download className="size-4" />
                  Export workspace
                </Button>
                {activeMode === "pack" && activePack ? (
                  <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={exportActivePack}>
                    <Download className="size-4" />
                    Export pack
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div
          className="relative flex min-h-0 flex-1 flex-col"
          onDragEnter={(event) => {
            if (event.dataTransfer?.types?.includes("Files")) setIsDraggingFiles(true);
          }}
          onDragOver={(event) => {
            if (!event.dataTransfer?.types?.includes("Files")) return;
            event.preventDefault();
            setIsDraggingFiles(true);
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
            setIsDraggingFiles(false);
          }}
          onDrop={(event) => {
            if (!event.dataTransfer?.files?.length) return;
            event.preventDefault();
            setIsDraggingFiles(false);
            void addPackFromFiles(event.dataTransfer.files);
          }}
        >
          {isDraggingFiles ? (
            <div className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/50 bg-background/80 text-center text-sm text-foreground">
              Drop planning files to create a local pack
            </div>
          ) : null}

          {showLivePane ? (
            <div className="min-h-[24rem] flex-1 overflow-hidden p-3 sm:p-4">{livePane}</div>
          ) : activePack && packDataSource ? (
            <div className="flex min-h-0 flex-1 flex-col gap-0 p-3 sm:p-4">
              <div className="mb-3">
                <h2 className="text-base font-semibold tracking-tight text-foreground">{activePack.name}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {activePack.files?.length ?? 0} file(s)
                  {previewSelected
                    ? " · preview upload (read-only, ephemeral)"
                    : surfaceBuiltinId
                      ? " · built-in pack (read-only)"
                      : " · local pack in this browser"}
                </p>
              </div>
              <Tabs
                value={workspaceTab}
                onValueChange={(value) => setWorkspaceTab(value as "cockpit" | "inspector" | "overview")}
                className="flex min-h-0 flex-1 flex-col gap-3"
              >
                <TabsList className="h-9 w-fit shrink-0 bg-muted/60">
                  <TabsTrigger value="cockpit" className="gap-1.5 text-xs sm:text-sm">
                    <Layers className="size-3.5" />
                    Cockpit
                  </TabsTrigger>
                  <TabsTrigger value="inspector" className="gap-1.5 text-xs sm:text-sm">
                    <LayoutDashboard className="size-3.5" />
                    Inspector
                  </TabsTrigger>
                  <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
                    <LineChart className="size-3.5" />
                    KPIs &amp; stats
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="cockpit" className="mt-0 min-h-0 flex-1 overflow-hidden">
                  <PlanningCockpit dataSource={packDataSource} />
                </TabsContent>
                <TabsContent value="inspector" className="mt-0 min-h-0 flex-1 overflow-hidden">
                  <PlanningFileInspector
                    file={selectedFile}
                    packReadOnly={packReadOnly}
                    hostPolicy={policy}
                    packFiles={activePack?.files ?? []}
                    onSave={(path, nextContent) => handleSaveFiles([{ path, content: nextContent }])}
                    onSaveMany={handleSaveFiles}
                  />
                </TabsContent>
                <TabsContent value="overview" className="mt-0 min-h-0 flex-1 overflow-auto">
                  <PlanningPackOverview kpis={kpis} workflow={packBundle?.workflow ?? null} hostPolicy={policy} />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div className="max-w-md space-y-2">
                <p className="text-sm font-medium text-foreground">No pack selected</p>
                <p className="text-sm text-muted-foreground">
                  Choose a built-in pack, preview a zip or pack export, upload planning files, or drag them into this workspace to inspect a local planning bundle.
                </p>
                <div className="pt-2">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => previewInputRef.current?.click()}>
                      <Layers className="mr-2 size-4" />
                      Preview pack or zip
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <FolderUp className="mr-2 size-4" />
                      Import planning files
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col">
      {contextStrip}
      {workspaceBody}
    </div>
  );
}
