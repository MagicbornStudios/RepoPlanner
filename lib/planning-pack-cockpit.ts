"use client";

import { ensureArray, parseStateXmlString, planningXmlParser } from "repo-planner/lib/planning-parse-core.mjs";
import {
  classifyPlanningFile,
  parseRoadmapFromMarkdown,
  parseRoadmapXml,
  parseStateXml,
  parseTaskRegistryFromMarkdown,
  parseTaskRegistryXml,
} from "./planning-xml-parse";
import { buildPlanningWorkflowSnapshot } from "repo-planner/lib/planning-workflow.mjs";
import type {
  PlanningCockpitBundle,
  PlanningCockpitDataSource,
  PlanningCockpitMetricsPayload,
  PlanningCockpitMetricRow,
  PlanningCockpitSnapshotAgent,
} from "./planning-cockpit-data-source";
import type { PlanningPack } from "./workspace-storage";

type NormalizedPhase = {
  id: string;
  title: string;
  status: string;
  goal: string;
};

type NormalizedTask = {
  id: string;
  status: string;
  goal: string;
  agentId: string;
  phase: string;
};

const ACTIVE_AGENT_STATUSES = new Set(["in-progress", "in_progress", "active"]);
const DONE_PHASE_STATUSES = new Set(["done", "complete", "completed"]);
const DONE_TASK_STATUSES = new Set(["done", "complete", "completed", "cancelled"]);

function normalizePhaseId(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return /^\d+$/.test(raw) ? raw.padStart(2, "0") : raw;
}

function filePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function normalizePhaseTitle(id: string, title: string | undefined): string {
  const label = String(title ?? "").trim();
  return label || id;
}

function chooseReportMarkdown(files: { path: string; content: string }[]): string {
  const candidates = files
    .filter((file) => /\.(md|mdx)$/i.test(file.path))
    .sort((left, right) => left.path.localeCompare(right.path));
  const latest = candidates.find((file) => /(^|\/)latest\.md$/i.test(file.path));
  if (latest) return latest.content;
  const reportLike = candidates.find((file) => /report/i.test(file.path));
  return reportLike?.content ?? "";
}

function readPhaseQuestions(files: { path: string; content: string }[]) {
  const questions: PlanningCockpitBundle["openQuestions"] = [];

  for (const file of files) {
    if (!/-PLAN\.xml$/i.test(file.path)) continue;
    try {
      const obj = planningXmlParser.parse(file.content);
      const plan = obj["phase-plan"] ?? obj;
      const rawQuestions =
        plan.questions?.question != null ? ensureArray(plan.questions.question) : [];
      const planId = String(plan.meta?.["phase-id"] ?? file.path.replace(/-PLAN\.xml$/i, ""));
      const phaseId = normalizePhaseId(planId.match(/(\d+)/)?.[1] ?? planId);

      for (const rawQuestion of rawQuestions) {
        const record =
          rawQuestion && typeof rawQuestion === "object"
            ? (rawQuestion as Record<string, unknown>)
            : null;
        const status = String(record?.["@_status"] ?? record?.status ?? "open").toLowerCase() === "answered"
          ? "answered"
          : "open";
        const rawText = typeof record?.["#text"] === "string" ? record["#text"] : "";
        const text =
          rawText.trim() ||
          (typeof rawQuestion === "string" ? rawQuestion.trim() : "") ||
          "(no text)";
        questions.push({
          phaseId,
          id: String(record?.["@_id"] ?? record?.id ?? `${phaseId}-question-${questions.length + 1}`),
          text,
          status,
          file: filePath(file.path),
        });
      }
    } catch {
      // Keep pack parsing resilient.
    }
  }

  return questions.sort((left, right) =>
    `${left.phaseId}:${left.id}`.localeCompare(`${right.phaseId}:${right.id}`),
  );
}

