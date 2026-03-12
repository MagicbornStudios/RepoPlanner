import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import { getCliPath, getProjectRoot } from "../../lib/project-root";

export const runtime = "nodejs";
export const maxDuration = 60;

const BLOCKED_PREFIXES = ["task-update", "task-create", "phase-update", "agent-close", "plan-create", "migrate", "iterate"];
const ALLOWED_FIRST = new Set([
  "snapshot", "new-agent-id", "state", "agents", "tasks", "questions", "plans", "kpis", "metrics", "metrics-history",
  "simulate", "review", "report", "context", "workflow",
]);

function parseCommand(input: string): string[] {
  const trimmed = input.trim().replace(/^planning\s+/i, "");
  if (!trimmed) return [];
  return trimmed.split(/\s+/).filter(Boolean);
}

function isAllowed(tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  const first = tokens[0];
  if (BLOCKED_PREFIXES.includes(first)) return false;
  if (!ALLOWED_FIRST.has(first)) return false;
  const full = tokens.join(" ");
  for (const block of BLOCKED_PREFIXES) {
    if (full.includes(block)) return false;
  }
  if (first === "report" && tokens[1] !== "generate") return false;
  if (first === "simulate" && tokens[1] !== "loop") return false;
  if (first === "context" && !["quick", "sprint", "tokens", "full"].includes(tokens[1])) return false;
  return true;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const raw = typeof body.command === "string" ? body.command : "";
    const tokens = parseCommand(raw);
    if (tokens.length === 0) {
      return NextResponse.json({ ok: false, error: "Missing command", stdout: "", stderr: "" }, { status: 400 });
    }
    if (!isAllowed(tokens)) {
      return NextResponse.json(
        { ok: false, error: "Command not allowed (planning CLI subset only)", stdout: "", stderr: "" },
        { status: 400 },
      );
    }

    const root = getProjectRoot();
    const cliPath = getCliPath();
    const result = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve) => {
      const proc = spawn(process.execPath, [cliPath, ...tokens], {
        cwd: root,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      proc.stdout?.setEncoding("utf8");
      proc.stderr?.setEncoding("utf8");
      proc.stdout?.on("data", (chunk: Buffer | string) => { stdout += chunk; });
      proc.stderr?.on("data", (chunk: Buffer | string) => { stderr += chunk; });
      proc.on("close", (code: number | null) => resolve({ stdout, stderr, code }));
      proc.on("error", (err: Error) => resolve({ stdout: "", stderr: err.message, code: 1 }));
    });

    return NextResponse.json({
      ok: result.code === 0,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.code,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message, stdout: "", stderr: "" }, { status: 500 });
  }
}
