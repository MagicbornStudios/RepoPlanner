"use client";

import { cn } from "../../lib/utils";

/**
 * Thin layout chrome around the planning workspace + live pane.
 * Composes with {@link PlanningCockpitDashboard} and vendored PlanningCockpit.
 */
export function RepoPlannerWorkspaceShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "planning-cockpit-host min-h-0 w-full rounded-2xl border border-border/80 bg-dark-alt/20",
        className,
      )}
    >
      {children}
    </div>
  );
}
