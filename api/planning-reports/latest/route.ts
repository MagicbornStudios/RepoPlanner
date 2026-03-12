import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getPlanningDir } from "../../lib/project-root";

export const runtime = "nodejs";

export async function GET() {
  try {
    const reportPath = path.join(getPlanningDir(), "reports", "latest.md");
    if (!existsSync(reportPath)) {
      return NextResponse.json({ error: "Report not found", markdown: "" }, { status: 404 });
    }
    const markdown = readFileSync(reportPath, "utf8");
    return NextResponse.json({ markdown });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message, markdown: "" }, { status: 500 });
  }
}
