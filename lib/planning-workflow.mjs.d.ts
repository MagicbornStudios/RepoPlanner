export type PlanningWorkflowRecommendation = {
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
};

export type PlanningWorkflowSnapshot = {
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
  recommendations: PlanningWorkflowRecommendation[];
};

export function buildPlanningWorkflowSnapshot(input: {
  phases: Array<{
    id: string;
    title: string;
    status: string;
    goal?: string;
    depends?: string;
    tasks?: Array<{
      id: string;
      status: string;
      goal: string;
      agentId: string;
      commands?: string[];
      estimatedHours?: number;
    }>;
    estimatedHours?: number;
  }>;
  taskRows?: Array<{
    id: string;
    status: string;
    goal: string;
    agentId: string;
    phase: string;
    commands?: string[];
    estimatedHours?: number;
  }>;
  roadmapPhases?: Array<{
    id: string;
    title?: string;
    status?: string;
    goal?: string;
    depends?: string;
    estimatedHours?: number;
  }>;
  openQuestions?: Array<{
    phaseId: string;
    id: string;
    text: string;
    file?: string;
  }>;
  questionRecords?: Array<{
    phaseId: string;
    id: string;
    text: string;
    status?: string;
    file?: string;
  }>;
  currentPhaseId?: string;
  sprintIndex?: number;
  sprintSize?: number;
  reviewItems?: {
    summary?: {
      phasesAtZeroCount?: number;
      unassignedCount?: number;
      phasesOnlyPlannedCount?: number;
    };
  } | null;
  ownership?: string;
  ownershipContext?: {
    recommendedScope?: string;
    label?: string;
    rationale?: string;
    targetFiles?: string[];
    rules?: string[];
  } | null;
  policy?: {
    kickoffHoursThreshold?: number;
  } | null;
}): PlanningWorkflowSnapshot;
