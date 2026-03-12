"use client";

import { CheckCircle2, XCircle, Loader2, TestTube, ChevronDown, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PlanningMetricCard } from "../molecules/planning-metric-card";

type TestCase = {
  fullName: string;
  title: string;
  status: string;
  durationMs: number;
  failureMessages: string[];
};

type SuiteRow = {
  file: string;
  filePath: string;
  status: string;
  passed: number;
  failed: number;
  total: number;
  durationMs: number;
  tests: TestCase[];
};

type TestReportPayload = {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  startTime?: number;
  suites: SuiteRow[];
  error?: string;
  hint?: string;
};

export function PlanningTestReportsTab() {
  const [data, setData] = useState<TestReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/test-reports/unit");
      const body = await r.json();
      if (!r.ok) {
        setError(body.error ?? body.detail ?? "Failed to load test report");
        setData(null);
        return;
      }
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Loading unit test report…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Unit test report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error ?? "No data"}</p>
          {data?.hint && <p className="mt-2 text-xs text-muted-foreground">{data.hint}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            Run from <code className="rounded bg-muted px-1">docs-site</code>: <code className="rounded bg-muted px-1">pnpm test:unit</code> to generate <code className="rounded bg-muted px-1">test-reports/unit/results.json</code>.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { numPassedTests, numFailedTests, numTotalTests, suites } = data;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlanningMetricCard
          title="Total tests"
          icon={<TestTube className="size-3.5" />}
          value={numTotalTests}
          secondary={`${suites.length} suites`}
        />
        <PlanningMetricCard
          title="Passed"
          icon={<CheckCircle2 className="size-3.5 text-green-600 dark:text-green-400" />}
          value={numPassedTests}
        />
        <PlanningMetricCard
          title="Failed"
          icon={<XCircle className="size-3.5 text-destructive" />}
          value={numFailedTests}
        />
        <PlanningMetricCard
          title="Status"
          value={
            <Badge
              variant={data.success ? "default" : "destructive"}
              className={data.success ? "planning-status-done border" : "planning-status-failed border"}
            >
              {data.success ? "All passed" : "Failures"}
            </Badge>
          }
          valueClassName="text-base font-bold"
        />
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Suites</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[min(50vh,400px)]">
            <div className="space-y-1 px-4 pb-4">
              {suites.map((suite) => (
                <SuiteRowCard key={suite.filePath} suite={suite} />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function SuiteRowCard({ suite }: { suite: SuiteRow }) {
  const [open, setOpen] = useState(suite.failed > 0);
  const hasFailures = suite.failed > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-border/50 bg-muted/10">
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/20">
          {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
          <span className="font-mono text-xs">{suite.file}</span>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {suite.passed}/{suite.total}
          </Badge>
          {hasFailures && (
            <Badge variant="destructive" className="text-[10px]">
              {suite.failed} failed
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">{(suite.durationMs / 1000).toFixed(1)}s</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/50 px-3 py-2">
            <ul className="space-y-1.5 text-xs">
              {suite.tests.map((t) => (
                <li key={t.fullName} className="flex items-start gap-2">
                  {t.status === "passed" ? (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-foreground">{t.title}</span>
                    {t.durationMs >= 100 && (
                      <span className="ml-1 text-muted-foreground">({(t.durationMs / 1000).toFixed(2)}s)</span>
                    )}
                    {t.failureMessages.length > 0 && (
                      <pre className="mt-1 overflow-x-auto rounded bg-destructive/10 p-2 font-mono text-[10px] text-destructive">
                        {t.failureMessages.join("\n")}
                      </pre>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
