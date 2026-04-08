/**
 * Assembles `public/planning-embed/builtin-packs.json` from `public/init/` for the static cockpit demo.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const initDir = path.join(root, "public", "init");
const planningDir = path.join(initDir, "planning");
const outDir = path.join(root, "public", "planning-embed");
const outFile = path.join(outDir, "builtin-packs.json");

const files = [
  [".planning/planning-config.toml", path.join(initDir, "planning-config.toml")],
  [".planning/STATE.xml", path.join(planningDir, "STATE.xml")],
  [".planning/TASK-REGISTRY.xml", path.join(planningDir, "TASK-REGISTRY.xml")],
  [".planning/ROADMAP.xml", path.join(planningDir, "ROADMAP.xml")],
  [".planning/DECISIONS.xml", path.join(planningDir, "DECISIONS.xml")],
  [".planning/ERRORS-AND-ATTEMPTS.xml", path.join(planningDir, "ERRORS-AND-ATTEMPTS.xml")],
  [".planning/REQUIREMENTS.xml", path.join(planningDir, "REQUIREMENTS.xml")],
  [".planning/AGENTS.md", path.join(planningDir, "AGENTS.md")],
];

const payload = {
  v: 1,
  generatedAt: new Date().toISOString(),
  packs: [
    {
      id: "rp-builtin-init",
      label: "Demo init pack (.planning)",
      description:
        "Minimal XML + AGENTS.md + planning-config.toml for the RepoPlanner landing cockpit (read-only built-in).",
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
  console.error("[build-builtin-packs] no files — check public/init/");
  process.exitCode = 1;
} else {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
  console.log(
    `[build-builtin-packs] wrote ${payload.packs[0].files.length} file(s) -> ${path.relative(root, outFile)}`,
  );
}
