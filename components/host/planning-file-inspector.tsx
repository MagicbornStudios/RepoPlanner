"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  GitBranch,
  LoaderCircle,
  Lock,
  Route,
  ShieldCheck,
  Target,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { XMLBuilder } from "fast-xml-parser";
import { ensureArray, planningXmlParser } from "repo-planner/lib/planning-parse-core.mjs";
import type { PlanningHostPolicy } from "../../lib/planning-host-policy";
import { resolvePlanningHostPolicy } from "../../lib/planning-host-policy";
import type { PackFile } from "../../lib/workspace-storage";
import {
  classifyPlanningFile,
  parseRoadmapFromMarkdown,
  parseRoadmapXml,
  parseStateXml,
  parseTaskRegistryFromMarkdown,
  parseTaskRegistryXml,
  serializeRoadmapFromModel,
  serializeStateFromModel,
  serializeTaskRegistryFromModel,
  type ParsedRoadmapPhase,
  type ParsedState,
  type ParsedTaskRow,
} from "../../lib/planning-xml-parse";

type InspectorKind =
  | "task-registry-xml"
  | "task-registry-md"
  | "state-xml"
  | "state-md"
  | "roadmap-xml"
  | "roadmap-md"
  | "requirements-md"
  | "decisions-xml"
  | "decisions-md"
  | "phase-plan-xml"
  | "kickoff-md"
  | "markdown"
  | "generic-xml"
  | "other";

type KeyValueRow = { key: string; value: string };
type RequirementRow = { id: string; requirement: string; why: string };
type RoadmapTableRow = { phase: string; status: string; focus: string; next: string };
type StateTable = {
  registry: KeyValueRow[];
  currentCycle: KeyValueRow[];
  nextQueue: Array<{ priority: string; action: string }>;
  references: Array<{ id: string; path: string }>;
};
type DecisionRow = { id: string; title: string; fields: KeyValueRow[] };
type XmlDecisionRow = { id: string; title: string; summary: string; impact: string };
type KickoffTable = { title: string; fields: KeyValueRow[] };
type PhasePlanQuestion = {
  id: string;
  text: string;
  status: "open" | "answered";
  decisionRef?: string;
};
type PhasePlanTable = {
  phaseId: string;
  phaseName: string;
  purpose: string;
  scope: string;
  questions: PhasePlanQuestion[];
};
type QuestionAnswerDraft = {
  existingDecisionId: string;
  newDecisionSummary: string;
};

const xmlBuilder = new XMLBuilder({
  attributeNamePrefix: "@_",
  ignoreAttributes: false,
  format: true,
  suppressBooleanAttributes: false,
});

function stripFrontmatter(content: string) {
  return content.replace(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/, "");
}

function splitLines(content: string) {
  return content.split("\n").map((line) => line.replace(/\r$/, ""));
}

function tableCells(line: string) {
  return line
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function findHeadingIndex(lines: string[], matcher: RegExp) {
  for (let index = 0; index < lines.length; index += 1) {
    if (matcher.test(lines[index] ?? "")) return index;
  }
  return -1;
}

function parseMarkdownTable(lines: string[], startIndex: number) {
  let start = startIndex;
  while (start < lines.length && !lines[start]?.trim()) start += 1;
  if (start + 1 >= lines.length) return null;
  if (!lines[start]?.trim().startsWith("|")) return null;
  if (!lines[start + 1]?.includes("---")) return null;
  let end = start + 2;
  while (end < lines.length && lines[end]?.trim().startsWith("|")) end += 1;
  return {
    start,
    end,
    headers: tableCells(lines[start]),
    rows: lines.slice(start + 2, end).map(tableCells).filter((row) => row.length > 0),
  };
}

function findTableAfterHeading(content: string, matcher: RegExp) {
  const lines = splitLines(content);
  const headingIndex = findHeadingIndex(lines, matcher);
  if (headingIndex === -1) return null;
  const table = parseMarkdownTable(lines, headingIndex + 1);
  if (!table) return null;
  return { ...table, lines };
}

function buildMarkdownTable(headers: string[], rows: string[][]) {
  const widths = headers.map((header, column) =>
    Math.max(header.length, 3, ...rows.map((row) => String(row[column] ?? "").length)),
  );
  const renderLine = (cells: string[]) =>
    `| ${cells.map((cell, index) => String(cell ?? "").padEnd(widths[index]!)).join(" | ")} |`;
  return [
    renderLine(headers),
    `| ${widths.map((width) => "-".repeat(width)).join(" | ")} |`,
    ...rows.map((row) => renderLine(row)),
  ];
}

function replaceTableAfterHeading(content: string, matcher: RegExp, headers: string[], rows: string[][]) {
  const found = findTableAfterHeading(content, matcher);
  if (!found) return null;
  return [
    ...found.lines.slice(0, found.start),
    ...buildMarkdownTable(headers, rows),
    ...found.lines.slice(found.end),
  ].join("\n");
}

function parseRequirementsMarkdown(content: string): RequirementRow[] {
  const found = findTableAfterHeading(stripFrontmatter(content), /^##\s+Core Requirements\s*$/i);
  if (!found) return [];
  return found.rows.map((row) => ({
    id: row[0] ?? "",
    requirement: row[1] ?? "",
    why: row[2] ?? "",
  }));
}

function parseStateMarkdown(content: string): StateTable | null {
  const body = stripFrontmatter(content);
  const asPairs = (matcher: RegExp) =>
    findTableAfterHeading(body, matcher)?.rows.map((row) => ({ key: row[0] ?? "", value: row[1] ?? "" })) ?? [];
  return {
    registry: asPairs(/^##\s+Registry\s*$/i),
    currentCycle: asPairs(/^##\s+Current cycle\s*$/i),
    nextQueue:
      findTableAfterHeading(body, /^##\s+Next queue\s*$/i)?.rows.map((row) => ({
        priority: row[0] ?? "",
        action: row[1] ?? "",
      })) ?? [],
    references:
      findTableAfterHeading(body, /^##\s+References\s*$/i)?.rows.map((row) => ({
        id: row[0] ?? "",
        path: row[1] ?? "",
      })) ?? [],
  };
}

