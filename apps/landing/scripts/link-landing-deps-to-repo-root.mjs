/**
 * Vercel / npm hoists `apps/landing/node_modules/*` but Next typechecks sources under
 * `repo-planner/components/**`. TS resolves modules by walking up from the importing file;
 * `components/host/` never reaches `apps/landing/node_modules`, so `react` and peers look
 * missing. Symlink each landing dependency into `<repo-root>/node_modules/` (gitignored).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const landingDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(landingDir, "..", "..");
const fromRoot = path.join(landingDir, "node_modules");
const toRoot = path.join(repoRoot, "node_modules");
const symType = platform() === "win32" ? "junction" : "dir";

const pkg = JSON.parse(fs.readFileSync(path.join(landingDir, "package.json"), "utf8"));
const depNames = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
].filter((n) => n !== "repo-planner");

function linkOne(name) {
  const src = path.join(fromRoot, name);
  if (!fs.existsSync(src)) {
    console.warn(`[link-landing-deps] skip (missing): ${name}`);
    return;
  }
  const dest = path.join(toRoot, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    try {
      const st = fs.lstatSync(dest);
      if (st.isSymbolicLink()) fs.unlinkSync(dest);
      else return;
    } catch {
      return;
    }
  }
  const rel = path.relative(path.dirname(dest), src);
  fs.symlinkSync(rel, dest, symType);
}

for (const name of depNames) {
  try {
    linkOne(name);
  } catch (e) {
    console.error(`[link-landing-deps] ${name}:`, e?.message ?? e);
    process.exitCode = 1;
  }
}
