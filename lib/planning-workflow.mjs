function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function normalizePhaseId(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return /^\d+$/.test(raw) ? raw.padStart(2, "0") : raw;
}

function asList(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeDepends(value) {
  return String(value ?? "")
    .split(/[\s,]+/)
    .map((token) => normalizePhaseId(token))
    .filter(Boolean);
}

function hasTestCommand(commands) {
  return asList(commands).some((command) =>
    /\b(test|vitest|jest|playwright|cypress|pytest|phpunit|rspec|go test)\b/i.test(String(command)),
  );
}

function hasBuildCommand(commands) {
  return asList(commands).some((command) =>
    /\b(build|next build|tsc|vite build|webpack)\b/i.test(String(command)),
  );
}

function hasLintCommand(commands) {
  return asList(commands).some((command) =>
    /\b(lint|eslint)\b/i.test(String(command)),
  );
}

function taskWeight(status) {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized === "blocked") return 2.5;
  if (normalized === "in-progress" || normalized === "in_progress" || normalized === "active") return 1.75;
  if (normalized === "done" || normalized === "completed" || normalized === "complete") return 0;
  return 1;
}

function deriveEffortLabel(weightedEffort) {
  if (weightedEffort <= 1) return "XS";
  if (weightedEffort <= 2.5) return "S";
  if (weightedEffort <= 4.5) return "M";
  if (weightedEffort <= 7) return "L";
  return "XL";
}

function inferExecutable(phase, tasks, commands) {
  const combinedText = `${phase.title ?? ""} ${phase.goal ?? ""} ${tasks.map((task) => task.goal ?? "").join(" ")}`.toLowerCase();
  if (commands.length > 0) return true;
  return /\b(implement|ship|build|fix|wire|render|parse|refactor|compose|scaffold|integrate)\b/.test(combinedText);
}

function buildDefaultOwnershipContext(scope) {
  if (scope === "section") {
    return {
      recommendedScope: "section",
      label: "Section planning",
      rationale: "This workflow source is section-local, so implementation and planning updates should usually stay in the section planner unless the work changes shared policy or cross-section sequencing.",
      targetFiles: ["planning/roadmap.mdx", "planning/state.mdx", "planning/task-registry.mdx", "planning/decisions.mdx"],
      rules: [
        "Use section planning when one section owns delivery, verification, and maintenance.",
        "Escalate to Global only when the phase changes shared policy, workflow, CI, or cross-section sequencing.",
      ],
    };
  }

  return {
    recommendedScope: "global",
    label: "Global / root planning",
    rationale: "This workflow source is rooted in the shared monorepo planner, so the default ownership target is the global loop and root planning files.",
    targetFiles: ["AGENTS.md", ".planning/ROADMAP.xml", ".planning/STATE.xml", ".planning/TASK-REGISTRY.xml"],
    rules: [
      "Use Global when the phase changes shared tooling, workflow policy, CI, or cross-section architecture.",
      "Split section-local implementation details into a section planner instead of duplicating the full task graph in both places.",
    ],
  };
}

function normalizeQuestionRecords(openQuestions, questionRecords) {
  if (Array.isArray(questionRecords) && questionRecords.length > 0) {
    return questionRecords.map((question) => ({
      phaseId: normalizePhaseId(question.phaseId),
      id: String(question.id ?? ""),
      text: String(question.text ?? "").trim() || "(no text)",
      status: String(question.status ?? "open").toLowerCase() === "answered" ? "answered" : "open",
      file: question.file ? String(question.file) : undefined,
    }));
  }

  return asList(openQuestions).map((question) => ({
    phaseId: normalizePhaseId(question.phaseId),
    id: String(question.id ?? ""),
    text: String(question.text ?? "").trim() || "(no text)",
    status: "open",
    file: question.file ? String(question.file) : undefined,
  }));
}

function buildReminder() {
  return {
    title: "Workflow reminder",
    deepLinkPath: "AGENTS.md",
    readOrder: [
      "Read AGENTS.md first.",
      "Read the planning records for the scope you are changing.",
      "Use Global docs and repo-planner docs when the work is cross-section or workflow-related.",
    ],
    rules: [
      "Kickoff is required when a phase is vague, stale, or estimated hours exceed policy max.",
      "Executable work is not done without automated tests on the verification path.",
      "Pick one phase, implement, verify, then update state and task records.",
    ],
  };
}

function countDependents(phaseId, roadmapPhases, roadmapStatusById) {
  const dependents = [];
  for (const phase of roadmapPhases) {
    const depends = normalizeDepends(phase.depends);
    if (!depends.includes(phaseId)) continue;
    const status = String(roadmapStatusById.get(normalizePhaseId(phase.id)) ?? "").toLowerCase();
    if (status === "done" || status === "completed" || status === "complete") continue;
    dependents.push(normalizePhaseId(phase.id));
  }
  return dependents;
}

