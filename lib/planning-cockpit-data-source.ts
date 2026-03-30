"use client";

export type PlanningCockpitMetricRow = {
  at: string;
  tasksTotal: number;
  tasksDone: number;
  tasksOpen?: number;
  completionRate: number;
  openQuestionsCount: number;
  activeAgentsCount: number;
  phasesWithTasks?: number;
  phasesTotal?: number;
  phasesComplete?: number;
  errorsAttemptsCount?: number;
  snapshotTokensApprox?: number;
  bundleTokensApprox?: number;
  review?: {
    phasesAtZeroCount: number;
    unassignedCount: number;
    phasesOnlyPlannedCount: number;
  };
};

export type PlanningCockpitUsageRow = {
  at: string;
  command: string;
};

export type PlanningCockpitSnapshotAgent = {
  id: string;
  name: string;
  phase: string;
  plan: string;
  status: string;
};

export type PlanningCockpitBundle = {
  snapshot?: {
    currentPhase: string;
    currentPlan: string;
    status: string;
    nextAction?: string;
    agents?: PlanningCockpitSnapshotAgent[];
  };
  openTasks?: Array<{
    id: string;
    status: string;
    agentId: string;
    goal: string;
    phase: string;
  }>;
  openQuestions?: Array<{
    phaseId: string;
    id: string;
    text: string;
    status?: "open" | "answered";
    file?: string;
  }>;
  context?: {
    sprintIndex?: number;
    phaseIds?: string[];
    paths?: string[];
    summary?: {
      phases?: Array<{
        id: string;
        title: string;
        status: string;
        goal?: string;
        tasks?: Array<{
          id: string;
          status: string;
          goal: string;
          agentId: string;
        }>;
      }>;
      taskCount?: number;
    };
  };
  agentsWithTasks?: Array<{
    agent: PlanningCockpitSnapshotAgent;
    tasks: Array<{
      id: string;
      status: string;
      goal: string;
      phase: string;
      phaseTitle?: string;
    }>;
  }>;
  workflow?: {
    reminder: {
      title: string;
      deepLinkPath: string;
      readOrder: string[];
      rules: string[];
    };
    ownership: {
      recommendedScope: string;
      label: string;
      rationale: string;
      targetFiles: string[];
      rules: string[];
    };
    sprint: {
      sprintIndex: number;
      sprintSize: number;
      phaseIds: string[];
      activePhaseCount: number;
      openPhaseCount: number;
      progressPercent: number;
    };
    overview: {
      orphanTasksCount: number;
      phasesNeedingReviewCount: number;
      phasesOnlyPlannedCount: number;
      stalePhasesCount: number;
      missingTestsCount: number;
      missingDodCount: number;
      needsDiscussionCount: number;
      kickoffRequiredCount: number;
      doneGateBlockedCount: number;
    };
    recommendations: Array<{
      phaseId: string;
      title: string;
      score: number;
      action: "Implement now" | "Discuss first" | "Unblock dependency";
      whyNow: string[];
      warnings: string[];
      kickoff: {
        required: boolean;
        reasons: string[];
        suggestedPath: string;
        checklist: string[];
      };
      doneGate: {
        ready: boolean;
        executable: boolean;
        reasons: string[];
        requiredChecks: string[];
        hasBuildCommand: boolean;
        hasLintCommand: boolean;
        hasTestCommand: boolean;
        openTasksRemaining: number;
      };
      ownershipGuidance: {
        recommendedScope: string;
        label: string;
        rationale: string;
        targetFiles: string[];
        rules: string[];
      };
      progressPercent: number;
      effortLabel: "XS" | "S" | "M" | "L" | "XL";
      weightedEffort: number;
      openQuestions: string[];
      answeredQuestions: string[];
      openQuestionsCount: number;
      answeredQuestionsCount: number;
      missingTests: boolean;
      missingDod: boolean;
      blocked: boolean;
      stale: boolean;
      ownership: string;
      sprintIndex: number;
      dependentPhaseIds: string[];
    }>;
  };
  format?: string;
  generatedAt?: string;
};

export type PlanningCockpitMetricsPayload = {
  metrics: PlanningCockpitMetricRow[];
  usage: PlanningCockpitUsageRow[];
};

export type PlanningCockpitCommandResult = {
  ok?: boolean;
  stdout?: string;
  stderr?: string;
};

export type PlanningCockpitDataSource = {
  kind: "live" | "pack";
  badgeLabel: string;
  supportsTerminal: boolean;
  supportsTestsTab: boolean;
  supportsChat: boolean;
  supportsHistoricalMetrics: boolean;
  emptyMetricsMessage: string;
  emptyReportMessage: string;
  getBundle: () => Promise<PlanningCockpitBundle | null>;
  getMetrics: () => Promise<PlanningCockpitMetricsPayload | null>;
  getLatestReport: () => Promise<string>;
  runCommand?: (command: string) => Promise<PlanningCockpitCommandResult>;
};

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T | null> {
  const response = await fetch(input, init);
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export function createApiPlanningCockpitDataSource({
  apiBase = "",
  badgeLabel = "Live",
  supportsTerminal = true,
  supportsTestsTab = true,
  supportsChat = true,
}: {
  apiBase?: string;
  badgeLabel?: string;
  supportsTerminal?: boolean;
  supportsTestsTab?: boolean;
  supportsChat?: boolean;
} = {}): PlanningCockpitDataSource {
  const prefix = apiBase.replace(/\/$/, "");

  return {
    kind: "live",
    badgeLabel,
    supportsTerminal,
    supportsTestsTab,
    supportsChat,
    supportsHistoricalMetrics: true,
    emptyMetricsMessage: "Run `planning report generate` to populate metrics.",
    emptyReportMessage: "No report. Run `report generate` in Terminal.",
    async getBundle() {
      return await fetchJson<PlanningCockpitBundle>(`${prefix}/api/planning-state`);
    },
    async getMetrics() {
      const body = await fetchJson<{ error?: string; metrics?: PlanningCockpitMetricRow[]; usage?: PlanningCockpitUsageRow[] }>(
        `${prefix}/api/planning-metrics?tail=80`,
      );
      if (!body || body.error) return null;
      return { metrics: body.metrics ?? [], usage: body.usage ?? [] };
    },
    async getLatestReport() {
      const body = await fetchJson<{ markdown?: string }>(`${prefix}/api/planning-reports/latest`);
      return body?.markdown ?? "";
    },
    async runCommand(command: string) {
      const body = await fetchJson<PlanningCockpitCommandResult>(`${prefix}/api/planning-cli/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      return body ?? { ok: false, stderr: "Command failed." };
    },
  };
}
