import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import { getCliPath, getProjectRoot } from "../lib/project-root";

export const runtime = "nodejs";

export async function GET() {
  try {
    const root = getProjectRoot();
    const cliPath = getCliPath();
    const result = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve) => {
      const proc = spawn(process.execPath, [cliPath, "simulate", "loop", "--json"], {
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

    if (result.code !== 0) {
      return NextResponse.json(
        { error: "Planning CLI failed", detail: result.stderr || result.stdout },
        { status: 502 },
      );
    }

    let bundle: unknown;
    try {
      bundle = JSON.parse(result.stdout);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON from planning CLI", detail: result.stdout.slice(0, 500) },
        { status: 502 },
      );
    }
    return NextResponse.json(bundle);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
