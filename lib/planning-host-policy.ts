"use client";

export type PlanningHostPolicy = {
  testsRequiredForDone: boolean;
  globalReadOrderFirst: boolean;
  sprintSize: number;
  kickoffHoursThreshold: number;
  hideRawSourceInInspector: boolean;
  immutableIds: boolean;
  allowPackIdMigration: boolean;
};

export const defaultPlanningHostPolicy: PlanningHostPolicy = {
  testsRequiredForDone: true,
  globalReadOrderFirst: true,
  sprintSize: 5,
  kickoffHoursThreshold: 6,
  hideRawSourceInInspector: true,
  immutableIds: true,
  allowPackIdMigration: false,
};

export function resolvePlanningHostPolicy(
  overrides?: Partial<PlanningHostPolicy>,
): PlanningHostPolicy {
  return {
    ...defaultPlanningHostPolicy,
    ...overrides,
  };
}
