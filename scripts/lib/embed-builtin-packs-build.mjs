/**
 * Shared build for cockpit "builtin" embed packs JSON (init snapshot + optional docs folder).
 * Used by `planning pack embed-build` and host apps (e.g. portfolio prebuild).
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/** Default filenames collected from `.planning/` for the init pack. */
export const DEFAULT_INIT_FILENAMES = [
  "planning-config.toml",
  "STATE.xml",
  "TASK-REGISTRY.xml",
  "ROADMAP.xml",
  "DECISIONS.xml",
  "ERRORS-AND-ATTEMPTS.xml",
  "REQUIREMENTS.xml",
];

/**
 * @param {object} opts
 * @param {string} opts.planningDir - Absolute path to `.planning` (or equivalent)
 * @param {string[]} [opts.initFilenames]
 * @param {string | null} [opts.docsDir] - Folder of `.md` / `.mdx`; bodies only (front matter stripped)
 * @param {string} [opts.docsPathPrefix] - Virtual path prefix, e.g. `docs/repo-planner`
 */
export function buildEmbedBuiltinPacksPayload(opts) {
  const initFilenames = opts.initFilenames ?? DEFAULT_INIT_FILENAMES;
  const docsPathPrefix = (opts.docsPathPrefix ?? "docs/repo-planner").replace(/\/$/, "");

  const initFiles = [];
  if (opts.planningDir && fs.existsSync(opts.planningDir)) {
    for (const name of initFilenames) {
      const full = path.join(opts.planningDir, name);
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
      initFiles.push({
        path: `.planning/${name}`,
        content: fs.readFileSync(full, "utf8"),
      });
    }
  }

  const docsFiles = [];
  const docsDir = opts.docsDir;
  if (docsDir && fs.existsSync(docsDir)) {
    const skipDirs = new Set(["node_modules", ".git", "dist", ".next", "__pycache__"]);
    function walkDocs(absDir, relPrefix) {
      const entries = fs.readdirSync(absDir, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(absDir, ent.name);
        if (ent.isDirectory()) {
          if (skipDirs.has(ent.name)) continue;
          const nextRel = relPrefix ? `${relPrefix}/${ent.name}` : ent.name;
          walkDocs(full, nextRel);
          continue;
        }
        if (!ent.isFile()) continue;
        if (!ent.name.endsWith(".mdx") && !ent.name.endsWith(".md")) continue;
        const relFile = relPrefix ? `${relPrefix}/${ent.name}` : ent.name;
        const raw = fs.readFileSync(full, "utf8");
        const { content } = matter(raw);
        const outRel = relFile.replace(/\.mdx$/, ".md");
        docsFiles.push({
          path: `${docsPathPrefix}/${outRel}`,
          content: (content ?? "").trim() || "",
        });
      }
    }
    walkDocs(docsDir, "");
    docsFiles.sort((a, b) => a.path.localeCompare(b.path));
  }

  const packs = [];
  if (initFiles.length) {
    packs.push({
      id: "rp-builtin-init",
      label: "Init pack (.planning)",
      description:
        "Current monorepo .planning XML + planning-config (read-only snapshot for the cockpit).",
      files: initFiles,
    });
  }
  if (docsFiles.length) {
    packs.push({
      id: "rp-builtin-docs",
      label: "Repo Planner docs",
      description:
        "Planning-section MDX from this site, exported as markdown bodies for in-browser preview.",
      files: docsFiles,
    });
  }

  return {
    v: 1,
    generatedAt: new Date().toISOString(),
    packs,
  };
}

/**
 * @param {string} outFile - Absolute path to `builtin-packs.json`
 * @param {object} payload - From {@link buildEmbedBuiltinPacksPayload}
 */
export function writeEmbedBuiltinPacksFile(outFile, payload) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
}

/**
 * @param {object} opts
 * @param {string} opts.projectRoot - Repo root (for default `.planning`)
 * @param {string} [opts.planningDir] - Override; default `projectRoot/.planning`
 * @param {string | null} [opts.docsDir]
 * @param {string} [opts.docsPathPrefix]
 * @param {string[]} [opts.initFilenames]
 * @param {string} opts.outFile - Output JSON path (absolute)
 */
export function runPlanningEmbedBuildSync(opts) {
  const planningDir = opts.planningDir ?? path.join(opts.projectRoot, ".planning");
  const payload = buildEmbedBuiltinPacksPayload({
    planningDir,
    docsDir: opts.docsDir ?? null,
    docsPathPrefix: opts.docsPathPrefix,
    initFilenames: opts.initFilenames,
  });
  writeEmbedBuiltinPacksFile(opts.outFile, payload);
  return payload;
}

/**
 * @param {string} projectRoot
 * @param {string} outFile
 * @param {{ packs: { files: unknown[] }[] }} payload
 */
export function formatEmbedBuildLogLine(projectRoot, outFile, payload) {
  const nPacks = payload.packs.length;
  const nFiles = payload.packs.reduce((n, p) => n + (Array.isArray(p.files) ? p.files.length : 0), 0);
  const rel = path.relative(projectRoot, outFile);
  return `[planning pack embed-build] ${nPacks} pack(s), ${nFiles} file(s) -> ${rel}`;
}