function deriveRecommendationAction({ blocked, needsDiscussion }) {
  if (needsDiscussion) return "Discuss first";
  if (blocked) return "Unblock dependency";
  return "Implement now";
}

function createPhaseRecord(phase, bundleSummaryTasks, taskRows, roadmapPhases, phaseQuestionsByPhase, currentPhaseId, currentSprintPhaseIds, inProgressPhases) {
  const phaseId = normalizePhaseId(phase.id);
  const fullTaskRows = taskRows.filter((task) => normalizePhaseId(task.phase) === phaseId);
  const tasks = fullTaskRows.length
    ? fullTaskRows
    : asList(bundleSummaryTasks).map((task) => ({
        id: task.id,
        status: task.status,
        goal: task.goal,
        agentId: task.agentId,
        commands: [],
      }));
  const openTasks = tasks.filter((task) => {
    const status = String(task.status ?? "").toLowerCase();
    return status !== "done" && status !== "completed" && status !== "complete";
  });
  const doneTasks = tasks.length - openTasks.length;
  const weightedEffort = openTasks.reduce((sum, task) => sum + taskWeight(task.status), 0);
  const progressPercent = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const phaseQuestions = phaseQuestionsByPhase.get(phaseId) ?? [];
  const openQuestions = phaseQuestions.filter((question) => question.status === "open");
  const answeredQuestions = phaseQuestions.filter((question) => question.status === "answered");
  const openQuestionsCount = openQuestions.length;
  const needsDiscussion = openQuestionsCount >= 2;
  const roadmapPhase = roadmapPhases.find((entry) => normalizePhaseId(entry.id) === phaseId) ?? phase;
  const depends = normalizeDepends(roadmapPhase.depends);
  const current = phaseId === currentPhaseId;
  const inCurrentSprint = currentSprintPhaseIds.includes(phaseId);
  const inProgress = current || inProgressPhases.has(phaseId);
  const blockedByStatus =
    String(phase.status ?? "").toLowerCase() === "blocked" ||
    openTasks.some((task) => String(task.status ?? "").toLowerCase() === "blocked");

  return {
    id: phaseId,
    title: phase.title || phaseId,
    status: phase.status || "",
    goal: phase.goal || "",
    depends,
    tasks,
    openTasks,
    doneTasks,
    progressPercent,
    weightedEffort,
    effortLabel: deriveEffortLabel(weightedEffort),
    openQuestions,
    answeredQuestions,
    openQuestionsCount,
    needsDiscussion,
    current,
    inCurrentSprint,
    inProgress,
    blockedByStatus,
    estimatedHours: Number.isFinite(Number(phase.estimatedHours))
      ? Number(phase.estimatedHours)
      : tasks.reduce((sum, task) => {
          const value = Number(task.estimatedHours);
          return Number.isFinite(value) ? sum + value : sum;
        }, 0),
  };
}