function serializeStateMarkdown(content: string, value: StateTable) {
  let next = content;
  next =
    replaceTableAfterHeading(
      next,
      /^##\s+Registry\s*$/i,
      ["Field", "Value"],
      value.registry.map((row) => [row.key, row.value]),
    ) ?? next;
  next =
    replaceTableAfterHeading(
      next,
      /^##\s+Current cycle\s*$/i,
      ["Field", "Value"],
      value.currentCycle.map((row) => [row.key, row.value]),
    ) ?? next;
  next =
    replaceTableAfterHeading(
      next,
      /^##\s+Next queue\s*$/i,
      ["Priority", "Action"],
      value.nextQueue.map((row) => [row.priority, row.action]),
    ) ?? next;
  next =
    replaceTableAfterHeading(
      next,
      /^##\s+References\s*$/i,
      ["Id", "Path"],
      value.references.map((row) => [row.id, row.path]),
    ) ?? next;
  return next;
}

function parseRoadmapTableMarkdown(content: string): RoadmapTableRow[] {
  const found = findTableAfterHeading(stripFrontmatter(content), /^##\s+Phases\s*$/i);
  if (!found) return [];
  return found.rows.map((row) => ({
    phase: row[0] ?? "",
    status: row[1] ?? "",
    focus: row[2] ?? "",
    next: row[3] ?? "",
  }));
}

function serializeRoadmapMarkdown(content: string, rows: RoadmapTableRow[]) {
  return replaceTableAfterHeading(
    content,
    /^##\s+Phases\s*$/i,
    ["Phase", "Status", "Focus", "Next"],
    rows.map((row) => [row.phase, row.status, row.focus, row.next]),
  );
}

function parseDecisionsMarkdown(content: string): DecisionRow[] {
  const lines = splitLines(stripFrontmatter(content));
  const decisions: DecisionRow[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index]?.match(/^##\s+`([^`]+)`\s+--\s+(.+)\s*$/);
    if (!match) continue;
    const table = parseMarkdownTable(lines, index + 1);
    if (!table) continue;
    decisions.push({
      id: match[1] ?? "",
      title: match[2] ?? "",
      fields: table.rows.map((row) => ({ key: row[0] ?? "", value: row[1] ?? "" })),
    });
  }
  return decisions;
}

function parseKickoffMarkdown(content: string): KickoffTable | null {
  const lines = splitLines(stripFrontmatter(content));
  const headingIndex = findHeadingIndex(lines, /^##\s+Kickoff:\s+`?([^`]+)`?\s*$/i);
  if (headingIndex === -1) return null;
  const table = parseMarkdownTable(lines, headingIndex + 1);
  if (!table) return null;
  return {
    title: lines[headingIndex]!.replace(/^##\s+/, "").trim(),
    fields: table.rows.map((row) => ({ key: row[0] ?? "", value: row[1] ?? "" })),
  };
}

function serializeKickoffMarkdown(content: string, value: KickoffTable) {
  return replaceTableAfterHeading(
    content,
    /^##\s+Kickoff:\s+`?([^`]+)`?\s*$/i,
    ["Field", "Notes"],
    value.fields.map((field) => [field.key, field.value]),
  );
}

function normalizeXmlSource(content: string) {
  return content
    .replace(/^\uFEFF?/, "")
    .replace(/^<\*xml[^>]*\*>\s*/i, "")
    .replace(/^<\?xml[^>]*\?>\s*/i, "")
    .trim();
}

function parseXmlDocument(content: string) {
  try {
    return planningXmlParser.parse(normalizeXmlSource(content));
  } catch {
    return null;
  }
}

function buildXmlDocument(rootName: string, value: Record<string, unknown>) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBuilder.build({ [rootName]: value })}\n`;
}

function normalizePlanningId(value: string) {
  return /^\d+$/.test(value) ? value.padStart(2, "0") : value;
}

function phaseQuestionText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "#text" in value) {
    return String((value as Record<string, unknown>)["#text"] ?? "").trim();
  }
  return "";
}

function parseXmlDecisions(content: string): XmlDecisionRow[] {
  const parsed = parseXmlDocument(content);
  const root = parsed?.decisions && typeof parsed.decisions === "object" ? parsed.decisions : parsed;
  const records = root?.decision != null ? ensureArray(root.decision) : [];
  return records
    .map((record, index) => {
      const decision = record && typeof record === "object" ? (record as Record<string, unknown>) : null;
      return {
        id: String(decision?.["@_id"] ?? decision?.id ?? `decision-${index + 1}`),
        title: String(decision?.title ?? decision?.name ?? decision?.["@_id"] ?? `Decision ${index + 1}`),
        summary: String(decision?.summary ?? ""),
        impact: String(decision?.impact ?? ""),
      };
    })
    .filter((record) => record.id);
}

function serializeXmlDecisions(content: string, decisions: XmlDecisionRow[]) {
  const parsed = parseXmlDocument(content);
  const root =
    parsed?.decisions && typeof parsed.decisions === "object"
      ? { ...(parsed.decisions as Record<string, unknown>) }
      : {};
  root.decision = decisions.map((decision) => ({
    "@_id": decision.id,
    title: decision.title,
    summary: decision.summary,
    impact: decision.impact,
  }));
  return buildXmlDocument("decisions", root);
}

function parsePhasePlanXml(content: string): PhasePlanTable | null {
  const parsed = parseXmlDocument(content);
  const plan =
    parsed?.["phase-plan"] && typeof parsed["phase-plan"] === "object"
      ? (parsed["phase-plan"] as Record<string, unknown>)
      : parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
  if (!plan) return null;
  const meta = plan.meta && typeof plan.meta === "object" ? (plan.meta as Record<string, unknown>) : {};
  const rawQuestions = plan.questions && typeof plan.questions === "object" && (plan.questions as Record<string, unknown>).question != null
    ? ensureArray((plan.questions as Record<string, unknown>).question)
    : [];
  return {
    phaseId: normalizePlanningId(String(meta["phase-id"] ?? meta.phaseId ?? "")),
    phaseName: String(meta["phase-name"] ?? meta.phaseName ?? ""),
    purpose: String(plan.purpose ?? ""),
    scope: String(plan.scope ?? ""),
    questions: rawQuestions.map((rawQuestion, index) => {
      const record = rawQuestion && typeof rawQuestion === "object" ? (rawQuestion as Record<string, unknown>) : null;
      const text =
        phaseQuestionText(rawQuestion) ||
        (typeof rawQuestion === "string" ? rawQuestion.trim() : "") ||
        "(no text)";
      return {
        id: String(record?.["@_id"] ?? record?.id ?? `question-${index + 1}`),
        text,
        status:
          String(record?.["@_status"] ?? record?.status ?? "open").toLowerCase() === "answered"
            ? "answered"
            : "open",
        decisionRef: String(record?.["@_decision-ref"] ?? record?.["decision-ref"] ?? record?.decisionRef ?? "").trim() || undefined,
      };
    }),
  };
}

function serializePhasePlanXml(content: string, phasePlan: PhasePlanTable) {
  const parsed = parseXmlDocument(content);
  const root =
    parsed?.["phase-plan"] && typeof parsed["phase-plan"] === "object"
      ? { ...(parsed["phase-plan"] as Record<string, unknown>) }
      : {};
  const meta = root.meta && typeof root.meta === "object" ? { ...(root.meta as Record<string, unknown>) } : {};
  meta["phase-id"] = phasePlan.phaseId;
  meta["phase-name"] = phasePlan.phaseName;
  root.meta = meta;
  root.purpose = phasePlan.purpose;
  root.scope = phasePlan.scope;
  root.questions = {
    question: phasePlan.questions.map((question) => ({
      "@_id": question.id,
      "@_status": question.status,
      ...(question.decisionRef ? { "@_decision-ref": question.decisionRef } : {}),
      "#text": question.text,
    })),
  };
  return buildXmlDocument("phase-plan", root);
}

function createQuestionId(phasePlan: PhasePlanTable) {
  const max = phasePlan.questions.reduce((highest, question) => {
    const match = question.id.match(/(\d+)(?!.*\d)/);
    const numeric = match ? Number.parseInt(match[1] ?? "0", 10) : 0;
    return Number.isFinite(numeric) ? Math.max(highest, numeric) : highest;
  }, 0);
  return `${phasePlan.phaseId || "phase"}-question-${max + 1}`;
}

function createDecisionId(phaseId: string, questionText: string, existingIds: string[]) {
  const base = `${phaseId || "phase"}-${questionText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "decision"}`;
  let candidate = `${base}-decision`;
  let counter = 2;
  while (existingIds.includes(candidate)) {
    candidate = `${base}-decision-${counter}`;
    counter += 1;
  }
  return candidate;
}

function resolveXmlDecisionPath(currentPath: string, packFiles: PackFile[]) {
  const exact = packFiles.find((file) => /(^|\/)\.planning\/DECISIONS\.xml$/i.test(file.path));
  if (exact) return exact.path;
  if (/\/phases\//i.test(currentPath)) {
    const prefix = currentPath.split("/phases/")[0];
    return `${prefix}/DECISIONS.xml`.replace(/^\/+/, "");
  }
  return ".planning/DECISIONS.xml";
}

function isMigratableId(value: string) {
  return value.length >= 4 && /[a-z]/i.test(value);
}

function replaceIdReferences(content: string, sourceId: string, nextId: string) {
  const escaped = sourceId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content.replace(new RegExp(escaped, "g"), nextId);
}

function inspectorKind(path: string, content: string): InspectorKind {
  const normalizedPath = path.toLowerCase();
  if (/requirements\.mdx?$/i.test(normalizedPath)) return "requirements-md";
  if (/planning\/state\.mdx?$/i.test(normalizedPath) || /\/state\.mdx?$/i.test(normalizedPath)) return "state-md";
  if (/planning\/roadmap\.mdx?$/i.test(normalizedPath)) return "roadmap-md";
  if (/decisions\.xml$/i.test(normalizedPath)) return "decisions-xml";
  if (/planning\/decisions\.mdx?$/i.test(normalizedPath)) return "decisions-md";
  if (/-plan\.xml$/i.test(normalizedPath)) return "phase-plan-xml";
  if (/planning\/plans\/.+\/plan\.mdx?$/i.test(normalizedPath)) return "kickoff-md";
  const classification = classifyPlanningFile(path, content);
  if (classification === "task-registry-xml") return "task-registry-xml";
  if (classification === "task-registry-md") return "task-registry-md";
  if (classification === "state-xml") return "state-xml";
  if (classification === "roadmap-xml") return "roadmap-xml";
  if (classification === "roadmap-md") return "roadmap-md";
  if (classification === "generic-md") return "markdown";
  if (classification === "generic-xml") return "generic-xml";
  return "other";
}

function SaveStateBadge({
  packReadOnly,
  canEdit,
  dirty,
  saveState,
}: {
  packReadOnly: boolean;
  canEdit: boolean;
  dirty: boolean;
  saveState: "idle" | "saving" | "saved";
}) {
  if (packReadOnly) return <Badge variant="outline" className="text-xs">Read-only</Badge>;
  if (!canEdit) return <Badge variant="outline" className="text-xs">Structured preview</Badge>;
  if (saveState === "saving") {
    return <Badge variant="outline" className="gap-1 text-xs"><LoaderCircle className="size-3 animate-spin" />Saving...</Badge>;
  }
  if (saveState === "saved") {
    return <Badge variant="outline" className="gap-1 border-emerald-500/40 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3" />Saved locally</Badge>;
  }
  if (dirty) return <Badge variant="outline" className="text-xs">Changes pending</Badge>;
  return <Badge variant="outline" className="text-xs">Autosave ready</Badge>;
}

function LockedValue({
  label,
  value,
  policy,
  canMigrate = false,
  migrateDisabledReason,
  onMigrate,
}: {
  label: string;
  value: string;
  policy: PlanningHostPolicy;
  canMigrate?: boolean;
  migrateDisabledReason?: string;
  onMigrate?: (nextValue: string) => boolean | void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [nextValue, setNextValue] = useState(value);

  useEffect(() => {
    setNextValue(value);
  }, [value]);

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-md border border-border/80 bg-muted/20 px-3 py-2 font-mono text-sm text-foreground">
          <Lock className="size-3.5 text-muted-foreground" />
          <span>{value || "--"}</span>
        </div>
        {policy.immutableIds ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-border/70 bg-background/40 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {canMigrate
                ? "IDs stay immutable in the normal UI. Use the migration flow below to rewrite references in a writable local pack."
                : migrateDisabledReason || "IDs stay immutable in the normal UI. Use a migration flow in a writable host to rename references safely."}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canMigrate}
              onClick={() => setIsRenaming((value) => !value)}
            >
              Rename ID
            </Button>
          </div>
        ) : null}
        {policy.immutableIds && canMigrate && isRenaming ? (
          <div className="space-y-2 rounded-md border border-border/70 bg-background/40 p-3">
            <Input value={nextValue} onChange={(event) => setNextValue(event.target.value)} className="font-mono text-sm" />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const trimmed = nextValue.trim();
                  if (!trimmed || trimmed === value) return;
                  const result = onMigrate?.(trimmed);
                  if (result !== false) setIsRenaming(false);
                }}
              >
                Apply migration
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setNextValue(value); setIsRenaming(false); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PolicySummary({ policy }: { policy: PlanningHostPolicy }) {
  return (
    <Card className="border-border/80 bg-card/50 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-muted-foreground" />
          Host policy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {policy.testsRequiredForDone ? <Badge variant="outline">Tests required for done</Badge> : null}
          {policy.globalReadOrderFirst ? <Badge variant="outline">Global-first read order</Badge> : null}
          {policy.hideRawSourceInInspector ? <Badge variant="outline">Raw source hidden</Badge> : null}
          {policy.immutableIds ? <Badge variant="outline">IDs locked</Badge> : null}
          <Badge variant="outline">Sprint size {policy.sprintSize}</Badge>
          <Badge variant="outline">Kickoff over {policy.kickoffHoursThreshold}h</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          These steering rules come from the host policy layer so the package does not hard-code portfolio-only workflow assumptions.
        </p>
      </CardContent>
    </Card>
  );
}

function UnsupportedInspector({
  file,
  hideRawSource,
}: {
  file: PackFile;
  hideRawSource: boolean;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            {hideRawSource
              ? "Raw source is hidden in the normal cockpit surface."
              : "This file does not have a structured inspector yet."}
          </p>
          <p className="text-sm text-muted-foreground">
            {hideRawSource
              ? "This file does not have a structured inspector yet. The file tree remains the traceable source-of-truth path, but the main pane no longer defaults to rendering full raw markdown or XML."
              : "Use the file tree for traceability while the structured inspector contract catches up to this file type."}
          </p>
          <div className="rounded-md border border-border/70 bg-background/50 px-3 py-2 font-mono text-xs text-muted-foreground">
            {file.path}
          </div>
        </div>
      </div>
    </div>
  );
}

export type PlanningFileInspectorProps = {
  file: PackFile | null;
  packReadOnly: boolean;
  hostPolicy?: Partial<PlanningHostPolicy>;
  packFiles?: PackFile[];
  onSave: (path: string, nextContent: string) => void;
  onSaveMany?: (updates: Array<{ path: string; content: string }>) => void;
};

export function PlanningFileInspector({
  file,
  packReadOnly,
  hostPolicy,
  packFiles = [],
  onSave,
  onSaveMany,
}: PlanningFileInspectorProps) {
  const [tasks, setTasks] = useState<ParsedTaskRow[]>([]);
  const [stateXml, setStateXml] = useState<ParsedState | null>(null);
  const [stateMd, setStateMd] = useState<StateTable | null>(null);
  const [roadXml, setRoadXml] = useState<ParsedRoadmapPhase[]>([]);
  const [roadMd, setRoadMd] = useState<RoadmapTableRow[]>([]);
  const [requirements, setRequirements] = useState<RequirementRow[]>([]);
  const [xmlDecisions, setXmlDecisions] = useState<XmlDecisionRow[]>([]);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [phasePlan, setPhasePlan] = useState<PhasePlanTable | null>(null);
  const [kickoff, setKickoff] = useState<KickoffTable | null>(null);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, QuestionAnswerDraft>>({});
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const policy = useMemo(() => resolvePlanningHostPolicy(hostPolicy), [hostPolicy]);

  const kind = file ? inspectorKind(file.path, file.content) : "other";
  const original = file?.content ?? "";
  const title = useMemo(() => (file ? file.path.split("/").pop() ?? file.path : "No file selected"), [file]);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setDirty(false);
    setSaveState("idle");
    setTasks([]);
    setStateXml(null);
    setStateMd(null);
    setRoadXml([]);
    setRoadMd([]);
    setRequirements([]);
    setXmlDecisions([]);
    setDecisions([]);
    setPhasePlan(null);
    setKickoff(null);
    setNewQuestionText("");
    setQuestionDrafts({});

    if (!file) return;
    if (kind === "task-registry-xml") {
      const parsed = parseTaskRegistryXml(file.content);
      setTasks(parsed ? parsed.tasks.map((task) => ({ ...task, commands: [...task.commands] })) : []);
    } else if (kind === "task-registry-md") {
      const parsed = parseTaskRegistryFromMarkdown(file.content);
      setTasks(parsed ? parsed.tasks.map((task) => ({ ...task, commands: [...task.commands] })) : []);
    } else if (kind === "state-xml") {
      const parsed = parseStateXml(file.content);
      setStateXml(parsed ? { ...parsed, references: [...parsed.references] } : null);
    } else if (kind === "state-md") {
      setStateMd(parseStateMarkdown(file.content));
    } else if (kind === "roadmap-xml") {
      const parsed = parseRoadmapXml(file.content);
      setRoadXml(parsed ? parsed.phases.map((phase) => ({ ...phase })) : []);
    } else if (kind === "roadmap-md") {
      const tableRows = parseRoadmapTableMarkdown(file.content);
      if (tableRows.length > 0) setRoadMd(tableRows);
      else {
        const parsed = parseRoadmapFromMarkdown(file.content);
        setRoadXml(parsed ? parsed.phases.map((phase) => ({ ...phase })) : []);
      }
    } else if (kind === "requirements-md") {
      setRequirements(parseRequirementsMarkdown(file.content));
    } else if (kind === "decisions-xml") {
      setXmlDecisions(parseXmlDecisions(file.content));
    } else if (kind === "decisions-md") {
      setDecisions(parseDecisionsMarkdown(file.content));
    } else if (kind === "phase-plan-xml") {
      setPhasePlan(parsePhasePlanXml(file.content));
    } else if (kind === "kickoff-md") {
      setKickoff(parseKickoffMarkdown(file.content));
    }
  }, [file, kind]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const canEdit = Boolean(
    !packReadOnly &&
      file &&
      (
        kind === "task-registry-xml" ||
        kind === "state-xml" ||
        kind === "state-md" ||
        kind === "roadmap-xml" ||
        kind === "roadmap-md" ||
        kind === "phase-plan-xml" ||
        kind === "kickoff-md"
      ),
  );

  const serializedContent = useMemo(() => {
    if (!file || packReadOnly) return null;
    if (kind === "task-registry-xml") return serializeTaskRegistryFromModel(original, tasks);
    if (kind === "state-xml" && stateXml) return serializeStateFromModel(original, stateXml);
    if (kind === "state-md" && stateMd) return serializeStateMarkdown(original, stateMd);
    if (kind === "roadmap-xml") return serializeRoadmapFromModel(original, roadXml);
    if (kind === "roadmap-md" && roadMd.length > 0) return serializeRoadmapMarkdown(original, roadMd);
    if (kind === "phase-plan-xml" && phasePlan) return serializePhasePlanXml(original, phasePlan);
    if (kind === "kickoff-md" && kickoff) return serializeKickoffMarkdown(original, kickoff);
    return null;
  }, [file, kickoff, kind, original, packReadOnly, phasePlan, roadMd, roadXml, stateMd, stateXml, tasks]);

  const xmlDecisionPath = useMemo(() => {
    if (!file) return null;
    return resolveXmlDecisionPath(file.path, packFiles);
  }, [file, packFiles]);

  const knownXmlDecisions = useMemo(() => {
    if (!xmlDecisionPath) return [];
    const decisionFile = packFiles.find((entry) => entry.path === xmlDecisionPath);
    return decisionFile ? parseXmlDecisions(decisionFile.content) : [];
  }, [packFiles, xmlDecisionPath]);

  const commitMultiFileUpdate = React.useCallback(
    (updates: Array<{ path: string; content: string }>) => {
      if (!onSaveMany || updates.length === 0) return false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      setSaveState("saving");
      onSaveMany(updates);
      setDirty(false);
      setSaveState("saved");
      return true;
    },
    [onSaveMany],
  );

  const migratePackId = React.useCallback(
    (sourceId: string, nextId: string) => {
      if (!policy.allowPackIdMigration || packReadOnly || !onSaveMany) return false;
      const trimmed = nextId.trim();
      if (!trimmed || trimmed === sourceId || !isMigratableId(sourceId) || !isMigratableId(trimmed)) return false;
      const touched = packFiles
        .map((packFile) => {
          const content = replaceIdReferences(packFile.content, sourceId, trimmed);
          return content === packFile.content ? null : { path: packFile.path, content };
        })
        .filter((entry): entry is { path: string; content: string } => entry != null);
      if (touched.length === 0) return false;
      return commitMultiFileUpdate(touched);
    },
    [commitMultiFileUpdate, onSaveMany, packFiles, packReadOnly, policy.allowPackIdMigration],
  );

  useEffect(() => {
    if (!file || !canEdit || !dirty || !serializedContent) return;
    if (serializedContent === original) {
      setDirty(false);
      setSaveState("idle");
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState("saving");
    saveTimerRef.current = setTimeout(() => {
      onSave(file.path, serializedContent);
      setDirty(false);
      setSaveState("saved");
      saveTimerRef.current = null;
    }, 650);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [canEdit, dirty, file, onSave, original, serializedContent]);

  useEffect(() => {
    if (saveState !== "saved") return;
    const timeout = setTimeout(() => setSaveState("idle"), 1200);
    return () => clearTimeout(timeout);
  }, [saveState]);

  const updateQuestionDraft = React.useCallback((questionId: string, patch: Partial<QuestionAnswerDraft>) => {
    setQuestionDrafts((current) => ({
      ...current,
      [questionId]: {
        ...(current[questionId] ?? {}),
        existingDecisionId: current[questionId]?.existingDecisionId ?? "",
        newDecisionSummary: current[questionId]?.newDecisionSummary ?? "",
        ...patch,
      },
    }));
  }, []);

  const appendPhaseQuestion = React.useCallback(() => {
    if (!phasePlan || !newQuestionText.trim()) return;
    setPhasePlan({
      ...phasePlan,
      questions: [
        ...phasePlan.questions,
        {
          id: createQuestionId(phasePlan),
          text: newQuestionText.trim(),
          status: "open",
        },
      ],
    });
    setNewQuestionText("");
    setDirty(true);
  }, [newQuestionText, phasePlan]);

  const linkPhaseQuestionToDecision = React.useCallback(
    (questionId: string, decisionId: string) => {
      if (!phasePlan || !file || !xmlDecisionPath || !onSaveMany) return false;
      const normalizedDecisionId = decisionId.trim();
      if (!normalizedDecisionId || !knownXmlDecisions.some((decision) => decision.id === normalizedDecisionId)) return false;
      const nextPlan: PhasePlanTable = {
        ...phasePlan,
        questions: phasePlan.questions.map((question) =>
          question.id === questionId ? { ...question, status: "answered", decisionRef: normalizedDecisionId } : question,
        ),
      };
      const nextPlanContent = serializePhasePlanXml(file.content, nextPlan);
      const committed = commitMultiFileUpdate([{ path: file.path, content: nextPlanContent }]);
      if (!committed) return false;
      setPhasePlan(nextPlan);
      setQuestionDrafts((current) => {
        const next = { ...current };
        delete next[questionId];
        return next;
      });
      return true;
    },
    [commitMultiFileUpdate, file, knownXmlDecisions, onSaveMany, phasePlan, xmlDecisionPath],
  );

  const createDecisionFromQuestion = React.useCallback(
    (questionId: string) => {
      if (!phasePlan || !file || !xmlDecisionPath || !onSaveMany) return false;
      const draft = questionDrafts[questionId];
      const question = phasePlan.questions.find((entry) => entry.id === questionId);
      if (!draft || !question) return false;
      const summary = draft.newDecisionSummary.trim();
      if (!summary) return false;
      const decisionFile = packFiles.find((entry) => entry.path === xmlDecisionPath);
      const currentDecisions = decisionFile ? parseXmlDecisions(decisionFile.content) : [];
      const decisionId = createDecisionId(phasePlan.phaseId, question.text, currentDecisions.map((entry) => entry.id));
      const nextDecisions = [
        ...currentDecisions,
        {
          id: decisionId,
          title: question.text,
          summary,
          impact: `Answer recorded from phase question ${question.id}.`,
        },
      ];
      const nextPlan: PhasePlanTable = {
        ...phasePlan,
        questions: phasePlan.questions.map((entry) =>
          entry.id === questionId ? { ...entry, status: "answered", decisionRef: decisionId } : entry,
        ),
      };
      const updates = [
        { path: file.path, content: serializePhasePlanXml(file.content, nextPlan) },
        { path: xmlDecisionPath, content: serializeXmlDecisions(decisionFile?.content ?? "", nextDecisions) },
      ];
      const committed = commitMultiFileUpdate(updates);
      if (!committed) return false;
      setPhasePlan(nextPlan);
      setXmlDecisions(nextDecisions);
      setQuestionDrafts((current) => {
        const next = { ...current };
        delete next[questionId];
        return next;
      });
      return true;
    },
    [commitMultiFileUpdate, file, onSaveMany, packFiles, phasePlan, questionDrafts, xmlDecisionPath],
  );

  if (!file) {
    return (
      <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 p-8 text-center">
        <p className="text-sm font-medium text-foreground">Choose a file from the tree</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          The file tree remains the navigation spine, but the main pane now prefers structured planning surfaces instead of document-style raw text.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="truncate text-lg font-semibold text-foreground" title={file.path}>{title}</h2>
          <p className="font-mono text-xs text-muted-foreground">{file.path}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary" className="text-xs capitalize">{kind.replace(/-/g, " ")}</Badge>
            <SaveStateBadge packReadOnly={packReadOnly} canEdit={canEdit} dirty={dirty} saveState={saveState} />
          </div>
        </div>
      </div>

      <Separator />

      <ScrollArea className="min-h-0 flex-1 pr-3">
        <div className="space-y-4 pb-4">
          <PolicySummary policy={policy} />

          {(kind === "task-registry-xml" || kind === "task-registry-md") && tasks.length > 0 ? (
            <>
              <Card className="border-border/80 bg-card/50 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="size-4 text-muted-foreground" />
                    Task registry
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{tasks.length} task row(s)</span>
                  <span>{new Set(tasks.map((task) => task.phaseId)).size} phase bucket(s)</span>
                  <span>{kind === "task-registry-md" ? "Section markdown view" : "XML form view"}</span>
                </CardContent>
              </Card>

              {tasks.map((task, index) => (
                <Card key={`${task.id}-${index}`} className="border-border/80 bg-card/50 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      <Badge variant="outline" className="font-mono text-[10px]">{task.id}</Badge>
                      <Badge variant="outline" className="font-mono text-[10px]">phase {task.phaseId || "—"}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <LockedValue
                        label="Task id"
                        value={task.id}
                        policy={policy}
                        canMigrate={!packReadOnly && policy.allowPackIdMigration && isMigratableId(task.id)}
                        migrateDisabledReason="Task IDs can only be migrated in a writable local pack when the id is a stable string reference."
                        onMigrate={(nextValue) => migratePackId(task.id, nextValue)}
                      />
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Status</span>
                        {kind === "task-registry-md" ? (
                          <div className="flex items-center gap-2 rounded-md border border-border/80 bg-muted/20 px-3 py-2 text-sm text-foreground">
                            <Badge variant="outline" className="text-[10px]">{task.status || "planned"}</Badge>
                            <span className="text-muted-foreground">Markdown task registries stay preview-only until row-safe serialization lands.</span>
                          </div>
                        ) : (
                          <Input
                            disabled={!canEdit}
                            value={task.status}
                            onChange={(event) => {
                              const next = [...tasks];
                              next[index] = { ...task, status: event.target.value };
                              setTasks(next);
                              setDirty(true);
                            }}
                            className="font-mono text-sm"
                          />
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Goal</span>
                      {kind === "task-registry-md" ? (
                        <div className="rounded-md border border-border/80 bg-background/50 px-3 py-2 text-sm text-foreground">{task.goal}</div>
                      ) : (
                        <textarea
                          disabled={!canEdit}
                          className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[4.5rem] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                          value={task.goal}
                          onChange={(event) => {
                            const next = [...tasks];
                            next[index] = { ...task, goal: event.target.value };
                            setTasks(next);
                            setDirty(true);
                          }}
                        />
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {kind === "task-registry-xml" ? (
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium text-muted-foreground">Agent id</span>
                          <Input
                            disabled={!canEdit}
                            value={task.agentId}
                            onChange={(event) => {
                              const next = [...tasks];
                              next[index] = { ...task, agentId: event.target.value };
                              setTasks(next);
                              setDirty(true);
                            }}
                            className="font-mono text-sm"
                          />
                        </div>
                      ) : null}
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Depends</span>
                        {kind === "task-registry-md" ? (
                          <div className="rounded-md border border-border/80 bg-background/50 px-3 py-2 font-mono text-sm text-foreground">{task.depends || "—"}</div>
                        ) : (
                          <Input
                            disabled={!canEdit}
                            value={task.depends}
                            onChange={(event) => {
                              const next = [...tasks];
                              next[index] = { ...task, depends: event.target.value };
                              setTasks(next);
                              setDirty(true);
                            }}
                            className="font-mono text-sm"
                          />
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Verification</span>
                      {kind === "task-registry-md" ? (
                        <div className="rounded-md border border-border/80 bg-background/50 px-3 py-2 font-mono text-xs text-foreground">
                          {task.commands.join("; ") || "—"}
                        </div>
                      ) : (
                        <textarea
                          disabled={!canEdit}
                          className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[4.5rem] w-full rounded-md border px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                          value={task.commands.join("\n")}
                          onChange={(event) => {
                            const next = [...tasks];
                            next[index] = {
                              ...task,
                              commands: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean),
                            };
                            setTasks(next);
                            setDirty(true);
                          }}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : null}

          {kind === "state-xml" && stateXml ? (
            <Card className="border-border/80 bg-card/50 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Route className="size-4 text-muted-foreground" />
                  State
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Current phase</span>
                  <Input disabled={!canEdit} value={stateXml.currentPhase} onChange={(event) => { setStateXml({ ...stateXml, currentPhase: event.target.value }); setDirty(true); }} />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Current plan</span>
                  <Input disabled={!canEdit} value={stateXml.currentPlan} onChange={(event) => { setStateXml({ ...stateXml, currentPlan: event.target.value }); setDirty(true); }} />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Status</span>
                  <Input disabled={!canEdit} value={stateXml.status} onChange={(event) => { setStateXml({ ...stateXml, status: event.target.value }); setDirty(true); }} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Next action</span>
                  <textarea disabled={!canEdit} className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[5rem] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50" value={stateXml.nextAction} onChange={(event) => { setStateXml({ ...stateXml, nextAction: event.target.value }); setDirty(true); }} />
                </div>
              </CardContent>
            </Card>
          ) : null}

          {kind === "state-md" && stateMd ? (
            <Card className="border-border/80 bg-card/50 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Route className="size-4 text-muted-foreground" />
                  Section state
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {stateMd.registry.map((row, index) => (
                    <div key={`${row.key}-${index}`} className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">{row.key}</span>
                      <Input disabled={!canEdit} value={row.value} onChange={(event) => { const next = [...stateMd.registry]; next[index] = { ...row, value: event.target.value }; setStateMd({ ...stateMd, registry: next }); setDirty(true); }} />
                    </div>
                  ))}
                </div>
                <Separator />
                {stateMd.currentCycle.map((row, index) => (
                  <div key={`${row.key}-${index}`} className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">{row.key}</span>
                    <textarea disabled={!canEdit} className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[4rem] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50" value={row.value} onChange={(event) => { const next = [...stateMd.currentCycle]; next[index] = { ...row, value: event.target.value }; setStateMd({ ...stateMd, currentCycle: next }); setDirty(true); }} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {kind === "roadmap-xml" && roadXml.length > 0 ? (
            <>
              {roadXml.map((phase, index) => (
                <Card key={phase.id} className="border-border/80 bg-card/50 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      <Target className="size-4 text-muted-foreground" />
                      <span>{phase.title || phase.id}</span>
                      <Badge variant="outline" className="text-[10px]">{phase.status || "planned"}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <LockedValue
                      label="Phase id"
                      value={phase.id}
                      policy={policy}
                      canMigrate={!packReadOnly && policy.allowPackIdMigration && isMigratableId(phase.id)}
                      migrateDisabledReason="Phase IDs can only be migrated in a writable local pack when the id is a stable string reference."
                      onMigrate={(nextValue) => migratePackId(phase.id, nextValue)}
                    />
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Status</span>
                      <Input disabled={!canEdit} value={phase.status} onChange={(event) => { const next = [...roadXml]; next[index] = { ...phase, status: event.target.value }; setRoadXml(next); setDirty(true); }} />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Goal</span>
                      <textarea disabled={!canEdit} className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[4.5rem] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50" value={phase.goal} onChange={(event) => { const next = [...roadXml]; next[index] = { ...phase, goal: event.target.value }; setRoadXml(next); setDirty(true); }} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : null}

          {kind === "roadmap-md" && (roadMd.length > 0 || roadXml.length > 0) ? (
            <>
              {roadMd.length > 0 ? (
                roadMd.map((row, index) => (
                  <Card key={`${row.phase}-${index}`} className="border-border/80 bg-card/50 shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                        <Target className="size-4 text-muted-foreground" />
                        <span>{row.phase.replace(/`/g, "")}</span>
                        <Badge variant="outline" className="text-[10px]">{row.status || "planned"}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <LockedValue
                        label="Phase id"
                        value={row.phase.replace(/`/g, "")}
                        policy={policy}
                        canMigrate={!packReadOnly && policy.allowPackIdMigration && isMigratableId(row.phase.replace(/`/g, ""))}
                        migrateDisabledReason="Phase IDs can only be migrated in a writable local pack when the id is a stable string reference."
                        onMigrate={(nextValue) => migratePackId(row.phase.replace(/`/g, ""), nextValue)}
                      />
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Status</span>
                        <Input disabled={!canEdit} value={row.status} onChange={(event) => { const next = [...roadMd]; next[index] = { ...row, status: event.target.value }; setRoadMd(next); setDirty(true); }} />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Focus</span>
                        <textarea disabled={!canEdit} className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[4.5rem] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50" value={row.focus} onChange={(event) => { const next = [...roadMd]; next[index] = { ...row, focus: event.target.value }; setRoadMd(next); setDirty(true); }} />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Next</span>
                        <textarea disabled={!canEdit} className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[3.5rem] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50" value={row.next} onChange={(event) => { const next = [...roadMd]; next[index] = { ...row, next: event.target.value }; setRoadMd(next); setDirty(true); }} />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                roadXml.map((phase) => (
                  <Card key={phase.id} className="border-border/80 bg-card/50 shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="size-4 text-muted-foreground" />
                        {phase.title || phase.id}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <LockedValue
                        label="Phase id"
                        value={phase.id}
                        policy={policy}
                        canMigrate={!packReadOnly && policy.allowPackIdMigration && isMigratableId(phase.id)}
                        migrateDisabledReason="Phase IDs can only be migrated in a writable local pack when the id is a stable string reference."
                        onMigrate={(nextValue) => migratePackId(phase.id, nextValue)}
                      />
                      <p className="text-foreground">{phase.goal || "No structured goal captured in this roadmap block."}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          ) : null}

          {kind === "requirements-md" && requirements.length > 0 ? (
            <Card className="border-border/80 bg-card/50 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="size-4 text-muted-foreground" />
                  Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-2">
                {requirements.map((row) => (
                  <Card key={row.id} className="border-border/70 bg-background/40 shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm"><Badge variant="outline" className="font-mono text-[10px]">{row.id}</Badge></CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="font-medium text-foreground">{row.requirement}</p>
                      <p className="text-muted-foreground">{row.why}</p>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {kind === "decisions-xml" && xmlDecisions.length > 0 ? (
            <>
              {xmlDecisions.map((decision) => (
                <Card key={decision.id} className="border-border/80 bg-card/50 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      <GitBranch className="size-4 text-muted-foreground" />
                      <span>{decision.title}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">{decision.id}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-md border border-border/70 bg-background/40 p-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Summary</div>
                      <p className="mt-2 text-sm text-foreground">{decision.summary || "No summary recorded."}</p>
                    </div>
                    <div className="rounded-md border border-border/70 bg-background/40 p-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Impact</div>
                      <p className="mt-2 text-sm text-foreground">{decision.impact || "No impact recorded."}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : null}

          {kind === "phase-plan-xml" && phasePlan ? (
            <>
              <Card className="border-border/80 bg-card/50 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="size-4 text-muted-foreground" />
                    {phasePlan.phaseName || phasePlan.phaseId || "Phase plan"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <LockedValue label="Phase id" value={phasePlan.phaseId} policy={policy} />
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Phase name</span>
                    <Input
                      disabled={!canEdit}
                      value={phasePlan.phaseName}
                      onChange={(event) => {
                        setPhasePlan({ ...phasePlan, phaseName: event.target.value });
                        setDirty(true);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Purpose</span>
                    <textarea
                      disabled={!canEdit}
                      className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[4rem] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                      value={phasePlan.purpose}
                      onChange={(event) => {
                        setPhasePlan({ ...phasePlan, purpose: event.target.value });
                        setDirty(true);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Scope</span>
                    <textarea
                      disabled={!canEdit}
                      className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[4rem] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                      value={phasePlan.scope}
                      onChange={(event) => {
                        setPhasePlan({ ...phasePlan, scope: event.target.value });
                        setDirty(true);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-card/50 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="size-4 text-muted-foreground" />
                    Phase questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {phasePlan.questions.filter((question) => question.status === "open").length > 0 ? (
                    phasePlan.questions
                      .filter((question) => question.status === "open")
                      .map((question) => {
                        const draft = questionDrafts[question.id] ?? {
                          existingDecisionId: "",
                          newDecisionSummary: "",
                        };
                        const hasKnownDecision =
                          draft.existingDecisionId.trim().length > 0 &&
                          knownXmlDecisions.some((decision) => decision.id === draft.existingDecisionId.trim());
                        return (
                          <div key={question.id} className="rounded-xl border border-border/70 bg-background/40 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="font-mono text-[10px]">{question.id}</Badge>
                              <Badge variant="outline" className="text-[10px]">open</Badge>
                            </div>
                            <p className="mt-3 text-sm text-foreground">{question.text}</p>
                            {canEdit ? (
                              <div className="mt-4 space-y-3">
                                <Input
                                  value={draft.existingDecisionId}
                                  onChange={(event) => updateQuestionDraft(question.id, { existingDecisionId: event.target.value })}
                                  placeholder="Existing decision id"
                                  className="font-mono text-sm"
                                />
                                <textarea
                                  className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[4rem] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                                  value={draft.newDecisionSummary}
                                  onChange={(event) => updateQuestionDraft(question.id, { newDecisionSummary: event.target.value })}
                                  placeholder="Decision summary for a new answer record"
                                />
                                {knownXmlDecisions.length > 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    Known decisions: {knownXmlDecisions.slice(0, 5).map((decision) => decision.id).join(", ")}
                                    {knownXmlDecisions.length > 5 ? "…" : ""}
                                  </p>
                                ) : null}
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={!hasKnownDecision}
                                    onClick={() => {
                                      void linkPhaseQuestionToDecision(question.id, draft.existingDecisionId);
                                    }}
                                  >
                                    Link existing decision
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={!draft.newDecisionSummary.trim()}
                                    onClick={() => {
                                      void createDecisionFromQuestion(question.id);
                                    }}
                                  >
                                    Create decision
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                  ) : (
                    <div className="rounded-md border border-dashed border-border/70 bg-background/30 px-3 py-4 text-sm text-muted-foreground">
                      No open questions recorded.
                    </div>
                  )}

                  {canEdit ? (
                    <div className="rounded-xl border border-border/70 bg-background/40 p-3">
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-muted-foreground">Add question</span>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            value={newQuestionText}
                            onChange={(event) => setNewQuestionText(event.target.value)}
                            placeholder="Capture an open question for this phase"
                          />
                          <Button type="button" onClick={appendPhaseQuestion} disabled={!newQuestionText.trim()}>
                            Add question
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {phasePlan.questions.filter((question) => question.status === "answered").length > 0 ? (
                    <details className="rounded-xl border border-border/70 bg-background/30 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-foreground">
                        Answered history ({phasePlan.questions.filter((question) => question.status === "answered").length})
                      </summary>
                      <div className="mt-3 space-y-3">
                        {phasePlan.questions
                          .filter((question) => question.status === "answered")
                          .map((question) => (
                            <div key={question.id} className="rounded-md border border-border/70 bg-background/40 p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="font-mono text-[10px]">{question.id}</Badge>
                                <Badge variant="outline" className="text-[10px]">answered</Badge>
                                {question.decisionRef ? (
                                  <Badge variant="outline" className="font-mono text-[10px]">{question.decisionRef}</Badge>
                                ) : null}
                              </div>
                              <p className="mt-2 text-sm text-foreground">{question.text}</p>
                            </div>
                          ))}
                      </div>
                    </details>
                  ) : null}
                </CardContent>
              </Card>
            </>
          ) : null}

          {kind === "decisions-md" && decisions.length > 0 ? (
            <>
              {decisions.map((decision) => (
                <Card key={decision.id} className="border-border/80 bg-card/50 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      <GitBranch className="size-4 text-muted-foreground" />
                      <span>{decision.title}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">{decision.id}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 lg:grid-cols-2">
                    {decision.fields.map((field) => (
                      <div key={`${decision.id}-${field.key}`} className="rounded-md border border-border/70 bg-background/40 p-3">
                        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{field.key}</div>
                        <p className="mt-2 text-sm text-foreground">{field.value}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </>
          ) : null}

          {kind === "kickoff-md" && kickoff ? (
            <Card className="border-border/80 bg-card/50 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="size-4 text-muted-foreground" />
                  {kickoff.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {kickoff.fields.map((field, index) => (
                  <div key={`${field.key}-${index}`} className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">{field.key}</span>
                    <textarea disabled={!canEdit} className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[4rem] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50" value={field.value} onChange={(event) => { const next = [...kickoff.fields]; next[index] = { ...field, value: event.target.value }; setKickoff({ ...kickoff, fields: next }); setDirty(true); }} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {((kind === "markdown" || kind === "generic-xml" || kind === "other") ||
            (kind === "requirements-md" && requirements.length === 0) ||
            (kind === "decisions-xml" && xmlDecisions.length === 0) ||
            (kind === "decisions-md" && decisions.length === 0) ||
            (kind === "phase-plan-xml" && !phasePlan) ||
            (kind === "kickoff-md" && !kickoff)) ? (
            <UnsupportedInspector file={file} hideRawSource={policy.hideRawSourceInInspector} />
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
