"use client";

import { Activity, BarChart3, FileText, HelpCircle, LayoutGrid, ListTodo, MessageCircle, Terminal, Users } from "lucide-react";
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
import { statusClassName, statusVariant } from "./planning-status";
import { ProgressTracker } from "../tool-ui/progress-tracker";

const POLL_MS = 8000;

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

export function PlanningCockpit() {
  const [tab, setTab] = useState("dashboard");
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [metricsData, setMetricsData] = useState<{ metrics: MetricRow[]; usage: UsageRow[] } | null>(null);
  const [reportMd, setReportMd] = useState<string | null>(null);
  const [cliInput, setCliInput] = useState("snapshot");
  const [cliOutput, setCliOutput] = useState<{ stdout: string; stderr: string }[]>([]);
  const [cliRunning, setCliRunning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);

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
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4 overflow-hidden rounded-xl border border-border/60 bg-card/50 shadow-xl">
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

      <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-4 flex h-9 w-max flex-none gap-1 rounded-lg bg-muted/60 p-1">
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
            <BarChart3 className="size-3.5" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 text-xs">
            <FileText className="size-3.5" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5 text-xs">
            <ListTodo className="size-3.5" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="phases" className="gap-1.5 text-xs">
            <LayoutGrid className="size-3.5" />
            Phases
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-1.5 text-xs">
            <HelpCircle className="size-3.5" />
            Questions
          </TabsTrigger>
          <TabsTrigger value="state" className="gap-1.5 text-xs">
            <Activity className="size-3.5" />
            State
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-1.5 text-xs">
            <Users className="size-3.5" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="terminal" className="gap-1.5 text-xs">
            <Terminal className="size-3.5" />
            Terminal
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5 text-xs">
            <MessageCircle className="size-3.5" />
            Chat
          </TabsTrigger>
        </TabsList>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4">
          <TabsContent value="dashboard" className="mt-3 h-full overflow-auto">
            {latest && (
              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border/50 bg-muted/20">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Completion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{latest.completionRate}%</div>
                    <p className="text-[10px] text-muted-foreground">{latest.tasksDone} / {latest.tasksTotal} tasks</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-muted/20">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Open questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{latest.openQuestionsCount}</div>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-muted/20">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Active agents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{latest.activeAgentsCount}</div>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-muted/20">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Snapshot / bundle tokens</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-foreground">
                      {latest.snapshotTokensApprox != null ? latest.snapshotTokensApprox.toLocaleString() : "—"} / {latest.bundleTokensApprox != null ? latest.bundleTokensApprox.toLocaleString() : "—"}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            {chartData.length > 0 && (
              <div className="space-y-4">
                <ChartContainer config={{ completionRate: { label: "Completion %" } }} className="h-[220px] w-full">
                  <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="at" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="completionRate" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
                {usageChartData.length > 0 && (
                  <ChartContainer config={{ count: { label: "Runs" } }} className="h-[180px] w-full">
                    <BarChart data={usageChartData} margin={{ left: 12, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="command" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </div>
            )}
            {metrics.length === 0 && (
              <p className="text-sm text-muted-foreground">Run <code className="rounded bg-muted px-1">planning report generate</code> to populate metrics.</p>
            )}
          </TabsContent>

          <TabsContent value="reports" className="mt-3 h-full overflow-hidden">
            <ScrollArea className="h-full rounded-md border border-border/50 bg-muted/10 p-4">
              {reportMd !== null ? (
                reportMd ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{reportMd}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No report yet. Run <code className="rounded bg-muted px-1">planning report generate</code> in Terminal.</p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tasks" className="mt-3 h-full overflow-auto">
            {bundle?.openTasks && bundle.openTasks.length > 0 ? (
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
                    {bundle.openTasks.map((t) => (
                      <tr key={t.id} className="border-b border-border/30">
                        <td className="px-3 py-2 font-mono">{t.id}</td>
                        <td className="px-3 py-2">{t.phase}</td>
                        <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{t.status}</Badge></td>
                        <td className="px-3 py-2 text-muted-foreground">{t.agentId || "—"}</td>
                        <td className="max-w-[240px] truncate px-3 py-2" title={t.goal}>{t.goal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No open tasks or state not loaded.</p>
            )}
          </TabsContent>

          <TabsContent value="phases" className="mt-3 h-full overflow-auto">
            {bundle?.context?.summary?.phases && bundle.context.summary.phases.length > 0 ? (
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
            ) : (
              <p className="text-sm text-muted-foreground">Phases from current sprint will appear here.</p>
            )}
          </TabsContent>

          <TabsContent value="state" className="mt-3 h-full overflow-auto">
            {bundle?.snapshot ? (
              <div className="space-y-4 rounded-md border border-border/50 bg-muted/10 p-4 font-mono text-xs">
                <div><span className="text-muted-foreground">current-phase:</span> {bundle.snapshot.currentPhase}</div>
                <div><span className="text-muted-foreground">current-plan:</span> {bundle.snapshot.currentPlan}</div>
                <div><span className="text-muted-foreground">status:</span> {bundle.snapshot.status}</div>
                <div><span className="text-muted-foreground">next-action:</span> {bundle.snapshot.nextAction ?? "—"}</div>
                {bundle.snapshot.agents && bundle.snapshot.agents.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">agents:</span>
                    <ul className="mt-1 list-inside list-disc">
                      {bundle.snapshot.agents.map((a) => (
                        <li key={a.id}>{a.id} — {a.phase} / {a.plan} ({a.status})</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">State not loaded.</p>
            )}
          </TabsContent>

          <TabsContent value="questions" className="mt-3 h-full overflow-auto">
            {bundle?.openQuestions && bundle.openQuestions.length > 0 ? (
              <ul className="space-y-3">
                {bundle.openQuestions.map((q) => (
                  <li key={q.id} className="rounded-md border border-border/50 bg-muted/10 p-3 text-sm">
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="font-mono text-[10px]">{q.id}</Badge>
                      <span className="text-[10px] text-muted-foreground">phase {q.phaseId}</span>
                      {q.file && <span className="text-[10px] text-muted-foreground truncate" title={q.file}>· {q.file}</span>}
                    </div>
                    <p className="mt-1.5 text-foreground">{q.text}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No open questions.</p>
            )}
          </TabsContent>

          <TabsContent value="agents" className="mt-3 h-full overflow-auto">
            {bundle?.agentsWithTasks && bundle.agentsWithTasks.length > 0 ? (
              <div className="space-y-3">
                {bundle.agentsWithTasks.map(({ agent: a, tasks: agentTasks }) => (
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
          </TabsContent>

          <TabsContent value="terminal" className="mt-3 flex h-full min-h-[320px] flex-col gap-2">
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
                <p className="text-muted-foreground">Output will appear here. Try: snapshot, state --json, questions --json, report generate</p>
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
          </TabsContent>

          <TabsContent value="chat" className="mt-3 h-full min-h-0 overflow-hidden">
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
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
