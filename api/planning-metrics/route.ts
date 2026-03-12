import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getPlanningDir } from "../lib/project-root";

export const runtime = "nodejs";

type MetricRow = {
  at: string;
  tasksTotal: number;
  tasksDone: number;
  tasksOpen: number;
  completionRate: number;
  openQuestionsCount: number;
  activeAgentsCount: number;
  phasesWithTasks: number;
  phasesTotal: number;
  phasesComplete: number;
  errorsAttemptsCount: number;
  snapshotTokensApprox?: number;
  bundleTokensApprox?: number;
  review?: { phasesAtZeroCount: number; unassignedCount: number; phasesOnlyPlannedCount: number };
};

type UsageRow = { at: string; command: string };

export async function GET(request: Request) {
  try {
    const reportsDir = path.join(getPlanningDir(), "reports");
    const { searchParams } = new URL(request.url);
    const tail = Math.min(500, Math.max(0, parseInt(searchParams.get("tail") ?? "100", 10) || 100));
    const includeUsage = searchParams.get("usage") !== "false";

    const metricsPath = path.join(reportsDir, "metrics.jsonl");
    const usagePath = path.join(reportsDir, "usage.jsonl");

    const metrics: MetricRow[] = [];
    if (existsSync(metricsPath)) {
      const content = readFileSync(metricsPath, "utf8");
      const lines = content.trim().split("\n").filter(Boolean);
      const last = tail > 0 ? lines.slice(-tail) : lines;
      for (const line of last) {
        try {
          metrics.push(JSON.parse(line) as MetricRow);
        } catch {
          // skip malformed
        }
      }
    }

    let usage: UsageRow[] = [];
    if (includeUsage && existsSync(usagePath)) {
      const content = readFileSync(usagePath, "utf8");
      const lines = content.trim().split("\n").filter(Boolean);
      const last = tail > 0 ? lines.slice(-tail) : lines;
      for (const line of last) {
        try {
          usage.push(JSON.parse(line) as UsageRow);
        } catch {
          // skip
        }
      }
    }

    return NextResponse.json({ metrics, usage });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
