"use client";

import { Activity, BarChart3, FileText, HelpCircle, LayoutGrid, ListTodo, MessageCircle, Terminal, TestTube, Users, X } from "lucide-react";
import { motion } from "motion/react";
import type { ElementType } from "react";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PlanningChatPanel } from "./planning-chat-panel";
import { PlanningTestReportsTab } from "./planning-test-reports-tab";
import { statusClassName, statusVariant } from "../planning/planning-status";
import { ProgressTracker } from "../tool-ui/progress-tracker";
import { PanelSection } from "../ui/panel-section";
import { EmptyState } from "../ui/empty-state";
import { PlanningMetricCard } from "../molecules/planning-metric-card";

/** React 19 JSX compatibility with recharts/react-markdown/lucide (dual ReactNode typings). */
const LineChartC = LineChart as unknown as React.ComponentType<any>;
const BarChartC = BarChart as unknown as React.ComponentType<any>;
const XAxisC = XAxis as unknown as React.ComponentType<any>;
const YAxisC = YAxis as unknown as React.ComponentType<any>;
const LineC = Line as unknown as React.ComponentType<any>;
const BarC = Bar as unknown as React.ComponentType<any>;
const ReactMarkdownC = ReactMarkdown as unknown as React.ComponentType<any>;
const LayoutGridC = LayoutGrid as unknown as React.ComponentType<any>;
const XC = X as unknown as React.ComponentType<any>;
const HelpCircleC = HelpCircle as unknown as React.ComponentType<any>;

const POLL_MS = 8000;

/** Icon type: any for React 18/19 + lucide typings (dual ReactNode). */
type SubTabDef = { id: string; label: string; icon: ElementType };
type MainTabDef = { id: string; label: string; icon: ElementType; sub: SubTabDef[] };

const MAIN_TABS: MainTabDef[] = [
  { id: "overview", label: "Overview", icon: BarChart3 as unknown as ElementType, sub: [{ id: "dashboard", label: "Dashboard", icon: BarChart3 as unknown as ElementType }, { id: "reports", label: "Reports", icon: FileText as unknown as ElementType }] },
  { id: "work", label: "Work", icon: ListTodo as unknown as ElementType, sub: [{ id: "tasks", label: "Tasks", icon: ListTodo as unknown as ElementType }, { id: "phases", label: "Phases", icon: LayoutGrid as unknown as ElementType }, { id: "questions", label: "Questions", icon: HelpCircle as unknown as ElementType }] },
  { id: "state", label: "State", icon: Activity as unknown as ElementType, sub: [{ id: "state", label: "State", icon: Activity as unknown as ElementType }, { id: "agents", label: "Agents", icon: Users as unknown as ElementType }] },
  { id: "tools", label: "Tools", icon: Terminal as unknown as ElementType, sub: [{ id: "terminal", label: "Terminal", icon: Terminal as unknown as ElementType }, { id: "tests", label: "Tests", icon: TestTube as unknown as ElementType }] },
  { id: "chat", label: "Chat", icon: MessageCircle as unknown as ElementType, sub: [] },
];

function getContentKey(main: string, sub: string): string {
  if (main === "chat") return "chat";
  return sub;
}

type MetricRow = {
  at: string;
  tasksTotal: number;
  tasksDone: number;
  completionRate: number;
  openQuestionsCount: number;
  activeAgentsCount: number;
  snapshotTokensApprox?: number;
  bundleTokensApprox?: number;
};

type UsageRow = { at: string; command: string };

type Bundle = {
  snapshot?: { currentPhase: string; currentPlan: string; status: string; nextAction?: string; agents?: Array<{ id: string; name: string; phase: string; plan: string; status: string }> };
  openTasks?: Array<{ id: string; status: string; agentId: string; goal: string; phase: string }>;
  openQuestions?: Array<{ phaseId: string; id: string; text: string; file?: string }>;
  context?: { phaseIds?: string[]; paths?: string[]; summary?: { phases?: Array<{ id: string; title: string; status: string }> } };
  agentsWithTasks?: Array<{ agent: { id: string; name: string; phase: string; plan: string; status: string }; tasks: Array<{ id: string; status: string; goal: string; phase: string }> }>;
  format?: string;
  generatedAt?: string;
};