function buildBundleFromPack(pack: PlanningPack): PlanningCockpitBundle {
  const files = pack.files.map((file) => ({ path: filePath(file.path), content: file.content }));
  const generatedAt = new Date().toISOString();
  const roadmapPhases: NormalizedPhase[] = [];
  const tasks: NormalizedTask[] = [];
  let snapshot: PlanningCockpitBundle["snapshot"] | undefined;

  for (const file of files) {
    const kind = classifyPlanningFile(file.path, file.content);
    if (kind === "task-registry-xml") {
      const parsed = parseTaskRegistryXml(file.content);
      for (const task of parsed?.tasks ?? []) {
        tasks.push({
          id: task.id,
          status: task.status,
          goal: task.goal,
          agentId: task.agentId,
          phase: normalizePhaseId(task.phaseId),
        });
      }
    } else if (kind === "task-registry-md") {
      const parsed = parseTaskRegistryFromMarkdown(file.content);
      for (const task of parsed?.tasks ?? []) {
        tasks.push({
          id: task.id,
          status: task.status,
          goal: task.goal,
          agentId: task.agentId,
          phase: normalizePhaseId(task.phaseId),
        });
      }
    } else if (kind === "roadmap-xml") {
      const parsed = parseRoadmapXml(file.content);
      for (const phase of parsed?.phases ?? []) {
        const normalizedId = normalizePhaseId(phase.id);
        roadmapPhases.push({
          id: normalizedId,
          title: normalizePhaseTitle(normalizedId, phase.title),
          status: phase.status,
          goal: phase.goal,
        });
      }
    } else if (kind === "roadmap-md") {
      const parsed = parseRoadmapFromMarkdown(file.content);
      for (const phase of parsed?.phases ?? []) {
        const normalizedId = normalizePhaseId(phase.id);
        roadmapPhases.push({
          id: normalizedId,
          title: normalizePhaseTitle(normalizedId, phase.title),
          status: phase.status,
          goal: phase.goal,
        });
      }
    } else if (kind === "state-xml") {
      const parsed = parseStateXml(file.content);
      if (parsed) {
        const rawState = parseStateXmlString(file.content);
        const agents: PlanningCockpitSnapshotAgent[] = (rawState?.agents ?? []).map((agent) => ({
          id: String(agent.id ?? ""),
          name: String(agent.name ?? ""),
          phase: normalizePhaseId(String(agent.phase ?? "")),
          plan: String(agent.plan ?? ""),
          status: String(agent.status ?? ""),
        }));
        snapshot = {
          currentPhase: normalizePhaseId(parsed.currentPhase),
          currentPlan: parsed.currentPlan,
          status: parsed.status,
          nextAction: parsed.nextAction,
          agents,
        };
      }
    }
  }

  const dedupedRoadmap = new Map<string, NormalizedPhase>();
  for (const phase of roadmapPhases) {
    if (!phase.id) continue;
    if (!dedupedRoadmap.has(phase.id)) dedupedRoadmap.set(phase.id, phase);
  }

  const knownPhaseIds = [...dedupedRoadmap.keys()];
  for (const task of tasks) {
    if (!task.phase || dedupedRoadmap.has(task.phase)) continue;
    dedupedRoadmap.set(task.phase, {
      id: task.phase,
      title: normalizePhaseTitle(task.phase, task.phase),
      status: "planned",
      goal: "",
    });
  }

  const phases = [...dedupedRoadmap.values()].sort((left, right) => left.id.localeCompare(right.id));
  const sprintSize = 5;
  const currentPhase = snapshot?.currentPhase ?? phases[0]?.id ?? "";
  const currentIndex = phases.findIndex((phase) => phase.id === currentPhase);
  const sprintIndex = currentIndex >= 0 ? Math.floor(currentIndex / sprintSize) : 0;
  const phaseIds = phases.slice(sprintIndex * sprintSize, sprintIndex * sprintSize + sprintSize).map((phase) => phase.id);
  const visiblePhaseIds = phaseIds.length ? phaseIds : phases.slice(0, sprintSize).map((phase) => phase.id);
  const phaseIdToTitle = Object.fromEntries(phases.map((phase) => [phase.id, phase.title]));
  const phaseQuestions = readPhaseQuestions(files) ?? [];
  const openQuestions = phaseQuestions.filter((question) => question.status !== "answered");
  const openTasks = tasks
    .filter((task) => !DONE_TASK_STATUSES.has(task.status.toLowerCase()))
    .map((task) => ({
      id: task.id,
      status: task.status,
      agentId: task.agentId,
      goal: task.goal,
      phase: task.phase,
    }));
  const agentsWithTasks = (snapshot?.agents ?? []).map((agent) => ({
    agent,
    tasks: tasks
      .filter((task) => task.agentId.trim() === agent.id.trim())
      .map((task) => ({
        id: task.id,
        status: task.status,
        goal: task.goal,
        phase: task.phase,
        phaseTitle: phaseIdToTitle[task.phase] ?? task.phase,
      })),
  }));
  const reviewItems = {
    summary: {
      phasesAtZeroCount: phases.filter((phase) => {
        const phaseTasks = tasks.filter((task) => task.phase === phase.id);
        return phaseTasks.length > 0 && phaseTasks.every((task) => !DONE_TASK_STATUSES.has(String(task.status ?? "").toLowerCase()));
      }).length,
      unassignedCount: openTasks.filter((task) => !String(task.agentId ?? "").trim()).length,
      phasesOnlyPlannedCount: phases.filter((phase) => {
        const phaseTasks = tasks.filter((task) => task.phase === phase.id && !DONE_TASK_STATUSES.has(String(task.status ?? "").toLowerCase()));
        return phaseTasks.length > 0 && phaseTasks.every((task) => String(task.status ?? "").toLowerCase() === "planned");
      }).length,
    },
  };

  return {
    format: "planning-pack-context/1.0",
    generatedAt,
    snapshot,
    openTasks,
    openQuestions,
    agentsWithTasks,
    workflow: buildPlanningWorkflowSnapshot({
      phases: phases
        .filter((phase) => visiblePhaseIds.includes(phase.id))
        .map((phase) => ({
          id: phase.id,
          title: phase.title,
          status: phase.status,
          goal: phase.goal,
          tasks: tasks
            .filter((task) => task.phase === phase.id)
            .map((task) => ({
              id: task.id,
              status: task.status,
              goal: task.goal,
              agentId: task.agentId,
              commands: [],
            })),
        })),
      taskRows: tasks.map((task) => ({
        id: task.id,
        status: task.status,
        goal: task.goal,
        agentId: task.agentId,
        phase: task.phase,
        commands: [],
      })),
      roadmapPhases: phases.map((phase) => ({
        id: phase.id,
        title: phase.title,
        status: phase.status,
        goal: phase.goal,
        depends: "",
      })),
      openQuestions,
      questionRecords: phaseQuestions,
      currentPhaseId: currentPhase,
      sprintIndex,
      sprintSize,
      reviewItems,
      ownership: "section",
      ownershipContext: {
        recommendedScope: "section",
        label: "Section planning",
        rationale: "Pack mode is usually section-local, so the default ownership target is the section planner unless the phase changes shared policy or cross-section sequencing.",
        targetFiles: files
          .map((file) => file.path)
          .filter((filePath) => /planning\/(roadmap|state|task-registry|decisions)\.mdx?$/i.test(filePath))
          .slice(0, 4),
        rules: [
          "Use section planning when one section owns delivery, verification, and maintenance.",
          "Escalate to Global only when the phase changes shared policy, workflow, CI, or cross-section sequencing.",
        ],
      },
      policy: {
        kickoffHoursThreshold: 6,
      },
    }),
    context: {
      sprintIndex,
      phaseIds: visiblePhaseIds,
      paths: files.map((file) => file.path),
      summary: {
        phases: phases
          .filter((phase) => visiblePhaseIds.includes(phase.id))
          .map((phase) => ({
            id: phase.id,
            title: phase.title,
            status: phase.status,
            goal: phase.goal,
            tasks: tasks
              .filter((task) => task.phase === phase.id)
              .map((task) => ({
                id: task.id,
                status: task.status,
                goal: task.goal,
                agentId: task.agentId,
              })),
          })),
        taskCount: tasks.filter((task) => visiblePhaseIds.includes(task.phase)).length,
      },
    },
  };
}

