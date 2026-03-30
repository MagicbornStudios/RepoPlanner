// @ts-nocheck
function clampProgress(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function calculatePlanProgress({
  completedCount,
  totalCount,
}) {
  if (totalCount <= 0) return 0;
  return clampProgress((completedCount / totalCount) * 100);
}

export function shouldCelebrateProgress({
  previous,
  next,
}) {
  return previous < 100 && next === 100;
}
