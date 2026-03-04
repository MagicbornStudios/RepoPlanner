/**
 * Shared status → Badge variant and semantic color for planning UI.
 * Uses theme tokens (--planning-status-*) so the host or a submodule can override via CSS.
 * Use everywhere we show task/phase/agent status so colors are consistent.
 */

export type StatusBadgeVariant = "default" | "secondary" | "outline" | "destructive";

const DONE_STATUSES = ["done", "complete", "completed", "resolved", "applied"];
const IN_PROGRESS_STATUSES = ["in-progress", "in_progress", "active"];
const FAILED_STATUSES = ["failed", "cancelled"];

export function statusVariant(status: string): StatusBadgeVariant {
  const s = status?.toLowerCase() ?? "";
  if (DONE_STATUSES.some((x) => s === x)) return "default";
  if (IN_PROGRESS_STATUSES.some((x) => s === x)) return "secondary";
  if (FAILED_STATUSES.some((x) => s === x)) return "destructive";
  return "outline";
}

/** Theme-token classes: planning-status-done | planning-status-progress | planning-status-failed. Defined in global.css; overridable by host or data-theme. */
export function statusClassName(status: string): string {
  const s = status?.toLowerCase() ?? "";
  if (DONE_STATUSES.some((x) => s === x)) return "border planning-status-done";
  if (IN_PROGRESS_STATUSES.some((x) => s === x)) return "border planning-status-progress";
  if (FAILED_STATUSES.some((x) => s === x)) return "border planning-status-failed";
  return "";
}
