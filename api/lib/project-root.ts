import path from "node:path";

/** Project root (repo with .planning/). Set REPOPLANNER_PROJECT_ROOT when standalone. Resolved to absolute path. */
export function getProjectRoot(): string {
  const raw = process.env.REPOPLANNER_PROJECT_ROOT || process.cwd();
  return path.resolve(process.cwd(), raw);
}

/** Path to loop-cli.mjs. Set REPOPLANNER_CLI_PATH for standalone; else project root / vendor / repo-planner / scripts. */
export function getCliPath(): string {
  const root = getProjectRoot();
  const explicit = process.env.REPOPLANNER_CLI_PATH;
  if (explicit) return path.resolve(root, explicit);
  return path.join(root, "vendor", "repo-planner", "scripts", "loop-cli.mjs");
}

export function getPlanningDir(): string {
  return path.join(getProjectRoot(), ".planning");
}