function buildMetricsFromBundle(
  bundle: PlanningCockpitBundle,
  fileCount: number,
): PlanningCockpitMetricsPayload {
  const tasks = bundle.openTasks ?? [];
  const doneTasks =
    bundle.context?.summary?.phases?.flatMap((phase) => phase.tasks ?? []).filter((task) =>
      DONE_TASK_STATUSES.has(task.status.toLowerCase()),
    ) ?? [];
  const tasksTotal = tasks.length + doneTasks.length;
  const completionRate = tasksTotal > 0 ? Math.round((doneTasks.length / tasksTotal) * 100) : 0;
  const activeAgentsCount =
    bundle.snapshot?.agents?.filter((agent) =>
      ACTIVE_AGENT_STATUSES.has(agent.status.toLowerCase()),
    ).length ?? 0;
  const phases = bundle.context?.summary?.phases ?? [];
  const phasesComplete = phases.filter((phase) =>
    DONE_PHASE_STATUSES.has((phase.status || "").toLowerCase()),
  ).length;

  const latest: PlanningCockpitMetricRow = {
    at: bundle.generatedAt ?? new Date().toISOString(),
    tasksTotal,
    tasksDone: doneTasks.length,
    tasksOpen: tasks.length,
    completionRate,
    openQuestionsCount: bundle.openQuestions?.length ?? 0,
    activeAgentsCount,
    phasesWithTasks: phases.filter((phase) => (phase.tasks?.length ?? 0) > 0).length,
    phasesTotal: phases.length,
    phasesComplete,
    errorsAttemptsCount: fileCount,
  };

  return {
    metrics: [latest],
    usage: [],
  };
}

export function buildPlanningPackCockpitData(pack: PlanningPack): {
  bundle: PlanningCockpitBundle;
  metrics: PlanningCockpitMetricsPayload;
  reportMarkdown: string;
} {
  const bundle = buildBundleFromPack(pack);
  return {
    bundle,
    metrics: buildMetricsFromBundle(bundle, pack.files.length),
    reportMarkdown: chooseReportMarkdown(pack.files),
  };
}

export function createPlanningPackDataSource(
  pack: PlanningPack,
  opts: {
    badgeLabel?: string;
    emptyMetricsMessage?: string;
    emptyReportMessage?: string;
  } = {},
): PlanningCockpitDataSource {
  const snapshot = buildPlanningPackCockpitData(pack);

  return {
    kind: "pack",
    badgeLabel: opts.badgeLabel ?? "Pack",
    supportsTerminal: false,
    supportsTestsTab: false,
    supportsChat: false,
    supportsHistoricalMetrics: false,
    emptyMetricsMessage:
      opts.emptyMetricsMessage ?? "Historical metrics are not available for local packs.",
    emptyReportMessage:
      opts.emptyReportMessage ?? "No markdown report was included in this pack.",
    async getBundle() {
      return snapshot.bundle;
    },
    async getMetrics() {
      return snapshot.metrics;
    },
    async getLatestReport() {
      return snapshot.reportMarkdown;
    },
  };
}