export function buildPlanningWorkflowSnapshot({
  phases,
  taskRows = [],
  roadmapPhases = [],
  openQuestions = [],
  questionRecords = [],
  currentPhaseId = "",
  sprintIndex = 0,
  sprintSize = 5,
  reviewItems = null,
  ownership = "global",
  ownershipContext = null,
  policy = null,
}) {
  const normalizedCurrentPhaseId = normalizePhaseId(currentPhaseId);
  const currentSprintPhaseIds = phases.map((phase) => normalizePhaseId(phase.id)).filter(Boolean);
  const normalizedQuestionRecords = normalizeQuestionRecords(openQuestions, questionRecords);
  const phaseQuestionsByPhase = new Map();
  for (const question of normalizedQuestionRecords) {
    const phaseId = normalizePhaseId(question.phaseId);
    const existing = phaseQuestionsByPhase.get(phaseId) ?? [];
    existing.push(question);
    phaseQuestionsByPhase.set(phaseId, existing);
  }
  const inProgressPhases = new Set(
    taskRows
      .filter((task) => /^(in-progress|in_progress|active)$/i.test(String(task.status ?? "")))
      .map((task) => normalizePhaseId(task.phase)),
  );
  const roadmapStatusById = new Map(
    roadmapPhases.map((phase) => [normalizePhaseId(phase.id), String(phase.status ?? "").toLowerCase()]),
  );
  const rawPhaseRecords = phases.map((phase) =>
    createPhaseRecord(
      phase,
      phase.tasks ?? [],
      taskRows,
      roadmapPhases,
      phaseQuestionsByPhase,
      normalizedCurrentPhaseId,
      currentSprintPhaseIds,
      inProgressPhases,
    ),
  );
  const resolvedOwnershipContext = {
    ...buildDefaultOwnershipContext(ownership),
    ...(ownershipContext ?? {}),
  };
  const kickoffHoursThreshold =
    Number.isFinite(Number(policy?.kickoffHoursThreshold)) ? Number(policy.kickoffHoursThreshold) : 6;
  const maxEffort = rawPhaseRecords.reduce((max, phase) => Math.max(max, phase.weightedEffort), 1);
  const stalePhases = [];
  const recommendations = rawPhaseRecords
    .filter((phase) => {
      const normalizedStatus = String(phase.status ?? "").toLowerCase();
      return normalizedStatus !== "done" && normalizedStatus !== "completed" && normalizedStatus !== "complete";
    })
    .map((phase) => {
      const dependents = countDependents(phase.id, roadmapPhases, roadmapStatusById);
      const unblockValue = clamp(dependents.length / 3);
      const strategicImportance = phase.current ? 1 : phase.inProgress ? 0.92 : phase.inCurrentSprint ? 0.8 : 0.45;
      const urgency = phase.current ? 1 : phase.inProgress ? 0.8 : phase.inCurrentSprint ? 0.62 : 0.3;
      const momentum = phase.inProgress ? 0.85 : phase.openTasks.some((task) => String(task.agentId ?? "").trim()) ? 0.35 : 0.15;
      const testFollowupValue = phase.openTasks.length > 0 && !hasTestCommand(phase.tasks.flatMap((task) => asList(task.commands))) ? 1 : 0;
      const recencyBoost = phase.current ? 0.15 : phase.inProgress ? 0.08 : 0;
      const effortPenalty = clamp(phase.weightedEffort / maxEffort);
      const unresolvedDepends = phase.depends.filter((depId) => {
        const depStatus = roadmapStatusById.get(depId) ?? "";
        return depStatus !== "done" && depStatus !== "completed" && depStatus !== "complete";
      });
      const blocked = phase.blockedByStatus || unresolvedDepends.length > 0;
      const blockedPenalty = blocked ? 1 : 0;
      const globalPenaltyBase = ownership === "global" ? 1 : 0.2;
      const globalPenalty = clamp(globalPenaltyBase * (1 - unblockValue));
      const openQuestionEntropyPenalty = clamp(phase.openQuestionsCount * 0.18, 0, 0.72);
      const phaseCommands = phase.tasks.flatMap((task) => asList(task.commands));
      const missingDod =
        !String(phase.goal ?? "").trim() ||
        phase.openTasks.length === 0 ||
        phase.tasks.every((task) => !asList(task.commands).length);
      const stale =
        !phase.current &&
        phase.openTasks.length > 0 &&
        !phase.inProgress &&
        phase.progressPercent === 0 &&
        phase.openQuestionsCount === 0;
      if (stale) stalePhases.push(phase.id);
      const executable = inferExecutable(phase, phase.tasks, phaseCommands);
      const hasTests = hasTestCommand(phaseCommands);
      const hasBuild = hasBuildCommand(phaseCommands);
      const hasLint = hasLintCommand(phaseCommands);
      const kickoffReasons = [];
      if (!String(phase.goal ?? "").trim()) kickoffReasons.push("Missing goal");
      if (phase.openTasks.length === 0) kickoffReasons.push("No concrete tasks are attached");
      if (phase.tasks.every((task) => !asList(task.commands).length)) kickoffReasons.push("Verification path is not defined");
      if (stale) kickoffReasons.push("Phase looks stale");
      if (phase.needsDiscussion) kickoffReasons.push("Open questions still need discussion");
      if (phase.estimatedHours > kickoffHoursThreshold) {
        kickoffReasons.push(`Estimated hours (${phase.estimatedHours}) exceed the kickoff policy threshold (${kickoffHoursThreshold})`);
      }
      const doneGateReasons = [];
      if (phase.openTasks.length > 0) {
        doneGateReasons.push(`${phase.openTasks.length} open task${phase.openTasks.length === 1 ? "" : "s"} remain`);
      }
      if (missingDod) doneGateReasons.push("Definition of done is under-specified");
      if (executable && !hasTests) doneGateReasons.push("Tests are missing from the verification path");
      if (!hasBuild) doneGateReasons.push("Build verification is missing");
      if (!hasLint) doneGateReasons.push("Lint verification is missing");
      const ownershipGuidance = {
        ...resolvedOwnershipContext,
        rationale:
          resolvedOwnershipContext.rationale ??
          (ownership === "global"
            ? "This workflow source is rooted in shared planning, so Global is the default ownership target."
            : "This workflow source is section-local, so the section planner is the default ownership target."),
      };

      const score =
        35 * strategicImportance +
        20 * unblockValue +
        15 * urgency +
        10 * momentum +
        10 * testFollowupValue +
        10 * recencyBoost -
        15 * globalPenalty -
        10 * effortPenalty -
        10 * blockedPenalty -
        12 * openQuestionEntropyPenalty;

      const whyNow = [];
      if (phase.current) whyNow.push("Current phase in the active sprint");
      else if (phase.inCurrentSprint) whyNow.push("In the current sprint window");
      if (dependents.length > 0) whyNow.push(`Unblocks ${dependents.length} downstream phase${dependents.length === 1 ? "" : "s"}`);
      if (phase.inProgress) whyNow.push("Momentum is already warm");
      if (testFollowupValue > 0) whyNow.push("Open work still needs test coverage");

      const warnings = [];
      if (blocked) warnings.push("Dependency or task is blocked");
      if (phase.needsDiscussion) warnings.push("Needs discussion");
      if (missingDod) warnings.push("Definition of done is under-specified");
      if (testFollowupValue > 0) warnings.push("Verification path is missing tests");
      if (stale) warnings.push("Open phase looks stale");

      return {
        phaseId: phase.id,
        title: phase.title,
        score: Number(score.toFixed(2)),
        action: deriveRecommendationAction({ blocked, needsDiscussion: phase.needsDiscussion }),
        whyNow,
        warnings,
        kickoff: {
          required: kickoffReasons.length > 0,
          reasons: kickoffReasons,
          suggestedPath:
            ownershipGuidance.recommendedScope === "section"
              ? `planning/plans/${phase.id}/KICKOFF.mdx`
              : `.planning/phases/${phase.id}/`,
          checklist: ["goal", "scope", "non-goals", "dependencies", "tests required", "definition of done", "first tasks"],
        },
        doneGate: {
          ready: doneGateReasons.length === 0,
          executable,
          reasons: doneGateReasons,
          requiredChecks: executable ? ["build", "lint", "tests", "planning updates"] : ["build", "lint", "planning updates"],
          hasBuildCommand: hasBuild,
          hasLintCommand: hasLint,
          hasTestCommand: hasTests,
          openTasksRemaining: phase.openTasks.length,
        },
        ownershipGuidance,
        progressPercent: phase.progressPercent,
        effortLabel: phase.effortLabel,
        weightedEffort: Number(phase.weightedEffort.toFixed(2)),
        openQuestions: phase.openQuestions.map((question) => question.text),
        answeredQuestions: phase.answeredQuestions.map((question) => question.text),
        openQuestionsCount: phase.openQuestionsCount,
        answeredQuestionsCount: phase.answeredQuestions.length,
        missingTests: testFollowupValue > 0,
        missingDod,
        blocked,
        stale,
        ownership,
        sprintIndex,
        dependentPhaseIds: dependents,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.action !== right.action) {
        const order = { "Implement now": 0, "Discuss first": 1, "Unblock dependency": 2 };
        return order[left.action] - order[right.action];
      }
      return left.phaseId.localeCompare(right.phaseId);
    });

  const activePhaseCount = recommendations.filter((phase) => /^(implement now|discuss first)$/i.test(phase.action)).length;
  const sprintProgressPercent = phases.length
    ? Math.round(
        phases.reduce((sum, phase) => {
          const recommendation = recommendations.find((entry) => entry.phaseId === normalizePhaseId(phase.id));
          return sum + (recommendation?.progressPercent ?? 0);
        }, 0) / phases.length,
      )
    : 0;

  const missingTestsCount = recommendations.filter((phase) => phase.missingTests).length;
  const missingDodCount = recommendations.filter((phase) => phase.missingDod).length;
  const needsDiscussionCount = recommendations.filter((phase) => phase.openQuestionsCount >= 2).length;

  return {
    reminder: buildReminder(),
    ownership: resolvedOwnershipContext,
    sprint: {
      sprintIndex,
      sprintSize,
      phaseIds: currentSprintPhaseIds,
      activePhaseCount,
      openPhaseCount: recommendations.length,
      progressPercent: sprintProgressPercent,
    },
    overview: {
      orphanTasksCount: reviewItems?.summary?.unassignedCount ?? 0,
      phasesNeedingReviewCount: reviewItems?.summary?.phasesAtZeroCount ?? 0,
      phasesOnlyPlannedCount: reviewItems?.summary?.phasesOnlyPlannedCount ?? 0,
      stalePhasesCount: stalePhases.length,
      missingTestsCount,
      missingDodCount,
      needsDiscussionCount,
      kickoffRequiredCount: recommendations.filter((phase) => phase.kickoff.required).length,
      doneGateBlockedCount: recommendations.filter((phase) => !phase.doneGate.ready).length,
    },
    recommendations,
  };
}
