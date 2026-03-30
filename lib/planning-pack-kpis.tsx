"use client";

import {
  classifyPlanningFile,
  parseRoadmapPhasesFromMarkdown,
  parseRoadmapXml,
  parseStateXml,
  parseTaskRegistryFromMarkdown,
  parseTaskRegistryXml,
} from "./planning-xml-parse";

export type PackKpiSnapshot = {
  fileCount: number;
  phaseCount: number;
  tasksTotal: number;
  tasksOpen: number;
  tasksDone: number;
  tasksOther: number;
  roadmapPhaseCount: number;
  stateStatus: string | null;
  referenceCount: number;
  docFlowCount: number;
  openQuestionsApprox: number;
};

const TASK_OPEN = new Set(["planned", "in-progress", "in_progress", "blocked"]);
const TASK_DONE = new Set(["done", "complete", "completed", "cancelled"]);

function countQuestionMarksInText(files: { path: string; content: string }[]): number {
  let n = 0;
  for (const f of files) {
    const lower = f.path.toLowerCase();
    if (lower.endsWith(".md") || lower.endsWith(".mdx")) {
      for (const ch of f.content) {
        if (ch === "?") n += 1;
      }
    }
  }
  return n;
}

function accumulateTasks(
  parsed: { tasks: { status: string }[] } | null | undefined,
  acc: { total: number; open: number; done: number; other: number },
) {
  if (!parsed?.tasks?.length) return;
  for (const t of parsed.tasks) {
    acc.total += 1;
    const s = (t.status || "").toLowerCase();
    if (TASK_DONE.has(s)) acc.done += 1;
    else if (TASK_OPEN.has(s)) acc.open += 1;
    else acc.other += 1;
  }
}

/** Aggregate KPIs from all files in a pack (browser-safe). Uses shared classifiers + parsers with `loop-cli.mjs`. */
export function computePackKpis(files: { path: string; content: string }[]): PackKpiSnapshot {
  const fileCount = files.length;
  const taskAcc = { total: 0, open: 0, done: 0, other: 0 };
  let roadmapPhaseCount = 0;
  let stateStatus: string | null = null;
  let referenceCount = 0;
  let docFlowCount = 0;
  let registryPhaseCount = 0;

  for (const f of files) {
    const kind = classifyPlanningFile(f.path, f.content);

    if (kind === "task-registry-xml") {
      const parsed = parseTaskRegistryXml(f.content);
      if (parsed) {
        registryPhaseCount += parsed.phases.length;
        accumulateTasks(parsed, taskAcc);
      }
    } else if (kind === "task-registry-md") {
      const parsed = parseTaskRegistryFromMarkdown(f.content);
      if (parsed) {
        registryPhaseCount += parsed.phases.length;
        accumulateTasks(parsed, taskAcc);
      }
    } else if (kind === "state-xml") {
      const st = parseStateXml(f.content);
      if (st) {
        stateStatus = st.status;
        referenceCount = st.references.length;
      }
    } else if (kind === "roadmap-xml") {
      const rm = parseRoadmapXml(f.content);
      if (rm) {
        roadmapPhaseCount += rm.phases.length;
        docFlowCount += rm.docFlow.length;
      }
    } else if (kind === "roadmap-md") {
      const phases = parseRoadmapPhasesFromMarkdown(f.content);
      roadmapPhaseCount += phases.length;
    }
  }

  return {
    fileCount,
    phaseCount: registryPhaseCount,
    tasksTotal: taskAcc.total,
    tasksOpen: taskAcc.open,
    tasksDone: taskAcc.done,
    tasksOther: taskAcc.other,
    roadmapPhaseCount,
    stateStatus,
    referenceCount,
    docFlowCount,
    openQuestionsApprox: countQuestionMarksInText(files),
  };
}
