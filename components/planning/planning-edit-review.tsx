"use client";

import { useMemo, useState } from "react";
import { diffLines } from "diff";
import { ChevronDown, ChevronRight, FileCode, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type PlanningEdit = {
  path: string;
  oldContent: string;
  newContent: string;
  summary?: string;
};

type PlanningEditReviewProps = {
  edits: PlanningEdit[];
  onApply: (edits: PlanningEdit[]) => void;
  onReject: () => void;
  applying?: boolean;
};

function lineStats(oldContent: string, newContent: string): { add: number; remove: number } {
  const changes = diffLines(oldContent, newContent);
  let add = 0;
  let remove = 0;
  for (const c of changes) {
    if (c.added) add += (c.value.match(/\n/g)?.length ?? 0) + (c.value.endsWith("\n") ? 0 : 1);
    if (c.removed) remove += (c.value.match(/\n/g)?.length ?? 0) + (c.value.endsWith("\n") ? 0 : 1);
  }
  return { add, remove };
}

const LINE_HEIGHT = 20;

/** Split diff (VSCode/GitHub): left = read-only old, right = editable new, with line numbers. */
function SplitDiffPane({
  oldContent,
  newContent,
  onNewContentChange,
  className,
}: {
  oldContent: string;
  newContent: string;
  onNewContentChange: (value: string) => void;
  className?: string;
}) {
  const oldLines = useMemo(() => oldContent.split("\n"), [oldContent]);
  const newLines = useMemo(() => newContent.split("\n"), [newContent]);
  const changes = useMemo(() => diffLines(oldContent, newContent), [oldContent, newContent]);
  const changeMap = useMemo(() => {
    const m = new Map<number, "add" | "remove" | "context">();
    let newIdx = 0;
    let oldIdx = 0;
    for (const c of changes) {
      const lineCount = (c.value.match(/\n/g)?.length ?? 0) + (c.value.endsWith("\n") ? 0 : 1);
      if (c.added) {
        for (let i = 0; i < lineCount; i++) m.set(newIdx + i, "add");
        newIdx += lineCount;
      } else if (c.removed) {
        for (let i = 0; i < lineCount; i++) m.set(oldIdx + i + 10000, "remove");
        oldIdx += lineCount;
      } else {
        for (let i = 0; i < lineCount; i++) {
          m.set(oldIdx + i + 10000, "context");
          m.set(newIdx + i, "context");
        }
        oldIdx += lineCount;
        newIdx += lineCount;
      }
    }
    return m;
  }, [changes]);

  return (
    <div className={cn("flex min-h-0 flex-1 overflow-hidden rounded-md border border-border/50 bg-background/90", className)}>
      <ScrollArea className="flex-1 min-w-0">
        <div className="flex font-mono text-xs">
          <div className="flex shrink-0 flex-col border-r border-border/50 bg-muted/30">
            {oldLines.map((_, i) => (
              <div
                key={`old-${i}`}
                className={cn(
                  "flex h-5 items-center justify-end pr-2 w-10 shrink-0",
                  changeMap.get(i + 10000) === "remove" ? "planning-diff-remove" : "text-muted-foreground",
                )}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <pre className="min-w-0 flex-1 overflow-x-auto py-0.5">
            {oldLines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "h-5 px-2 leading-5 whitespace-pre",
                  changeMap.get(i + 10000) === "remove" ? "planning-diff-remove" : "text-muted-foreground",
                )}
              >
                {line || " "}
              </div>
            ))}
          </pre>
        </div>
      </ScrollArea>
      <div className="w-px shrink-0 bg-border/50" />
      <ScrollArea className="flex-1 min-w-0">
        <div className="flex font-mono text-xs">
          <div className="flex shrink-0 flex-col border-r border-border/50 bg-muted/30">
            {newLines.map((_, i) => (
              <div
                key={`new-${i}`}
                className={cn(
                  "flex h-5 items-center justify-end pr-2 w-10 shrink-0",
                  changeMap.get(i) === "add" ? "planning-diff-add" : "text-muted-foreground",
                )}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1" style={{ minHeight: `${Math.max(newLines.length * LINE_HEIGHT, 200)}px` }}>
            <textarea
              value={newContent}
              onChange={(e) => onNewContentChange(e.target.value)}
              className="h-full min-h-full w-full resize-none bg-transparent px-2 py-0.5 font-mono text-xs leading-5 text-foreground outline-none focus:ring-0"
              spellCheck={false}
              style={{ minHeight: `${Math.max(newLines.length * LINE_HEIGHT, 200)}px`, lineHeight: `${LINE_HEIGHT}px` }}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export function PlanningEditReview({ edits, onApply, onReject, applying }: PlanningEditReviewProps) {
  const [viewMode, setViewMode] = useState<"summary" | "code">("summary");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editedContents, setEditedContents] = useState<Record<number, string>>({});

  const effectiveEdits = useMemo(
    () =>
      edits.map((e, i) => ({
        ...e,
        newContent: editedContents[i] ?? e.newContent,
      })),
    [edits, editedContents],
  );
  const setEditContent = (index: number, value: string) => {
    setEditedContents((prev) => ({ ...prev, [index]: value }));
  };

  const selectedEdit = edits[selectedIndex];
  const selectedEffective = effectiveEdits[selectedIndex];
  const hasMultiple = edits.length > 1;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-border/60 bg-muted/10">
      <div className="flex flex-none items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "summary" | "code")}>
          <TabsList className="h-8">
            <TabsTrigger value="summary" className="gap-1.5 text-xs">
              <FileText className="size-3.5" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="code" className="gap-1.5 text-xs">
              <FileCode className="size-3.5" />
              Code (split diff)
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onReject} disabled={applying}>
            Reject
          </Button>
          <Button size="sm" onClick={() => onApply(effectiveEdits)} disabled={applying}>
            {applying ? "Applying…" : "Apply all"}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {hasMultiple && (
          <div className="flex w-48 shrink-0 flex-col border-r border-border/50 bg-background/50">
            <div className="px-2 py-1.5 text-[10px] font-medium uppercase text-muted-foreground">
              Files changed
            </div>
            <ScrollArea className="flex-1">
              {edits.map((e, i) => {
                const stats = lineStats(e.oldContent, e.newContent);
                return (
                  <button
                    key={e.path}
                    type="button"
                    onClick={() => setSelectedIndex(i)}
                    className={cn(
                      "flex w-full items-center gap-2 truncate px-2 py-1.5 text-left text-xs",
                      selectedIndex === i ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    <span className="truncate font-mono">{e.path.split("/").pop() ?? e.path}</span>
                    <span className="ml-auto shrink-0 text-[10px] planning-diff-add">+{stats.add}</span>
                    <span className="shrink-0 text-[10px] planning-diff-remove">-{stats.remove}</span>
                  </button>
                );
              })}
            </ScrollArea>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
          {viewMode === "summary" && selectedEdit && (
            <div className="space-y-2">
              <div className="font-mono text-xs text-muted-foreground">{selectedEdit.path}</div>
              {selectedEdit.summary && <p className="text-sm text-foreground">{selectedEdit.summary}</p>}
              <p className="text-xs text-muted-foreground">
                {lineStats(selectedEdit.oldContent, selectedEdit.newContent).add} line(s) added,{" "}
                {lineStats(selectedEdit.oldContent, selectedEdit.newContent).remove} line(s) removed. Switch to Code for split diff and editing.
              </p>
              {hasMultiple && (
                <p className="text-[10px] text-muted-foreground">
                  {edits.length} file(s) — use the file list to switch.
                </p>
              )}
            </div>
          )}

          {viewMode === "code" && selectedEdit && selectedEffective && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-1.5 font-mono text-[10px] text-muted-foreground">{selectedEdit.path}</div>
              <SplitDiffPane
                oldContent={selectedEdit.oldContent}
                newContent={editedContents[selectedIndex] ?? selectedEdit.newContent}
                onNewContentChange={(v) => setEditContent(selectedIndex, v)}
                className="min-h-[280px]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
