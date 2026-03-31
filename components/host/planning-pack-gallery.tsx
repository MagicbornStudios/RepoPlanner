"use client";

import React, {
  type CSSProperties,
  useEffect,
  useMemo,
  useState,
} from "react";
import JSZip from "jszip";
import {
  ChevronDown,
  Download,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react";
import type {
  PlanningPackGalleryTab,
  PlanningPackItem,
  PlanningPackManifest,
} from "../../lib/planning-pack-types";
import { cn } from "../../lib/utils";
import { Button, buttonVariants } from "../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

export type PlanningPackGalleryProps = {
  tabs?: PlanningPackGalleryTab[];
  manifest?: PlanningPackManifest | null;
  loading?: boolean;
  loadError: string | null;
  tab: string;
  onTab: (tabId: string) => void;
  /** Legacy no-op preview props kept for host compatibility. */
  expanded?: PlanningPackItem | null;
  docHtml?: string;
  docLoading?: boolean;
  onCloseExpand?: () => void;
  onExpand?: (item: PlanningPackItem) => void;
  renderMarkdown?: (md: string) => string;
  stripForPreview?: (raw: string) => string;
  /** Legacy fallback labels when tabs are inferred from `manifest`. */
  demoTabLabel?: string;
  siteTabLabel?: string;
};

type TreeFileNode = {
  kind: "file";
  key: string;
  name: string;
  item: PlanningPackItem;
};

type TreeDirNode = {
  kind: "dir";
  key: string;
  name: string;
  children: TreeNode[];
  items: PlanningPackItem[];
};

type TreeNode = TreeDirNode | TreeFileNode;

type FileTone = {
  iconBackground: string;
  iconBorder: string;
  iconText: string;
  extensionText: string;
};

type ContextMenuAction = {
  id: string;
  label: string;
  onSelect: () => void;
};

type ContextMenuState = {
  x: number;
  y: number;
  title: string;
  actions: ContextMenuAction[];
};

const TAB_RAIL_STYLE: CSSProperties = {
  backgroundColor: "var(--rp-tab-rail)",
  boxShadow: "inset 0 0 0 1px var(--rp-soft-border)",
};

const TREE_STYLE: CSSProperties = {
  backgroundColor: "var(--rp-tree-bg)",
  boxShadow: "inset 0 0 0 1px var(--rp-tree-border)",
};

const HOVER_ACTION_STYLE: CSSProperties = {
  backgroundColor: "var(--rp-action-bg)",
  boxShadow: "inset 0 0 0 1px var(--rp-soft-border)",
};

const CONTEXT_MENU_STYLE: CSSProperties = {
  backgroundColor: "var(--rp-context-bg)",
  boxShadow: "0 12px 32px rgba(0,0,0,0.34), inset 0 0 0 1px var(--rp-context-border)",
};

const SIZE_CHIP_STYLE: CSSProperties = {
  backgroundColor: "var(--rp-size-chip-bg)",
  boxShadow: "inset 0 0 0 1px var(--rp-size-chip-border)",
};

export function PlanningPackGallery({
  tabs,
  manifest,
  loading = false,
  loadError,
  tab,
  onTab,
  demoTabLabel = "Starter template",
  siteTabLabel = "This site",
}: PlanningPackGalleryProps) {
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const resolvedTabs = useMemo(() => {
    if (tabs?.length) return tabs;
    if (!manifest) return [];

    return [
      {
        id: "demo",
        label: demoTabLabel,
        items: manifest.demo,
        mode: "sections",
      },
      {
        id: "site",
        label: siteTabLabel,
        items: manifest.site,
        mode: "collapsible-sections",
      },
    ] satisfies PlanningPackGalleryTab[];
  }, [demoTabLabel, manifest, siteTabLabel, tabs]);

  const activeTab = useMemo(
    () => resolvedTabs.find((entry) => entry.id === tab) ?? resolvedTabs[0] ?? null,
    [resolvedTabs, tab],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, PlanningPackItem[]>();
    for (const item of activeTab?.items ?? []) {
      const groupKey = item.sectionLabel;
      groups.set(groupKey, [...(groups.get(groupKey) ?? []), item]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [activeTab]);

  useEffect(() => {
    if (!contextMenu) return;

    const close = () => setContextMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("pointerdown", close, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("pointerdown", close, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  async function downloadItemsAsZip(items: PlanningPackItem[], label: string, key: string) {
    if (items.length === 0) return;

    setDownloadingKey(key);
    try {
      const zip = new JSZip();
      const usedPaths = new Map<string, number>();

      for (const item of items) {
        const response = await fetch(item.file);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${item.filename}`);
        }

        const archivePath = dedupeArchivePath(resolveArchivePath(item), usedPaths);
        zip.file(archivePath, await response.blob());
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      triggerBlobDownload(zipBlob, `${slugify(label)}.zip`);
    } finally {
      setDownloadingKey(null);
    }
  }

  function openContextMenu(
    event: React.MouseEvent,
    title: string,
    actions: ContextMenuAction[],
  ) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      title,
      actions,
    });
  }

  const usesCollapsibleSections = activeTab?.mode === "collapsible-sections";

  return (
    <Tabs
      value={tab}
      onValueChange={onTab}
      className="repo-planner flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="border-b border-border/30 px-4 py-3">
        <TabsList
          className="inline-flex flex-wrap items-center gap-1 rounded-2xl p-1"
          style={TAB_RAIL_STYLE}
        >
          {resolvedTabs.map((entry) => (
            <TabsTrigger
              key={entry.id}
              value={entry.id}
              className="h-8 rounded-xl px-3 text-sm font-medium data-[state=active]:shadow-none"
            >
              {entry.icon ? (
                <span className="mr-1.5 inline-flex shrink-0 items-center text-sm leading-none">
                  {entry.icon}
                </span>
              ) : null}
              <span className="truncate">{entry.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="repo-planner-scroll flex-1 overflow-y-auto px-4 py-3">
        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading example packs...</p>
        ) : !activeTab ? (
          <p className="text-sm text-muted-foreground">No planning packs available.</p>
        ) : (
          <div className="space-y-3">
            {activeTab.description ? (
              <p className="text-xs leading-relaxed text-muted-foreground">{activeTab.description}</p>
            ) : null}
            {grouped.length === 0 ? (
              <p className="text-sm text-muted-foreground">{activeTab.emptyMessage ?? "No planning packs available."}</p>
            ) : usesCollapsibleSections ? (
              grouped.map(([label, group]) => (
                <PackSectionTree
                  key={label}
                  label={label}
                  slugHint={group[0]?.section}
                  items={group}
                  downloading={downloadingKey === label}
                  defaultOpen={false}
                  onDownloadItems={(itemsToDownload, downloadLabel) =>
                    void downloadItemsAsZip(itemsToDownload, downloadLabel, downloadLabel)
                  }
                  onOpenContextMenu={openContextMenu}
                />
              ))
            ) : (
              grouped.map(([label, group]) => (
                <PackSectionTree
                  key={label}
                  label={label}
                  items={group}
                  downloading={downloadingKey === label}
                  defaultOpen
                  onDownloadItems={(itemsToDownload, downloadLabel) =>
                    void downloadItemsAsZip(itemsToDownload, downloadLabel, downloadLabel)
                  }
                  onOpenContextMenu={openContextMenu}
                />
              ))
            )}
          </div>
        )}
      </div>

      {contextMenu ? (
        <div
          className="fixed z-[220] min-w-[11rem] max-w-[16rem] overflow-hidden rounded-xl"
          style={{
            ...CONTEXT_MENU_STYLE,
            left: Math.min(contextMenu.x, window.innerWidth - 220),
            top: Math.min(contextMenu.y, window.innerHeight - 180),
          }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="border-b border-border/60 px-3 py-2 text-[11px] font-medium text-muted-foreground">
            {contextMenu.title}
          </div>
          <div className="p-1.5">
            {contextMenu.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition hover:bg-muted/55"
                onClick={() => {
                  action.onSelect();
                  setContextMenu(null);
                }}
              >
                <Download size={14} className="shrink-0 text-muted-foreground" />
                <span className="truncate">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </Tabs>
  );
}

function PackSectionTree({
  label,
  slugHint,
  items,
  downloading,
  defaultOpen,
  onDownloadItems,
  onOpenContextMenu,
}: {
  label: string;
  slugHint?: string;
  items: PlanningPackItem[];
  downloading: boolean;
  defaultOpen: boolean;
  onDownloadItems: (itemsToDownload: PlanningPackItem[], label: string) => void;
  onOpenContextMenu: (
    event: React.MouseEvent,
    title: string,
    actions: ContextMenuAction[],
  ) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const tree = useMemo(() => buildSectionTree(items, slugHint), [items, slugHint]);

  return (
    <section className="space-y-2.5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="group flex items-center gap-2">
          <CollapsibleTrigger
            type="button"
            className="rp-tree-row flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-0.5 text-left transition"
            style={{ backgroundColor: "transparent" }}
            onContextMenu={(event) =>
              onOpenContextMenu(event, label, [
                {
                  id: "download-folder",
                  label: "Download folder as ZIP",
                  onSelect: () => onDownloadItems(items, label),
                },
              ])
            }
          >
            <ChevronDown
              size={14}
              className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
            />
            {open ? (
              <FolderOpen size={15} className="shrink-0 text-accent" />
            ) : (
              <Folder size={15} className="shrink-0 text-accent" />
            )}
            <span className="min-w-0 truncate text-sm font-semibold text-foreground">{label}</span>
            <span className="truncate text-[11px] text-muted-foreground">{formatSectionMeta(items, slugHint)}</span>
          </CollapsibleTrigger>
          <button
            type="button"
            aria-label={`Download ${label}`}
            className="opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
            onClick={() => onDownloadItems(items, label)}
          >
            <span
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-xs" }),
                "rounded-md text-muted-foreground hover:text-foreground",
              )}
              style={HOVER_ACTION_STYLE}
            >
              <Download size={13} />
            </span>
          </button>
        </div>
        <CollapsibleContent>
          <div className="overflow-hidden rounded-xl" style={TREE_STYLE}>
            <div className="p-1.5">
              <TreeNodes
                nodes={tree}
                depth={0}
                onDownloadItems={onDownloadItems}
                onOpenContextMenu={onOpenContextMenu}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

function TreeNodes({
  nodes,
  depth,
  onDownloadItems,
  onOpenContextMenu,
}: {
  nodes: TreeNode[];
  depth: number;
  onDownloadItems: (itemsToDownload: PlanningPackItem[], label: string) => void;
  onOpenContextMenu: (
    event: React.MouseEvent,
    title: string,
    actions: ContextMenuAction[],
  ) => void;
}) {
  return (
    <>
      {nodes.map((node) =>
        node.kind === "dir" ? (
          <TreeDir
            key={node.key}
            node={node}
            depth={depth}
            onDownloadItems={onDownloadItems}
            onOpenContextMenu={onOpenContextMenu}
          />
        ) : (
          <TreeFile
            key={node.key}
            node={node}
            depth={depth}
            onOpenContextMenu={onOpenContextMenu}
          />
        ),
      )}
    </>
  );
}

function TreeDir({
  node,
  depth,
  onDownloadItems,
  onOpenContextMenu,
}: {
  node: TreeDirNode;
  depth: number;
  onDownloadItems: (itemsToDownload: PlanningPackItem[], label: string) => void;
  onOpenContextMenu: (
    event: React.MouseEvent,
    title: string,
    actions: ContextMenuAction[],
  ) => void;
}) {
  const [open, setOpen] = useState(depth < 1);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="group">
        <div
          className="flex items-center gap-2 rounded-md"
          style={{ paddingLeft: 6 + depth * 14 }}
        >
          <CollapsibleTrigger
            type="button"
            className="rp-tree-row flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left transition"
            onContextMenu={(event) =>
              onOpenContextMenu(event, node.name, [
                {
                  id: "download-folder",
                  label: "Download folder as ZIP",
                  onSelect: () => onDownloadItems(node.items, node.name),
                },
              ])
            }
          >
            <ChevronDown
              size={13}
              className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
            />
            {open ? (
              <FolderOpen size={14} className="shrink-0 text-accent" />
            ) : (
              <Folder size={14} className="shrink-0 text-accent" />
            )}
            <span className="truncate text-[13px] text-foreground">{node.name}</span>
          </CollapsibleTrigger>
          <HoverDownloadButton
            label={`Download ${node.name}`}
            onClick={() => onDownloadItems(node.items, node.name)}
          />
        </div>
        <CollapsibleContent>
          <div className="ml-4 pl-1" style={{ borderLeft: "1px solid var(--rp-tree-divider)" }}>
            <TreeNodes
              nodes={node.children}
              depth={depth + 1}
              onDownloadItems={onDownloadItems}
              onOpenContextMenu={onOpenContextMenu}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function TreeFile({
  node,
  depth,
  onOpenContextMenu,
}: {
  node: TreeFileNode;
  depth: number;
  onOpenContextMenu: (
    event: React.MouseEvent,
    title: string,
    actions: ContextMenuAction[],
  ) => void;
}) {
  const { stem, ext } = splitFilename(node.name);
  const tone = getFileTone(node.item);

  return (
    <div
      className="group flex items-center gap-2 rounded-md"
      style={{ paddingLeft: 6 + depth * 14 }}
    >
      <a
        href={node.item.file}
        download={node.item.filename}
        className="rp-tree-row flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 transition"
        title={`Download ${node.item.filename}`}
        onContextMenu={(event) =>
          onOpenContextMenu(event, node.name, [
            {
              id: "download-file",
              label: "Download file",
              onSelect: () => triggerFileDownload(node.item),
            },
          ])
        }
      >
        <span
          className="inline-flex shrink-0 items-center justify-center rounded-md p-1"
          style={{
            backgroundColor: tone.iconBackground,
            color: tone.iconText,
            boxShadow: `inset 0 0 0 1px ${tone.iconBorder}`,
          }}
        >
          <FileText size={12} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] leading-tight text-foreground">
          <span>{stem}</span>
          {ext ? <span style={{ color: tone.extensionText }}>{ext}</span> : null}
        </span>
      </a>

      {node.item.sizeBytes ? (
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-foreground"
          style={SIZE_CHIP_STYLE}
        >
          {formatBytes(node.item.sizeBytes)}
        </span>
      ) : null}

      <HoverDownloadButton label={`Download ${node.item.filename}`} href={node.item.file} download={node.item.filename} />
    </div>
  );
}

function HoverDownloadButton({
  label,
  onClick,
  href,
  download,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  download?: string;
}) {
  const className = cn(
    buttonVariants({ variant: "ghost", size: "icon-xs" }),
    "rounded-md text-muted-foreground opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:text-foreground",
  );

  if (href) {
    return (
      <a
        href={href}
        download={download}
        aria-label={label}
        title={label}
        className={className}
        style={HOVER_ACTION_STYLE}
      >
        <Download size={13} />
      </a>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={className}
      style={HOVER_ACTION_STYLE}
      onClick={onClick}
    >
      <Download size={13} />
    </button>
  );
}

function buildSectionTree(items: PlanningPackItem[], slugHint?: string): TreeNode[] {
  type DirBuilder = {
    key: string;
    name: string;
    dirs: Map<string, DirBuilder>;
    files: TreeFileNode[];
  };

  const root: DirBuilder = {
    key: "root",
    name: "",
    dirs: new Map(),
    files: [],
  };

  for (const item of items) {
    const relativePath = toRelativeTreePath(item, slugHint);
    const segments = relativePath.split("/").filter(Boolean);
    const fallbackName = item.filename;
    const fileName = segments.pop() ?? fallbackName;
    let current = root;
    let currentKey = "";

    for (const segment of segments) {
      currentKey = currentKey ? `${currentKey}/${segment}` : segment;
      let nextDir = current.dirs.get(segment);
      if (!nextDir) {
        nextDir = {
          key: currentKey,
          name: segment,
          dirs: new Map(),
          files: [],
        };
        current.dirs.set(segment, nextDir);
      }
      current = nextDir;
    }

    current.files.push({
      kind: "file",
      key: `${current.key}/${fileName}:${item.id}`,
      name: fileName,
      item,
    });
  }

  function finalize(builder: DirBuilder): TreeNode[] {
    const dirs = [...builder.dirs.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((dir) => {
        const children = finalize(dir);
        return {
          kind: "dir" as const,
          key: dir.key,
          name: dir.name,
          children,
          items: flattenNodeItems(children),
        };
      });

    const files = [...builder.files].sort((a, b) => a.name.localeCompare(b.name));
    return [...dirs, ...files];
  }

  return finalize(root);
}

function flattenNodeItems(nodes: TreeNode[]): PlanningPackItem[] {
  return nodes.flatMap((node) => (node.kind === "file" ? [node.item] : node.items));
}

function toRelativeTreePath(item: PlanningPackItem, slugHint?: string) {
  const archivePath = resolveArchivePath(item);
  const segments = archivePath.split("/").filter(Boolean);

  if (slugHint && segments[0]?.toLowerCase() === slugHint.toLowerCase()) {
    segments.shift();
  }

  return segments.join("/") || item.filename;
}

function resolveArchivePath(item: PlanningPackItem) {
  if (item.archivePath && item.archivePath.trim()) return item.archivePath;
  if (item.slug && item.slug.trim()) return item.slug;
  return item.filename;
}

function splitFilename(filename: string) {
  const match = /^(.+?)(\.[^.]+)?$/.exec(filename.trim());
  return {
    stem: match?.[1] ?? filename,
    ext: match?.[2] ?? "",
  };
}

function dedupeArchivePath(candidate: string, usedPaths: Map<string, number>) {
  const normalized = candidate.replace(/^\/+/, "");
  const currentCount = usedPaths.get(normalized) ?? 0;
  usedPaths.set(normalized, currentCount + 1);

  if (currentCount === 0) {
    return normalized;
  }

  const lastDotIndex = normalized.lastIndexOf(".");
  if (lastDotIndex <= 0) {
    return `${normalized}-${currentCount + 1}`;
  }

  const stem = normalized.slice(0, lastDotIndex);
  const ext = normalized.slice(lastDotIndex);
  return `${stem}-${currentCount + 1}${ext}`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(downloadUrl);
}

function triggerFileDownload(item: PlanningPackItem) {
  const anchor = document.createElement("a");
  anchor.href = item.file;
  anchor.download = item.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function getFileTone(item: PlanningPackItem): FileTone {
  const extension = item.filename.split(".").pop()?.toLowerCase() ?? "";
  const accent = resolveAccent(extension);

  return {
    iconBackground: `color-mix(in oklch, ${accent} 10%, var(--card))`,
    iconBorder: `color-mix(in oklch, ${accent} 26%, transparent)`,
    iconText: `color-mix(in oklch, ${accent} 72%, white 28%)`,
    extensionText: `color-mix(in oklch, ${accent} 80%, white 20%)`,
  };
}

function resolveAccent(extension: string) {
  switch (extension) {
    case "xml":
      return "var(--rp-file-xml)";
    case "mdx":
      return "var(--rp-file-mdx)";
    case "md":
      return "var(--rp-file-md)";
    case "toml":
      return "var(--rp-file-toml)";
    case "json":
      return "var(--rp-file-json)";
    case "txt":
      return "var(--rp-file-txt)";
    default:
      return "var(--rp-file-default)";
  }
}

function formatSectionMeta(items: PlanningPackItem[], slugHint?: string) {
  const totalBytes = items.reduce((sum, item) => sum + (item.sizeBytes ?? 0), 0);
  const parts = [
    slugHint ? `section ${slugHint}` : null,
    `${items.length} file${items.length === 1 ? "" : "s"}`,
    totalBytes > 0 ? formatBytes(totalBytes) : null,
  ].filter(Boolean);
  return parts.join(" | ");
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  const kilobytes = value / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(kilobytes >= 100 ? 0 : 1)} KB`;
  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
}
