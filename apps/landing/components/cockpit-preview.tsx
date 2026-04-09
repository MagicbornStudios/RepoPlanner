"use client";

import { CheckCircle2, Circle, LayoutDashboard, ListTodo } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Static mock of the RepoPlanner cockpit — no `repo-planner/host` dependency on this site.
 * Shows how roadmap + state + task list read from `.planning/` could present in a host app.
 */
export function CockpitPreview() {
  return (
    <div className="overflow-hidden rounded-xl border-2 border-[var(--primary)]/35 bg-[var(--background)] text-left shadow-lg">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--foreground)]">
          <LayoutDashboard className="size-4 text-[var(--primary)]" aria-hidden />
          Planning cockpit
          <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)]">
            read-only mock
          </span>
        </div>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled>
          Snapshot
        </Button>
      </div>
      <div className="grid min-h-[220px] gap-0 md:grid-cols-[minmax(0,11rem)_1fr]">
        <aside className="border-b border-[var(--border)] bg-[var(--card)] p-3 md:border-b-0 md:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Roadmap</p>
          <ul className="mt-2 space-y-1.5 text-xs">
            <li className="rounded-md border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-2 py-1.5 text-[var(--foreground)]">
              <span className="font-mono text-[var(--primary)]">01</span> · Stabilize planning
            </li>
            <li className="rounded-md px-2 py-1.5 text-[var(--muted-foreground)]">
              <span className="font-mono">02</span> · (planned)
            </li>
          </ul>
        </aside>
        <div className="p-3">
          <div className="flex items-start gap-2">
            <ListTodo className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Next action <span className="font-normal normal-case text-[var(--muted-foreground)]">(STATE.xml)</span>
              </p>
              <p className="mt-1 text-sm leading-snug text-[var(--foreground)]">
                Pick one <code className="rounded bg-[var(--muted)] px-1 font-mono text-xs">planned</code> task in{" "}
                <code className="rounded bg-[var(--muted)] px-1 font-mono text-xs">TASK-REGISTRY.xml</code>, implement,
                update XML, commit.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Tasks <span className="font-normal normal-case">(TASK-REGISTRY.xml)</span>
            </p>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500/90" aria-hidden />
                <div>
                  <span className="font-mono text-[var(--primary)]">01-00</span> · Bootstrap{" "}
                  <span className="text-[var(--muted-foreground)]">done</span>
                </div>
              </li>
              <li className="flex items-start gap-2 rounded-lg border border-[var(--primary)]/45 bg-[var(--card)] px-2 py-2">
                <Circle className="mt-0.5 size-4 shrink-0 text-amber-500/90" aria-hidden />
                <div>
                  <span className="font-mono text-[var(--primary)]">01-01</span> · Align roadmap with brownfield backlog{" "}
                  <span className="text-[var(--muted-foreground)]">in-progress</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <p className="border-t border-[var(--border)] px-3 py-2 text-[10px] text-[var(--muted-foreground)]">
        Host apps embed <code className="font-mono">repo-planner/host</code> to wire real XML + packs. This page ships a
        static preview only.
      </p>
    </div>
  );
}
