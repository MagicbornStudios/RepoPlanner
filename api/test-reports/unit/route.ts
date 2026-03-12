import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Project root for resolving paths (e.g. test-reports). Set REPOPLANNER_PROJECT_ROOT when running standalone. */
function getProjectRoot(): string {
  return process.env.REPOPLANNER_PROJECT_ROOT || process.cwd();
}

/** Vitest JSON reporter shape (subset we use) */
type AssertionResult = {
  fullName: string;
  title: string;
  status: "passed" | "failed" | "pending" | "skipped";
  duration?: number;
  failureMessages?: string[];
  ancestorTitles?: string[];
};

type TestSuiteResult = {
  name: string;
  status: string;
  assertionResults: AssertionResult[];
  startTime?: number;
  endTime?: number;
};

type VitestJsonReport = {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  startTime?: number;
  testResults: TestSuiteResult[];
};

function normalizeFilePath(name: string): string {
  const base = path.basename(name);
  const match = base.match(/^(.+?)\.test\.(ts|tsx)$/);
  return match ? match[1] : base;
}

export async function GET() {
  try {
    const projectRoot = getProjectRoot();
    const resultsPath = path.join(projectRoot, "test-reports", "unit", "results.json");
    const raw = await fs.readFile(resultsPath, "utf-8");
    const data = JSON.parse(raw) as VitestJsonReport;

    const suites = data.testResults.map((suite) => ({
      file: normalizeFilePath(suite.name),
      filePath: suite.name,
      status: suite.status,
      passed: suite.assertionResults.filter((a) => a.status === "passed").length,
      failed: suite.assertionResults.filter((a) => a.status === "failed").length,
      total: suite.assertionResults.length,
      durationMs: suite.endTime && suite.startTime ? suite.endTime - suite.startTime : 0,
      tests: suite.assertionResults.map((t) => ({
        fullName: t.fullName,
        title: t.title,
        status: t.status,
        durationMs: t.duration ?? 0,
        failureMessages: t.failureMessages ?? [],
      })),
    }));

    return NextResponse.json({
      success: data.success,
      numTotalTests: data.numTotalTests,
      numPassedTests: data.numPassedTests,
      numFailedTests: data.numFailedTests,
      numPendingTests: data.numPendingTests,
      startTime: data.startTime,
      suites,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Test report not found or invalid",
        detail: message,
        hint: "Run pnpm test:unit from the project app dir (writes test-reports/unit/results.json). Set REPOPLANNER_PROJECT_ROOT for standalone.",
      },
      { status: 404 },
    );
  }
}
