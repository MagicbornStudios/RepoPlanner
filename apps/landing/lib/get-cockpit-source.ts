import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Server-only: raw `cockpit-preview.tsx` for the Code tab (same file users run in Preview). */
export function getCockpitPreviewSource(): string {
  return readFileSync(join(process.cwd(), "components", "cockpit-preview.tsx"), "utf8");
}
