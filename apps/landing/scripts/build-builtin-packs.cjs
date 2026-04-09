/**
 * Assembles `public/planning-embed/builtin-packs.json`.
 * Primary source: repository root `.planning/` (RepoPlanner product tree).
 * Mirrors those files into `public/init/planning/` so `planning init` download matches the demo.
 * Falls back to `public/init/planning/` only if `.planning/` is missing ROADMAP.xml.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
/** RepoPlanner repository root (parent of `apps/landing`). */
const repoRoot = path.join(__dirname, "..", "..", "..");
const repoPlanningDir = path.join(repoRoot, ".planning");
const initDir = path.join(root, "public", "init");
const initPlanningDir = path.join(initDir, "planning");
const outDir = path.join(root, "public", "planning-embed");
const outFile = path.join(outDir, "builtin-packs.json");

const planningFileNames = [
  "STATE.xml",
  "TASK-REGISTRY.xml",
  "ROADMAP.xml",
  "DECISIONS.xml",
  "ERRORS-AND-ATTEMPTS.xml",
  "REQUIREMENTS.xml",
  "AGENTS.md",
];

const planningDir = fs.existsSync(path.join(repoPlanningDir, "ROADMAP.xml"))
  ? repoPlanningDir
  : initPlanningDir;

if (planningDir === repoPlanningDir) {
  fs.mkdirSync(initPlanningDir, { recursive: true });
  for (const name of planningFileNames) {
    const src = path.join(repoPlanningDir, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(initPlanningDir, name));
    }
  }
}

const files = [
  [".planning/planning-config.toml", path.join(initDir, "planning-config.toml")],
  ...planningFileNames.map((name) => [`.planning/${name}`, path.join(planningDir, name)]),
];

const payload = {
  v: 1,
  generatedAt: new Date().toISOString(),
  packs: [
    {
      id: "rp-builtin-init",
      label: "RepoPlanner .planning (reference tree)",
      description:
        "Checked-in .planning/*.xml + AGENTS.md from the RepoPlanner repository; bundled for the landing read-only cockpit and init download.",
      files: [],
    },
  ],
};

for (const [virtualPath, abs] of files) {
  if (!fs.existsSync(abs)) {
    console.warn(`[build-builtin-packs] skip missing: ${abs}`);
    continue;
  }
  payload.packs[0].files.push({
    path: virtualPath,
    content: fs.readFileSync(abs, "utf8"),
  });
}

if (payload.packs[0].files.length === 0) {
  console.error("[build-builtin-packs] no files — check .planning/ or public/init/");
  process.exitCode = 1;
} else {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
  console.log(
    `[build-builtin-packs] source=${path.relative(repoRoot, planningDir)} wrote ${payload.packs[0].files.length} file(s) -> ${path.relative(root, outFile)}`,
  );
}
