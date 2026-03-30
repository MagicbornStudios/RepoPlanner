"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  FileStack,
  FolderGit2,
  HelpCircle,
  ListChecks,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { PlanningCockpitBundle } from "../../lib/planning-cockpit-data-source";
import type { PlanningHostPolicy } from "../../lib/planning-host-policy";
import type { PackKpiSnapshot } from "../../lib/planning-pack-kpis";

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="border-border/80 bg-card/40 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums text-foreground">{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function PlanningPackOverview({
  kpis,
  workflow,
  hostPolicy,
}: {
  kpis: PackKpiSnapshot | null;
  workflow?: PlanningCockpitBundle["workflow"] | null;
  hostPolicy?: PlanningHostPolicy | null;
}) {
  if (!kpis) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Select a planning pack in the sidebar to see KPIs and stats.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {workflow ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Workflow summary</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Parsed from the same workflow bundle that powers cockpit recommendations, warnings, and sprint context.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              title="Current sprint"
              value={`${workflow.sprint.progressPercent}%`}
              hint={`${workflow.sprint.activePhaseCount} active · ${workflow.sprint.openPhaseCount} open`}
              icon={Sparkles}
            />
            <StatCard
              title="Needs discussion"
              value={workflow.overview.needsDiscussionCount}
              hint="Phases with two or more open questions"
              icon={AlertTriangle}
            />
            <StatCard
              title="Missing tests"
              value={workflow.overview.missingTestsCount}
              hint="Executable work is not done without tests"
              icon={ShieldCheck}
            />
            <StatCard
              title="Stale phases"
              value={workflow.overview.stalePhasesCount}
              hint="Candidates for kickoff refresh"
              icon={TimerReset}
            />
            <StatCard
              title="Done-gate blocked"
              value={workflow.overview.doneGateBlockedCount}
              hint="Missing verification or open work still remains"
              icon={BarChart3}
            />
            <StatCard
              title="Top action"
              value={workflow.recommendations[0]?.action ?? "No recommendation"}
              hint={workflow.recommendations[0]?.title ?? "No ranked phase available"}
              icon={PlayCircle}
            />
          </div>
          {hostPolicy ? (
            <Card className="border-border/80 bg-card/40 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Host policy</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {hostPolicy.testsRequiredForDone ? <Badge variant="outline">Tests required for done</Badge> : null}
                {hostPolicy.globalReadOrderFirst ? <Badge variant="outline">Global-first read order</Badge> : null}
                {hostPolicy.hideRawSourceInInspector ? <Badge variant="outline">Raw source hidden</Badge> : null}
                {hostPolicy.immutableIds ? <Badge variant="outline">IDs locked</Badge> : null}
                <Badge variant="outline">Sprint size {hostPolicy.sprintSize}</Badge>
                <Badge variant="outline">Kickoff over {hostPolicy.kickoffHoursThreshold}h</Badge>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      <div>
        <h3 className="text-lg font-semibold tracking-tight text-foreground">Pack overview</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Parsed from XML and markdown in this pack. Question count is a rough heuristic (literal &quot;?&quot; in{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">.md</code> /{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">.mdx</code>).
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Files in pack" value={kpis.fileCount} icon={FileStack} />
        <StatCard
          title="Phases (task registry)"
          value={kpis.phaseCount}
          hint={kpis.roadmapPhaseCount ? `${kpis.roadmapPhaseCount} in ROADMAP.xml` : undefined}
          icon={FolderGit2}
        />
        <StatCard title="Tasks (registry)" value={kpis.tasksTotal} icon={ListChecks} />
        <StatCard title="Open tasks" value={kpis.tasksOpen} hint="planned / in-progress / blocked" icon={PlayCircle} />
        <StatCard title="Done tasks" value={kpis.tasksDone} icon={ListChecks} />
        <StatCard title="Other task status" value={kpis.tasksOther} hint="Unknown or custom status values" icon={BarChart3} />
        <StatCard
          title="STATE status"
          value={kpis.stateStatus ?? "--"}
          hint={
            kpis.referenceCount
              ? `${kpis.referenceCount} reference(s) in STATE.xml`
              : "No STATE.xml parsed"
          }
          icon={BarChart3}
        />
        <StatCard
          title="Doc flow entries"
          value={kpis.docFlowCount}
          hint="From ROADMAP.xml doc-flow when present"
          icon={FileStack}
        />
        <StatCard
          title="Question marks (approx.)"
          value={kpis.openQuestionsApprox}
          icon={HelpCircle}
        />
      </div>
    </div>
  );
}
