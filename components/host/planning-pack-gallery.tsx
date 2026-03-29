"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, Download, Expand, X } from "lucide-react";
import type { PlanningPackItem, PlanningPackManifest } from "../../lib/planning-pack-types";
import { stripPlanningPackPreviewPreamble } from "../../lib/planning-pack-types";

export type PlanningPackGalleryProps = {
  manifest: PlanningPackManifest | null;
  loadError: string | null;
  tab: "demo" | "site";
  onTab: (t: "demo" | "site") => void;
  expanded: PlanningPackItem | null;
  docHtml: string;
  docLoading: boolean;
  onCloseExpand: () => void;
  onExpand: (item: PlanningPackItem) => void;
  /** Convert markdown to HTML (host usually passes `marked.parse` with gfm). */
  renderMarkdown: (md: string) => string;
  /** Optional override; default strips export preamble + frontmatter. */
  stripForPreview?: (raw: string) => string;
  demoTabLabel?: string;
  siteTabLabel?: string;
};

const PREVIEW_CHAR_CAP = 4500;

export function PlanningPackGallery({
  manifest,
  loadError,
  tab,
  onTab,
  expanded,
  docHtml,
  docLoading,
  onCloseExpand,
  onExpand,
  renderMarkdown,
  stripForPreview = stripPlanningPackPreviewPreamble,
  demoTabLabel = "Starter template",
  siteTabLabel = "This site",
}: PlanningPackGalleryProps) {
  const items = useMemo(() => {
    if (!manifest) return [];
    return tab === "demo" ? manifest.demo : manifest.site;
  }, [manifest, tab]);

  const grouped = useMemo(() => {
    const m = new Map<string, PlanningPackItem[]>();
    for (const it of items) {
      const k = it.sectionLabel;
      m.set(k, [...(m.get(k) || []), it]);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const siteSections = tab === "site";

  return (
    <>
      <div className="flex gap-2 border-b border-border/60 px-5 py-2">
        <TabBtn active={tab === "demo"} onClick={() => onTab("demo")}>
          {demoTabLabel}
        </TabBtn>
        <TabBtn active={tab === "site"} onClick={() => onTab("site")}>
          {siteTabLabel}
        </TabBtn>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {loadError ? (
          <p className="text-sm text-red-400">{loadError}</p>
        ) : !manifest ? (
          <p className="text-sm text-text-muted">Loading manifest…</p>
        ) : siteSections ? (
          <div className="space-y-3">
            {grouped.map(([label, group]) => (
              <PlanningSectionCollapsible
                key={label}
                label={label}
                slugHint={group[0]?.section}
                count={group.length}
                items={group}
                onExpand={onExpand}
                renderMarkdown={renderMarkdown}
                stripForPreview={stripForPreview}
              />
            ))}
          </div>
        ) : (
          grouped.map(([label, group]) => (
            <section key={label} className="mb-10 last:mb-0">
              <h3 className="mb-4 font-display text-lg text-primary">{label}</h3>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((item) => (
                  <PlanCard
                    key={item.id}
                    item={item}
                    onExpand={() => void onExpand(item)}
                    renderMarkdown={renderMarkdown}
                    stripForPreview={stripForPreview}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {expanded ? (
        <div className="fixed inset-0 z-[210] flex">
          <button
            type="button"
            className="min-h-0 min-w-0 flex-1 bg-black/55 backdrop-blur-[2px]"
            aria-label="Close preview"
            onClick={onCloseExpand}
          />
          <div className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-border bg-dark shadow-2xl sm:max-w-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-primary">{expanded.title}</p>
                <p className="truncate text-xs text-text-muted">{expanded.filename}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <a
                  href={expanded.file}
                  download={expanded.filename}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-primary hover:border-accent"
                >
                  <Download size={14} />
                  Download
                </a>
                <button
                  type="button"
                  onClick={onCloseExpand}
                  className="rounded-full border border-border p-2 text-text-muted hover:text-primary"
                  aria-label="Back to gallery"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {docLoading ? (
                <p className="text-sm text-text-muted">Loading…</p>
              ) : (
                <article
                  className="prose prose-invert prose-sm max-w-none prose-headings:text-primary prose-a:text-accent prose-code:text-text"
                  dangerouslySetInnerHTML={{ __html: docHtml }}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PlanningSectionCollapsible({
  label,
  slugHint,
  count,
  items,
  onExpand,
  renderMarkdown,
  stripForPreview,
}: {
  label: string;
  slugHint?: string;
  count: number;
  items: PlanningPackItem[];
  onExpand: (item: PlanningPackItem) => void;
  renderMarkdown: (md: string) => string;
  stripForPreview: (raw: string) => string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-dark/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]"
        aria-expanded={open}
      >
        <ChevronDown
          size={20}
          className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-primary">{label}</p>
          {slugHint ? (
            <p className="truncate text-xs text-text-muted">
              Section <code className="text-accent/90">{slugHint}</code> · {count} file{count === 1 ? "" : "s"}
            </p>
          ) : (
            <p className="text-xs text-text-muted">
              {count} file{count === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </button>
      {open ? (
        <div className="border-t border-border/50 px-4 pb-5 pt-2">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <PlanCard
                key={item.id}
                item={item}
                onExpand={() => void onExpand(item)}
                renderMarkdown={renderMarkdown}
                stripForPreview={stripForPreview}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active ? "bg-primary text-secondary" : "text-text-muted hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function PlanCard({
  item,
  onExpand,
  renderMarkdown,
  stripForPreview,
}: {
  item: PlanningPackItem;
  onExpand: () => void;
  renderMarkdown: (md: string) => string;
  stripForPreview: (raw: string) => string;
}) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(item.file)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        const body = stripForPreview(text);
        const slice = body.slice(0, PREVIEW_CHAR_CAP);
        const html = renderMarkdown(slice);
        setPreviewHtml(html);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [item.file, renderMarkdown, stripForPreview]);

  return (
    <div className="group relative flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border/80 bg-gradient-to-br from-[#161618] via-dark-alt to-zinc-950 shadow-inner">
        <div className="absolute left-0 top-0 h-full w-1 bg-red-700/90" aria-hidden />

        <div className="absolute inset-0 bottom-[4.5rem] overflow-hidden">
          {loading ? (
            <div className="flex h-full flex-col gap-2 p-3 pt-4">
              <div className="h-2 w-3/4 animate-pulse rounded bg-white/10" />
              <div className="h-2 w-full animate-pulse rounded bg-white/10" />
              <div className="h-2 w-5/6 animate-pulse rounded bg-white/10" />
              <div className="mt-4 h-2 w-full animate-pulse rounded bg-white/10" />
              <div className="h-2 w-11/12 animate-pulse rounded bg-white/10" />
            </div>
          ) : failed || !previewHtml ? (
            <div className="flex h-full items-center justify-center p-4 text-center text-xs text-text-muted">
              Preview unavailable
            </div>
          ) : (
            <>
              <div
                className="pointer-events-none absolute left-0 top-0 origin-top-left text-[13px] leading-snug"
                style={{
                  width: "min(420px, 135%)",
                  transform: "scale(0.38)",
                  transformOrigin: "top left",
                }}
              >
                <div
                  className="prose prose-invert max-w-none px-3 pt-3 prose-headings:my-1 prose-headings:text-[0.95rem] prose-headings:font-semibold prose-headings:text-primary prose-p:my-1 prose-p:text-text/90 prose-li:my-0 prose-li:text-text/90 prose-table:text-[11px] prose-th:px-1 prose-td:px-1 prose-code:text-[10px] prose-pre:text-[10px] prose-a:text-accent/90 prose-a:no-underline"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#121214] via-[#121214]/85 to-transparent"
                aria-hidden
              />
            </>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-[#121214]/95 px-3 py-2.5 backdrop-blur-sm">
          <p className="line-clamp-2 font-medium leading-snug text-primary">{item.title}</p>
          <p className="mt-0.5 truncate text-xs text-text-muted">{item.filename}</p>
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-4 bg-black/0 opacity-0 transition group-hover:pointer-events-auto group-hover:bg-black/55 group-hover:opacity-100">
          <a
            href={item.file}
            download={item.filename}
            className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-dark/90 text-primary shadow-lg backdrop-blur hover:border-accent hover:bg-dark"
            title="Download"
            aria-label={`Download ${item.filename}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={22} />
          </a>
          <button
            type="button"
            onClick={onExpand}
            className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-dark/90 text-primary shadow-lg backdrop-blur hover:border-accent hover:bg-dark"
            title="Read"
            aria-label={`Read ${item.title}`}
          >
            <Expand size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
