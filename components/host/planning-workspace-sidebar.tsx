"use client";

import { ChevronRight, Eye, FileIcon, FolderIcon, FolderOpen, HardDrive } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { ScrollArea } from "../ui/scroll-area";
import { buildPackFileTree, type PackTreeNode } from "../../lib/pack-file-tree";
import { cn } from "../../lib/utils";
import type { PlanningPack, WorkspaceProject } from "../../lib/workspace-storage";

function PackFileTreeNodes({
  nodes,
  depth,
  selectedFilePath,
  onSelectFile,
}: {
  nodes: PackTreeNode[];
  depth: number;
  selectedFilePath: string | null;
  onSelectFile: (path: string) => void;
}) {
  return (
    <>
      {nodes.map((node, index) => {
        if (node.kind === "dir") {
          return (
            <PackDir
              key={`${node.prefix}-${index}`}
              node={node}
              depth={depth}
              selectedFilePath={selectedFilePath}
              onSelectFile={onSelectFile}
            />
          );
        }
        const selected = selectedFilePath === node.path;
        return (
          <button
            key={node.path}
            type="button"
            style={{ paddingLeft: 8 + depth * 12 }}
            onClick={() => onSelectFile(node.path)}
            className={cn(
              "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[13px] transition-colors",
              selected
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <span className="inline-flex w-3.5 shrink-0 justify-center" aria-hidden />
            <FileIcon className="size-3.5 shrink-0 opacity-70" />
            <span className="truncate font-mono">{node.name}</span>
          </button>
        );
      })}
    </>
  );
}

function PackDir({
  node,
  depth,
  selectedFilePath,
  onSelectFile,
}: {
  node: Extract<PackTreeNode, { kind: "dir" }>;
  depth: number;
  selectedFilePath: string | null;
  onSelectFile: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasSelectedInside = useMemo(() => {
    function walk(nodes: PackTreeNode[]): boolean {
      for (const entry of nodes) {
        if (entry.kind === "file" && entry.path === selectedFilePath) return true;
        if (entry.kind === "dir" && walk(entry.children)) return true;
      }
      return false;
    }
    return walk(node.children);
  }, [node.children, selectedFilePath]);

  useEffect(() => {
    if (hasSelectedInside) setOpen(true);
  }, [hasSelectedInside]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        type="button"
        style={{ paddingLeft: 8 + depth * 12 }}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")} />
        {open ? (
          <FolderOpen className="size-3.5 shrink-0 text-accent" />
        ) : (
          <FolderIcon className="size-3.5 shrink-0 text-accent" />
        )}
        <span className="truncate">{node.name}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-1 border-l border-border/50 pl-1">
          <PackFileTreeNodes
            nodes={node.children}
            depth={depth + 1}
            selectedFilePath={selectedFilePath}
            onSelectFile={onSelectFile}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export type PlanningWorkspaceSidebarProps = {
  activeMode: "live" | "pack";
  liveLabel: string;
  showLiveSelected: boolean;
  onSelectLive: () => void;
  previewPack: PlanningPack | null;
  showPreviewSelected: boolean;
  onSelectPreview: () => void;
  builtinPacks: PlanningPack[];
  surfaceBuiltinId: string | null;
  onSelectBuiltin: (packId: string) => void;
  userPackProjects: Extract<WorkspaceProject, { kind: "pack" }>[];
  packs: Record<string, PlanningPack>;
  activeProjectId: string;
  onSelectUserPackProject: (projectId: string) => void;
  selectedFilePath: string | null;
  onSelectFile: (path: string) => void;
  saveError: string | null;
};

export function PlanningWorkspaceSidebar({
  activeMode,
  liveLabel,
  showLiveSelected,
  onSelectLive,
  previewPack,
  showPreviewSelected,
  onSelectPreview,
  builtinPacks,
  surfaceBuiltinId,
  onSelectBuiltin,
  userPackProjects,
  packs,
  activeProjectId,
  onSelectUserPackProject,
  selectedFilePath,
  onSelectFile,
  saveError,
}: PlanningWorkspaceSidebarProps) {
  const row = useCallback(
    (selected: boolean) =>
      cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        selected
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      ),
    [],
  );

  return (
    <div className="flex h-full min-h-0 flex-col border-border/80 bg-muted/20 lg:border-r">
      <div className="border-b border-border/80 px-3 py-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Planning
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {activeMode === "live"
            ? "Live mode reads the mounted repository through the server bundle."
            : "Pack mode stays local to this browser. Built-in packs are read-only, preview uploads disappear on refresh, and saved uploads persist in localStorage."}
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 p-2">
          <div className="px-2 pb-1 pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Live
          </div>
          <button type="button" onClick={onSelectLive} className={row(showLiveSelected)}>
            <HardDrive className="size-4 shrink-0 opacity-70" />
            <span className="truncate">{liveLabel}</span>
          </button>

          {previewPack ? (
            <>
              <div className="px-2 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Preview upload
              </div>
              <div className="space-y-0.5">
                <button type="button" onClick={onSelectPreview} className={row(showPreviewSelected)}>
                  <Eye className="size-4 shrink-0 opacity-70" />
                  <span className="truncate">{previewPack.name}</span>
                </button>
                {showPreviewSelected && previewPack.files?.length ? (
                  <div className="rounded-md border border-border/60 bg-background/40 py-1">
                    <PackFileTreeNodes
                      nodes={buildPackFileTree(previewPack.files)}
                      depth={0}
                      selectedFilePath={selectedFilePath}
                      onSelectFile={onSelectFile}
                    />
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {builtinPacks.length > 0 ? (
            <div className="px-2 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Built-in packs
            </div>
          ) : null}
          {builtinPacks.map((pack) => {
            const selected = surfaceBuiltinId === pack.id;
            return (
              <div key={pack.id} className="space-y-0.5">
                <button type="button" onClick={() => onSelectBuiltin(pack.id)} className={row(selected)}>
                  <FolderIcon className="size-4 shrink-0 opacity-70" />
                  <span className="truncate">{pack.name}</span>
                </button>
                {selected && pack.files?.length ? (
                  <div className="rounded-md border border-border/60 bg-background/40 py-1">
                    <PackFileTreeNodes
                      nodes={buildPackFileTree(pack.files)}
                      depth={0}
                      selectedFilePath={selectedFilePath}
                      onSelectFile={onSelectFile}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}

          {userPackProjects.length > 0 ? (
            <div className="px-2 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Local packs
            </div>
          ) : null}
          {userPackProjects.map((project) => {
            const pack = packs[project.packId];
            const selected = !surfaceBuiltinId && project.id === activeProjectId;
            return (
              <div key={project.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => onSelectUserPackProject(project.id)}
                  className={row(selected)}
                >
                  <FolderIcon className="size-4 shrink-0 opacity-70" />
                  <span className="truncate">{project.label}</span>
                </button>
                {selected && pack?.files?.length ? (
                  <div className="rounded-md border border-border/60 bg-background/40 py-1">
                    <PackFileTreeNodes
                      nodes={buildPackFileTree(pack.files)}
                      depth={0}
                      selectedFilePath={selectedFilePath}
                      onSelectFile={onSelectFile}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="space-y-2 border-t border-border/80 p-3">
        {saveError ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {saveError}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Use the toolbar to import files, export the workspace, or download the minimal init template.
          </p>
        )}
      </div>
    </div>
  );
}