const ACTIVE_AGENT_STATUSES = new Set(["in-progress", "in_progress", "active"]);

export function PlanningCockpit() {
  const [mainTab, setMainTab] = useState("overview");
  const [subTab, setSubTab] = useState("dashboard");
  const contentKey = getContentKey(mainTab, subTab);
  const currentMain = MAIN_TABS.find((t) => t.id === mainTab);
  const setMainAndSub = useCallback((mainId: string) => {
    setMainTab(mainId);
    const main = MAIN_TABS.find((t) => t.id === mainId);
    if (main?.sub.length) setSubTab(main.sub[0].id);
  }, []);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [metricsData, setMetricsData] = useState<{ metrics: MetricRow[]; usage: UsageRow[] } | null>(null);
  const [reportMd, setReportMd] = useState<string | null>(null);
  const [cliInput, setCliInput] = useState("snapshot");
  const [cliOutput, setCliOutput] = useState<{ stdout: string; stderr: string }[]>([]);
  const [cliRunning, setCliRunning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  /** When set, Tasks tab shows only this phase; set by clicking phase in Phases or Phase cell in Tasks. */
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);

  const goToTasksForPhase = useCallback((phaseId: string) => {
    setSelectedPhaseId(phaseId);
    setMainTab("work");
    setSubTab("tasks");
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const r = await fetch("/api/planning-state");
      if (r.ok) {
        const data = await r.json();
        setBundle(data);
      }
    } catch {
      setBundle(null);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const r = await fetch("/api/planning-metrics?tail=80");
      const body = await r.json();
      if (!body.error) setMetricsData({ metrics: body.metrics ?? [], usage: body.usage ?? [] });
    } catch {
      // keep previous
    }
  }, []);

  const fetchReport = useCallback(async () => {
    try {
      const r = await fetch("/api/planning-reports/latest");
      if (r.ok) {
        const body = await r.json();
        setReportMd(body.markdown ?? "");
      } else {
        setReportMd("");
      }
    } catch {
      setReportMd("");
    }
  }, []);

  useEffect(() => {
    fetchState();
    fetchMetrics();
    fetchReport();
    setLastScan(new Date());
    const t = setInterval(() => {
      fetchState();
      fetchMetrics();
      fetchReport();
      setLastScan(new Date());
    }, POLL_MS);
    return () => clearInterval(t);
  }, [fetchState, fetchMetrics, fetchReport]);

  const runCli = async () => {
    const cmd = cliInput.trim() || "snapshot";
    setCliRunning(true);
    try {
      const r = await fetch("/api/planning-cli/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });
      const body = await r.json();
      setCliOutput((prev) => [...prev.slice(-49), { stdout: body.stdout || "", stderr: body.stderr || "" }]);
      if (body.ok) {
        setTimeout(() => {
          fetchState();
          fetchMetrics();
        }, 300);
      }
    } finally {
      setCliRunning(false);
    }
  };

  const metrics = metricsData?.metrics ?? [];
  const usage = metricsData?.usage ?? [];
  const latest = metrics.length ? metrics[metrics.length - 1] : null;
  const activeSnapshotAgents = (bundle?.snapshot?.agents ?? []).filter((agent) =>
    ACTIVE_AGENT_STATUSES.has(agent.status?.toLowerCase() ?? ""),
  );
  const chartData = metrics.map((m) => ({
    at: m.at.slice(0, 16).replace("T", " "),
    completionRate: m.completionRate,
    openQuestionsCount: m.openQuestionsCount,
  }));
  const usageByCommand = usage.reduce<Record<string, number>>((acc, u) => {
    acc[u.command] = (acc[u.command] ?? 0) + 1;
    return acc;
  }, {});
  const usageChartData = Object.entries(usageByCommand).map(([command, count]) => ({ command, count }));

  return (
    <div className="repo-planner flex h-[calc(100vh-6rem)] flex-col gap-4 overflow-hidden rounded-xl border border-border/60 bg-card/50 shadow-xl">
      <div className="flex flex-none items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Planning cockpit</h1>
          <Badge variant="secondary" className="text-[10px] font-normal">
            Live
          </Badge>
          {lastScan && (
            <span className="text-[10px] text-muted-foreground">
              Scanned {lastScan.toLocaleTimeString()}
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchState(); fetchMetrics(); fetchReport(); setLastScan(new Date()); }}>
          Refresh
        </Button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Tabs value={mainTab} onValueChange={setMainAndSub} className="flex flex-none flex-col">
          <TabsList className="mx-4 flex h-9 w-max gap-1 rounded-lg bg-muted/60 p-1" role="tablist" aria-label="Main section">
            {MAIN_TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.id} value={t.id} className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm" role="tab" aria-selected={mainTab === t.id}>
                  <Icon className="size-3.5 shrink-0 text-muted-foreground data-[state=active]/trigger:text-foreground" aria-hidden />
                  {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {currentMain?.sub.length ? (
            <div className="mx-4 mt-2 flex h-8 w-max gap-0.5 rounded-md bg-muted/40 p-0.5" role="tablist" aria-label={`${currentMain.label} sub-views`}>
              {currentMain.sub.map((s) => {
                const SubIcon = s.icon;
                const isActive = subTab === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSubTab(s.id)}
                    className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "bg-background/80 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground/80"}`}
                  >
                    <SubIcon className={`size-3 shrink-0 ${isActive ? "text-foreground" : "opacity-70"}`} aria-hidden />
                    {s.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </Tabs>

        <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4">
          <motion.div
            key={contentKey}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
          {contentKey === "dashboard" && (
          <div className="h-full overflow-auto">
            {latest && (
              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <PlanningMetricCard
                  title="Completion"
                  value={`${latest.completionRate}%`}
                  secondary={`${latest.tasksDone} / ${latest.tasksTotal} tasks`}
                  tooltip="Tasks done / total from TASK-REGISTRY"
                />
                <PlanningMetricCard title="Open questions" value={latest.openQuestionsCount} tooltip="Unresolved questions from planning state" />
                <PlanningMetricCard title="Active agents" value={activeSnapshotAgents.length || latest.activeAgentsCount} tooltip="Agents with active status in STATE" />
                <PlanningMetricCard
                  title="Snapshot / bundle tokens"
                  value={
                    <>
                      {latest.snapshotTokensApprox != null ? latest.snapshotTokensApprox.toLocaleString() : "—"} /{" "}
                      {latest.bundleTokensApprox != null ? latest.bundleTokensApprox.toLocaleString() : "—"}
                    </>
                  }
                  className="[&_.text-2xl]:text-lg"
                  tooltip="Approx token counts for snapshot vs full bundle"
                />
              </div>
            )}
            {chartData.length > 0 && (
              <div className="space-y-4">
                <ChartContainer config={{ completionRate: { label: "Completion %" } }} className="h-[220px] w-full">
                  <LineChartC data={chartData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxisC dataKey="at" tick={{ fontSize: 10 }} />
                    <YAxisC domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <ChartTooltip content={<ChartTooltipContent /> as unknown as string} />
                    <LineC type="monotone" dataKey="completionRate" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                  </LineChartC>
                </ChartContainer>
                {usageChartData.length > 0 && (
                  <ChartContainer config={{ count: { label: "Runs" } }} className="h-[180px] w-full">
                    <BarChartC data={usageChartData} margin={{ left: 12, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxisC dataKey="command" tick={{ fontSize: 10 }} />
                      <YAxisC tick={{ fontSize: 10 }} />
                      <ChartTooltip content={<ChartTooltipContent /> as unknown as string} />
                      <BarC dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChartC>
                  </ChartContainer>
                )}
              </div>
            )}
            {metrics.length === 0 && (
              <p className="text-sm text-muted-foreground">Run <code className="rounded bg-muted px-1">planning report generate</code> to populate metrics.</p>
            )}
          </div>
          )}
          {contentKey === "reports" && (
          <div className="h-full overflow-hidden">
            <ScrollArea className="h-full rounded-md border border-border/50 bg-muted/10 p-4">
              {reportMd !== null ? (
                reportMd ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdownC>{reportMd}</ReactMarkdownC>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground" title="Run planning report generate in Terminal.">No report. Run <code className="rounded bg-muted px-1">report generate</code> in Terminal.</p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
            </ScrollArea>
          </div>
          )}
          {contentKey === "tasks" && (
          <div className="h-full overflow-auto">
            <PanelSection
              title="Open tasks"
              actions={
                <>
                  {selectedPhaseId ? (
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setSelectedPhaseId(null)} aria-label="Clear phase filter">
                      <LayoutGridC className="size-3" /> Phase {selectedPhaseId} <XC className="size-3" />
                    </Button>
                  ) : null}
                  <span title="From TASK-REGISTRY. Click phase to filter." aria-label="Help"><HelpCircleC className="size-3.5 text-muted-foreground cursor-help" /></span>
                </>
              }
            >
              {bundle?.openTasks && bundle.openTasks.length > 0 ? (() => {
                const filtered = selectedPhaseId ? bundle.openTasks.filter((t) => t.phase === selectedPhaseId) : bundle.openTasks;
                return filtered.length > 0 ? (
                  <div className="rounded-md border border-border/50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/30">
                          <th className="px-3 py-2 text-left font-medium">Task</th>
                          <th className="px-3 py-2 text-left font-medium">Phase</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                          <th className="px-3 py-2 text-left font-medium">Agent</th>
                          <th className="px-3 py-2 text-left font-medium">Goal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((t) => (
                          <tr key={t.id} className="border-b border-border/30">
                            <td className="px-3 py-2 font-mono">{t.id}</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                className="text-primary hover:underline font-mono"
                                onClick={() => goToTasksForPhase(t.phase)}
                                title={`Show only phase ${t.phase}`}
                              >
                                {t.phase}
                              </button>
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant={statusVariant(t.status)} className={statusClassName(t.status) ? `text-[10px] ${statusClassName(t.status)}` : "text-[10px]"}>
                                {t.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{t.agentId || "—"}</td>
                            <td className="max-w-[240px] truncate px-3 py-2" title={t.goal}>{t.goal}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState message={`No tasks for phase ${selectedPhaseId}.`} secondary="Clear filter or run planning snapshot." />
                );
              })() : (
                <EmptyState message="No open tasks." secondary="Refresh or run planning snapshot." />
              )}
            </PanelSection>
          </div>
          )}
          {contentKey === "phases" && (
          <div className="h-full overflow-auto space-y-4">
            {bundle?.context?.summary?.phases && bundle.context.summary.phases.length > 0 ? (
              <>
                <ProgressTracker
                  id="planning-phases"
                  steps={bundle.context.summary.phases.map((p) => ({
                    id: p.id,
                    label: p.title,
                    description: p.id,
                    status: (p.status?.toLowerCase() === "complete" || p.status?.toLowerCase() === "completed"
                      ? "completed"
                      : p.status?.toLowerCase() === "in-progress"
                        ? "in-progress"
                        : p.status?.toLowerCase() === "failed"
                          ? "failed"
                          : "pending") as "pending" | "in-progress" | "completed" | "failed",
                  }))}
                  elapsedTime={0}
                />
                <PanelSection title="By phase" actions={<span title="Click View tasks to see tasks for that phase." aria-label="Help"><HelpCircleC className="size-3.5 text-muted-foreground cursor-help" /></span>}>
                  <ul className="space-y-2">
                    {bundle.context.summary.phases.map((p) => {
                      const taskCount = bundle?.openTasks?.filter((t) => t.phase === p.id).length ?? 0;
                      return (
                        <li key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/10 px-3 py-2 text-sm">
                          <span className="font-medium truncate">{p.title}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{p.id}</span>
                          <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={() => goToTasksForPhase(p.id)}>
                            View tasks {taskCount > 0 ? `(${taskCount})` : ""}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </PanelSection>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Phases from current sprint will appear here.</p>
            )}
          </div>
          )}
          {contentKey === "state" && (
          <div className="h-full overflow-auto">
            {bundle?.snapshot ? (
              <div className="space-y-4 rounded-md border border-border/50 bg-muted/10 p-4 font-mono text-xs">
                <div><span className="text-muted-foreground">current-phase:</span> {bundle.snapshot.currentPhase}</div>
                <div><span className="text-muted-foreground">current-plan:</span> {bundle.snapshot.currentPlan}</div>
                <div><span className="text-muted-foreground">status:</span> {bundle.snapshot.status}</div>
                <div><span className="text-muted-foreground">next-action:</span> {bundle.snapshot.nextAction ?? "—"}</div>
                {activeSnapshotAgents.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">agents:</span>
                    <ul className="mt-1 list-inside list-disc">
                      {activeSnapshotAgents.map((a) => (
                        <li key={a.id}>{a.id} — {a.phase} / {a.plan} ({a.status})</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">State not loaded.</p>
            )}
          </div>
          )}
          {contentKey === "questions" && (
          <div className="h-full overflow-auto">
            <PanelSection title="Open questions">
              {bundle?.openQuestions && bundle.openQuestions.length > 0 ? (
                <ul className="space-y-3">
                  {bundle.openQuestions.map((q) => (
                    <li key={q.id} className="rounded-md border border-border/50 bg-muted/10 p-3 text-sm">
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px]">{q.id}</Badge>
                        <button type="button" className="text-[10px] text-primary hover:underline font-mono" onClick={() => goToTasksForPhase(q.phaseId)} title={`Show tasks for phase ${q.phaseId}`}>phase {q.phaseId}</button>
                        {q.file && <span className="text-[10px] text-muted-foreground truncate" title={q.file}>· {q.file}</span>}
                      </div>
                      <p className="mt-1.5 text-foreground">{q.text}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState message="No open questions." />
              )}
            </PanelSection>
          </div>
          )}
          {contentKey === "agents" && (
          <div className="h-full overflow-auto">
            {bundle?.agentsWithTasks && bundle.agentsWithTasks.some(({ agent }) => ACTIVE_AGENT_STATUSES.has(agent.status?.toLowerCase() ?? "")) ? (
              <div className="space-y-3">
                {bundle.agentsWithTasks
                  .filter(({ agent }) => ACTIVE_AGENT_STATUSES.has(agent.status?.toLowerCase() ?? ""))
                  .map(({ agent: a, tasks: agentTasks }) => (
                  <Card key={a.id} className="border-border/50">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-sm font-mono">{a.id}</CardTitle>
                      <p className="text-[10px] text-muted-foreground">{a.name} · {a.phase} / {a.plan} · {a.status}</p>
                    </CardHeader>
                    {agentTasks.length > 0 && (
                      <CardContent className="pt-0">
                        <ul className="space-y-1 text-xs">
                          {agentTasks.map((t) => (
                            <li key={t.id} className="flex gap-2">
                              <Badge variant={statusVariant(t.status)} className={statusClassName(t.status) ? `text-[10px] ${statusClassName(t.status)}` : "text-[10px]"}>{t.status}</Badge>
                              <span className="truncate">{t.goal}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No agents with tasks.</p>
            )}
          </div>
          )}
          {contentKey === "tests" && (
          <div className="h-full overflow-auto">
            <PlanningTestReportsTab />
          </div>
          )}
          {contentKey === "terminal" && (
          <div className="flex h-full min-h-[320px] flex-col gap-2">
            <div className="flex flex-none gap-2">
              <Input
                value={cliInput}
                onChange={(e) => setCliInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runCli()}
                placeholder="planning snapshot"
                className="font-mono text-sm"
              />
              <Button onClick={runCli} disabled={cliRunning}>
                {cliRunning ? "Running…" : "Run"}
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">Output</div>
              <ScrollArea className="flex-1 rounded-md border border-border/50 bg-black/80 p-3 font-mono text-[11px] text-green-300">
              {cliOutput.length === 0 ? (
                <p className="text-muted-foreground" title="Allowed: snapshot, state, questions, report generate, metrics, context, etc.">Try: snapshot, state --json, report generate</p>
              ) : (
                cliOutput.map((o, i) => (
                  <pre key={i} className="whitespace-pre-wrap break-all">
                    {o.stderr && <span className="text-amber-400">{o.stderr}</span>}
                    {o.stdout}
                  </pre>
                ))
              )}
              </ScrollArea>
            </div>
          </div>
          )}
          {contentKey === "chat" && (
          <div className="h-full min-h-0 overflow-hidden">
            <PlanningChatPanel
              context={{
                currentPhase: bundle?.snapshot?.currentPhase,
                currentPlan: bundle?.snapshot?.currentPlan,
                status: bundle?.snapshot?.status,
                openTasksCount: bundle?.openTasks?.length ?? 0,
                openQuestionsCount: bundle?.openQuestions?.length ?? 0,
                activeAgents: bundle?.snapshot?.agents?.map((a) => a.id) ?? [],
              }}
              className="h-full"
            />
          </div>
          )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
