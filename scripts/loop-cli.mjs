#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { runPlanningEmbedBuildSync, formatEmbedBuildLogLine } from "./lib/embed-builtin-packs-build.mjs";
import { XMLParser } from "fast-xml-parser";
import TOML from "@iarna/toml";
import ejs from "ejs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getRepoPlannerPackageVersion() {
  try {
    const pkgPath = path.join(__dirname, "..", "package.json");
    return JSON.parse(readFileSync(pkgPath, "utf8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function getRoot() {
  if (global.__planningRoot) return global.__planningRoot;
  const argv = process.argv;
  const i = argv.indexOf("--root");
  if (i !== -1 && argv[i + 1]) {
    global.__planningRoot = path.resolve(process.cwd(), argv[i + 1]);
    return global.__planningRoot;
  }
  const envRoot = process.env.REPOPLANNER_PROJECT_ROOT;
  if (envRoot) {
    global.__planningRoot = path.resolve(process.cwd(), envRoot);
    return global.__planningRoot;
  }
  global.__planningRoot = path.resolve(process.cwd());
  return global.__planningRoot;
}
function getPlanningDir() {
  return path.join(getRoot(), ".planning");
}
function getPhasesDir() {
  return path.join(getPlanningDir(), "phases");
}
/** Default `.planning/reports`; override with `REPOPLANNER_REPORTS_DIR` (absolute or relative to project root) to keep `.planning/` free of telemetry/report files. */
function getReportsDir() {
  const raw = process.env.REPOPLANNER_REPORTS_DIR?.trim();
  if (raw) {
    return path.isAbsolute(raw) ? raw : path.join(getRoot(), raw);
  }
  return path.join(getPlanningDir(), "reports");
}
function getTemplatesDir() {
  return path.join(getPlanningDir(), "templates");
}
function getConfigPath() {
  return path.join(getPlanningDir(), "planning-config.toml");
}

const ROOT = getRoot();
const PLANNING_DIR = getPlanningDir();
const PHASES_DIR = getPhasesDir();
const TEMPLATES_DIR = getTemplatesDir();
const CONFIG_PATH = getConfigPath();
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

/** Versioned format for the agent loop bundle. No single industry standard; MCP is for tools. We use planning-agent-context so consumers can validate. */
const AGENT_LOOP_BUNDLE_FORMAT = "planning-agent-context/1.0";

const VIEWER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"><title>Planning Report</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>body{font-family:system-ui,sans-serif;max-width:900px;margin:1rem auto;padding:0 1rem;} pre{overflow:auto;} table{border-collapse:collapse;} th,td{border:1px solid #ccc;padding:4px 8px;} .mermaid{background:#f8f8f8;padding:1rem;margin:1rem 0;}</style>
</head>
<body>
  <p><label>Report: <select id="sel"><option value="latest.md">latest.md</option></select></label> <button id="load">Load</button> <button id="regen">Regenerate</button></p>
  <div id="out"></div>
  <script>
    mermaid.initialize({ startOnLoad: false });
    const out = document.getElementById('out');
    const sel = document.getElementById('sel');
    const params = new URLSearchParams(location.search);
    async function render(md){
      const html = (typeof marked !== 'undefined' ? marked.parse(md || '') : md || '');
      out.innerHTML = html;
      const mermaidCodes = out.querySelectorAll('code.language-mermaid');
      const mermaidDivs = [];
      mermaidCodes.forEach((el)=>{
        const parent = el.parentElement; // <pre>
        const div = document.createElement('div');
        div.className = 'mermaid';
        div.textContent = el.textContent;
        parent.replaceWith(div);
        mermaidDivs.push(div);
      });
      if (mermaidDivs.length) {
        try { await mermaid.run({ nodes: mermaidDivs }); } catch(e) {
          mermaidDivs.forEach(d => { d.innerHTML = '<pre>'+d.textContent+'</pre><p>Mermaid error: '+e.message+'</p>'; });
        }
      }
    }
    let lastFetched = '';
    function load(name, refresh){ const url = (name||sel.value) + (refresh ? '?refresh=1' : ''); fetch(url).then(r=>r.text()).then(md=>{ lastFetched=md; render(md); }).catch(e=>out.innerHTML='<p>Failed to load: '+e.message+'</p>'); }
    function poll(){
      const name = sel.value;
      if (!name) return;
      fetch(name).then(r=>r.text()).then(md=>{ if (md && md !== lastFetched) { lastFetched=md; render(md); } }).catch(()=>{});
    }
    fetch('list').then(r=>r.json()).then(files=>{
      sel.innerHTML = files.map(f=>'<option value="'+f+'">'+f+'</option>').join('');
      const want = params.get('report') || 'latest.md';
      if (files.includes(want)) sel.value=want; else if (files.length) sel.value=files[0];
      load(sel.value, true);
      setInterval(poll, 3000);
    }).catch(()=>{ load(sel.value, true); setInterval(poll, 3000); });
    sel.addEventListener('change', ()=>load(sel.value, false));
    document.getElementById('load').onclick = ()=>load(sel.value, true);
    document.getElementById('regen').onclick = ()=>{ fetch('regenerate').then(()=>load(sel.value)).catch(e=>out.innerHTML='<p>Regenerate failed: '+e.message+'</p>'); };
  </script>
</body>
</html>`;

function ensureArray(x) {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

async function getConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const parsed = TOML.parse(raw);
    const planning = parsed.planning ?? {};
    const profiles = parsed.profiles ?? { human: { description: "Default human view." }, agent: { description: "Agent perspective; defaultJson = true.", defaultJson: true } };
    return {
      sprintSize: planning.sprintSize ?? 5,
      currentProfile: planning.currentProfile ?? "human",
      conventionsPaths: ensureArray(planning.conventionsPaths).length ? ensureArray(planning.conventionsPaths) : ["AGENTS.md"],
      codeContextPaths: ensureArray(planning.codeContextPaths ?? []),
      profiles,
    };
  } catch {
    return {
      sprintSize: 5,
      currentProfile: "human",
      conventionsPaths: ["AGENTS.md"],
      codeContextPaths: [],
      profiles: { human: { description: "Default human view." }, agent: { description: "Agent perspective.", defaultJson: true } },
    };
  }
}

async function setConfig(updates) {
  const config = await getConfig();
  const planning = {
    sprintSize: updates.sprintSize ?? config.sprintSize,
    currentProfile: updates.currentProfile ?? config.currentProfile,
    conventionsPaths: updates.conventionsPaths ?? config.conventionsPaths,
    codeContextPaths: updates.codeContextPaths ?? config.codeContextPaths,
  };
  const profiles = updates.profiles ?? config.profiles;
  const toml = TOML.stringify({ planning, profiles });
  await fs.writeFile(CONFIG_PATH, toml, "utf8");
  return { ...config, ...planning, profiles };
}

async function loadState() {
  const p = path.join(PLANNING_DIR, "STATE.xml");
  const xml = await readIfExists(p);
  if (!xml) return null;
  const obj = parser.parse(xml);
  const state = obj?.state ?? obj;
  const registry = state["agent-registry"];
  const agents = registry?.agent != null ? ensureArray(registry.agent) : [];
  return {
    currentPhase: state["current-phase"] ?? "",
    currentPlan: state["current-plan"] ?? "",
    status: state["status"] ?? "",
    nextAction: state["next-action"] ?? "",
    agents: agents.map((a) => ({
      id: a["@_id"] ?? "",
      name: a.name ?? "",
      phase: a.phase ?? "",
      plan: a.plan ?? "",
      status: a.status ?? "",
      since: a.since ?? "",
    })),
    raw: state,
  };
}

async function loadTaskRegistry() {
  const p = path.join(PLANNING_DIR, "TASK-REGISTRY.xml");
  const xml = await readIfExists(p);
  if (!xml) return null;
  const obj = parser.parse(xml);
  const reg = obj["task-registry"] ?? obj;
  const phases = ensureArray(reg.phase ?? []);
  const tasks = [];
  for (const ph of phases) {
    const phaseId = String(ph["@_id"] ?? "").padStart(2, "0");
    const phaseTasks = ensureArray(ph.task ?? []);
    for (const t of phaseTasks) {
      const goal = t.goal ?? "";
      const keywords = t.keywords ?? "";
      const commands = t.commands?.command != null ? ensureArray(t.commands.command) : [];
      tasks.push({
        id: t["@_id"] ?? "",
        agentId: t["@_agent-id"] ?? "",
        status: t["@_status"] ?? "",
        phase: phaseId,
        goal: typeof goal === "string" ? goal : (goal["#text"] ?? ""),
        keywords: typeof keywords === "string" ? keywords : (keywords["#text"] ?? ""),
        commands,
      });
    }
  }
  return { tasks, phases };
}

async function loadRoadmap() {
  const p = path.join(PLANNING_DIR, "ROADMAP.xml");
  const xml = await readIfExists(p);
  if (!xml) return null;
  const obj = parser.parse(xml);
  const road = obj.roadmap ?? obj;
  const phaseList = ensureArray(road.phase ?? []);
  const phases = phaseList.map((ph) => {
    const goal = ph.goal ?? "";
    return {
      id: String(ph["@_id"] ?? "").padStart(2, "0"),
      title: ph.title ?? "",
      goal: typeof goal === "string" ? goal : (goal["#text"] ?? ""),
      status: ph.status ?? "",
      depends: ph.depends ?? "",
      plans: ph.plans ?? "",
    };
  });
  return phases.sort((a, b) => Number(a.id) - Number(b.id));
}

function getSprintPhaseIds(roadmapPhases, sprintSize, sprintIndex) {
  const start = sprintIndex * sprintSize;
  return roadmapPhases.slice(start, start + sprintSize).map((p) => p.id);
}

/** Compute items that need review: phases at 0%, unassigned tasks, phases with only planned work. */
function computeReviewItems(reg, roadmap) {
  const phaseIdToTitle = Object.fromEntries((roadmap ?? []).map((p) => [p.id, p.title || p.id]));
  const progress = computeProgress(reg?.tasks ?? []);
  const phasesAtZero = [];
  const unassignedTasks = [];
  const phasesOnlyPlanned = [];

  for (const [phaseId, phaseTasks] of progress.byPhase.entries()) {
    const done = phaseTasks.filter((t) => t.status === "done").length;
    const total = phaseTasks.length;
    if (total === 0) continue;
    const pct = total ? Math.round((done / total) * 100) : 0;
    if (pct === 0) {
      phasesAtZero.push({
        phaseId,
        title: phaseIdToTitle[phaseId] || phaseId,
        total,
        taskIds: phaseTasks.map((t) => t.id),
        suggestion: "Phase may be skipped or abandoned; consider assigning work or closing/superseding tasks.",
      });
    }
    const openInPhase = phaseTasks.filter((t) => t.status !== "done");
    if (openInPhase.length > 0 && openInPhase.every((t) => (t.status || "").toLowerCase() === "planned")) {
      phasesOnlyPlanned.push({
        phaseId,
        title: phaseIdToTitle[phaseId] || phaseId,
        taskIds: openInPhase.map((t) => t.id),
        suggestion: "No task in progress; may need prioritization or an agent to claim work.",
      });
    }
  }

  for (const t of reg?.tasks ?? []) {
    if (t.status === "done") continue;
    const aid = (t.agentId || "").trim();
    if (!aid || aid === "agent-##" || /^agent-#+$/i.test(aid)) {
      unassignedTasks.push({
        id: t.id,
        phase: t.phase,
        status: t.status,
        goal: (t.goal || "").slice(0, 80),
        suggestion: "Task has no real agent assigned; assign or use agent-## as placeholder until claimed.",
      });
    }
  }

  return {
    phasesAtZero,
    unassignedTasks,
    phasesOnlyPlanned,
    summary: {
      phasesAtZeroCount: phasesAtZero.length,
      unassignedCount: unassignedTasks.length,
      phasesOnlyPlannedCount: phasesOnlyPlanned.length,
    },
  };
}

/** Format review items as plain text (same as CLI stdout). Used by planning review and report code block. */
function formatReviewLines(review) {
  if (!review) return "Nothing to review.";
  const { phasesAtZero, unassignedTasks, phasesOnlyPlanned, summary } = review;
  if (summary.phasesAtZeroCount === 0 && summary.unassignedCount === 0 && summary.phasesOnlyPlannedCount === 0) {
    return "Nothing to review.";
  }
  const lines = [];
  lines.push("Phases at 0% progress (e.g. 46: 0/1, 49: 0/1) or unassigned tasks may be skipped or abandoned. Use planning review to list them; planning review --json to output data for tools or APIs.");
  lines.push("");
  if (phasesAtZero.length > 0) {
    lines.push("Phases at 0% (skipped/abandoned?)");
    lines.push("");
    lines.push("Phase\tTitle\tTasks\tSuggestion");
    for (const p of phasesAtZero) {
      lines.push(`${p.phaseId}\t${p.title}\t${p.taskIds.join(", ")}\t${p.suggestion}`);
    }
    lines.push("");
  }
  if (unassignedTasks.length > 0) {
    lines.push("Unassigned tasks (agent-## or empty)");
    lines.push("");
    lines.push("Task\tPhase\tStatus\tSuggestion");
    for (const t of unassignedTasks.slice(0, 25)) {
      lines.push(`${t.id}\t${t.phase}\t${t.status}\t${t.suggestion}`);
    }
    if (unassignedTasks.length > 25) lines.push("… and " + (unassignedTasks.length - 25) + " more (use --json for full list)");
    lines.push("");
  }
  if (phasesOnlyPlanned.length > 0) {
    lines.push("Phases with only planned work (no in-progress)");
    lines.push("");
    lines.push("Phase\tTitle\tTasks\tSuggestion");
    for (const p of phasesOnlyPlanned) {
      lines.push(`${p.phaseId}\t${p.title}\t${p.taskIds.join(", ")}\t${p.suggestion}`);
    }
  }
  return lines.join("\n");
}

/** Load convention docs (AGENTS.md, etc.) so we always serve them to agents using the loop. */
async function loadConventions(config) {
  const paths = ensureArray(config?.conventionsPaths ?? ["AGENTS.md"]);
  const out = [];
  for (const rel of paths) {
    const full = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
    const content = await readIfExists(full);
    if (content != null) out.push({ path: rel, content });
  }
  return out;
}

/** Extract repo-relative file/dir paths from task command strings (e.g. rg paths, --dir paths). */
function extractCodeFileReferencesFromTasks(tasks) {
  const seen = new Set();
  const out = [];
  const pathLike = /(?:^|[\s'"([,])((?:docs-site|packages|scripts)[\w./-]*(?:\.[a-z]+)?)(?:[\s'")\],]|$)/g;
  const pathLike2 = /(?:^|[\s])([\w.-]+\/[\w./-]+\.(?:tsx?|js|mjs|json|md))(?:[\s]|$)/g;
  for (const task of tasks ?? []) {
    for (const cmd of ensureArray(task.commands ?? [])) {
      const s = String(cmd);
      let m;
      pathLike.lastIndex = 0;
      while ((m = pathLike.exec(s)) !== null) {
        const p = m[1].trim();
        if (p && !seen.has(p)) {
          seen.add(p);
          out.push(p);
        }
      }
      pathLike2.lastIndex = 0;
      while ((m = pathLike2.exec(s)) !== null) {
        const p = m[1].trim();
        if (p && !seen.has(p)) {
          seen.add(p);
          out.push(p);
        }
      }
    }
  }
  return [...new Set(out)].sort();
}

/** Short path for snapshot: last 2 segments if long (e.g. docs-site/app/foo/page.tsx -> app/foo/page.tsx or foo/page.tsx). */
function shortPath(p, maxSegments = 2) {
  if (!p || p.includes(".planning")) return "";
  const segs = p.replace(/\\/g, "/").split("/").filter(Boolean);
  if (segs.length <= maxSegments) return p;
  return segs.slice(-maxSegments).join("/");
}

/** Per-phase code/doc file refs from task commands (no planning docs). For similarity section: "files likely in mind". */
function getPhaseFileRefs(phaseId, reg, maxPerPhase = 8) {
  const phaseIdPadded = String(phaseId).padStart(2, "0");
  const tasks = (reg?.tasks ?? []).filter((t) => (t.phase || "").padStart(2, "0") === phaseIdPadded);
  const raw = extractCodeFileReferencesFromTasks(tasks);
  const filtered = raw.filter((p) => !p.includes(".planning") && !/STATE|TASK-REGISTRY|ROADMAP|DECISIONS|REQUIREMENTS/i.test(p));
  return filtered.slice(0, maxPerPhase).map((p) => shortPath(p));
}

/** Rough token estimate: ~4 chars per token for English/code. */
function estimateTokens(text) {
  if (typeof text !== "string") return 0;
  return Math.ceil(text.length / 4);
}

async function getReferencesDocStats() {
  const p = path.join(PLANNING_DIR, "REQUIREMENTS.xml");
  const xml = await readIfExists(p);
  if (!xml) return null;
  const docRegex = /<doc>\s*<path>([^<]*)<\/path>\s*<content><!\[CDATA\[([\s\S]*?)\]\]><\/content>/g;
  const docs = [];
  let match;
  while ((match = docRegex.exec(xml)) !== null) {
    const content = match[2] ?? "";
    docs.push({ path: match[1], chars: content.length, tokens: estimateTokens(content) });
  }
  const totalChars = docs.reduce((s, d) => s + d.chars, 0);
  const totalTokens = docs.reduce((s, d) => s + d.tokens, 0);
  return { docs, totalChars, totalTokens };
}

async function loadOpenQuestions(opts = {}) {
  const includeClosed = opts.all === true;
  const phaseFilter = opts.phase != null ? String(opts.phase).padStart(2, "0") : null;
  const results = [];
  const phaseDirs = await fs.readdir(PHASES_DIR, { withFileTypes: true }).catch(() => []);
  for (const d of phaseDirs) {
    if (!d.isDirectory()) continue;
    const phaseDirPath = path.join(PHASES_DIR, d.name);
    const phaseNum = d.name.match(/^(\d+)-/)?.[1];
    const phaseId = phaseNum != null ? phaseNum.padStart(2, "0") : null;
    if (phaseFilter != null && phaseId !== phaseFilter) continue;
    const files = await fs.readdir(phaseDirPath, { withFileTypes: true }).catch(() => []);
    for (const f of files) {
      if (!f.isFile() || !f.name.endsWith("-PLAN.xml")) continue;
      const xml = await readIfExists(path.join(phaseDirPath, f.name));
      if (!xml) continue;
      try {
        const obj = parser.parse(xml);
        const plan = obj["phase-plan"] ?? obj;
        const questions = plan.questions?.question != null ? ensureArray(plan.questions.question) : [];
        const planId = plan.meta?.["phase-id"] ?? f.name.replace(/-PLAN\.xml$/i, "");
        const out = [];
        for (const q of questions) {
          const status = (q["@_status"] ?? q.status ?? "open").toLowerCase();
          const raw = q["#text"];
          const text = (typeof raw === "string" ? raw : "").trim() || (typeof q === "string" ? q : "").trim() || "(no text)";
          const id = q["@_id"] ?? q.id ?? "";
          if (!includeClosed && status !== "open") continue;
          out.push({ id, status, text });
        }
        if (out.length || includeClosed) results.push({ phaseId: phaseId ?? planId, planFile: f.name, planPath: path.relative(ROOT, path.join(phaseDirPath, f.name)), questions: out });
      } catch {
        // skip malformed
      }
    }
  }
  return results.sort((a, b) => (a.phaseId || "").localeCompare(b.phaseId || ""));
}

async function loadPlansExecution(opts = {}) {
  const phaseFilter = opts.phase != null ? String(opts.phase).padStart(2, "0") : null;
  const onlyUnran = opts.unran === true;
  const onlyRan = opts.ran === true;
  const results = [];
  const phaseDirs = await fs.readdir(PHASES_DIR, { withFileTypes: true }).catch(() => []);
  for (const d of phaseDirs) {
    if (!d.isDirectory()) continue;
    const phaseNum = d.name.match(/^(\d+)-/)?.[1];
    const phaseId = phaseNum != null ? phaseNum.padStart(2, "0") : null;
    if (phaseFilter != null && phaseId !== phaseFilter) continue;
    const dirPath = path.join(PHASES_DIR, d.name);
    const files = await fs.readdir(dirPath, { withFileTypes: true }).catch(() => []);
    const planFiles = files.filter((f) => f.isFile() && f.name.endsWith("-PLAN.xml"));
    const plans = [];
    for (const f of planFiles) {
      const planId = f.name.replace(/-PLAN\.xml$/i, "");
      const summaryPath = path.join(dirPath, `${planId}-SUMMARY.xml`);
      const executed = await fs.access(summaryPath).then(() => true).catch(() => false);
      if (onlyUnran && executed) continue;
      if (onlyRan && !executed) continue;
      plans.push({ planId, planFile: f.name, summaryFile: executed ? `${planId}-SUMMARY.xml` : null, executed });
    }
    if (plans.length) results.push({ phaseId, phaseDir: d.name, plans });
  }
  return results.sort((a, b) => (a.phaseId || "").localeCompare(b.phaseId || ""));
}

async function getPhaseDirTokenStats(phaseId) {
  const phaseIdPadded = String(phaseId).padStart(2, "0");
  const entries = await fs.readdir(PHASES_DIR, { withFileTypes: true }).catch(() => []);
  const dir = entries.find((e) => e.isDirectory() && e.name.startsWith(phaseIdPadded + "-"));
  if (!dir) return { phaseId: phaseIdPadded, files: [], totalTokens: 0, totalChars: 0 };
  const dirPath = path.join(PHASES_DIR, dir.name);
  const files = await fs.readdir(dirPath, { withFileTypes: true }).catch(() => []);
  const stats = [];
  let totalChars = 0;
  for (const f of files) {
    if (!f.isFile()) continue;
    const fp = path.join(dirPath, f.name);
    const content = await readIfExists(fp) ?? "";
    const chars = content.length;
    totalChars += chars;
    stats.push({ file: f.name, chars, tokens: estimateTokens(content) });
  }
  return { phaseId: phaseIdPadded, dir: dir.name, files: stats, totalChars, totalTokens: Math.ceil(totalChars / 4) };
}

const PHASE_CONTEXT_MAX_CHARS = 2500;

/** Get a single text blob per phase for embedding: title + phase dir file contents + task goals. Capped for speed. */
async function getPhaseContextText(phaseId, roadmap = [], reg = null) {
  const phaseIdPadded = String(phaseId).padStart(2, "0");
  const title = (roadmap.find((p) => p.id === phaseIdPadded) || {}).title || phaseIdPadded;
  const parts = [title];
  const entries = await fs.readdir(PHASES_DIR, { withFileTypes: true }).catch(() => []);
  const dir = entries.find((e) => e.isDirectory() && e.name.startsWith(phaseIdPadded + "-"));
  if (dir) {
    const dirPath = path.join(PHASES_DIR, dir.name);
    const files = await fs.readdir(dirPath, { withFileTypes: true }).catch(() => []);
    for (const f of files) {
      if (!f.isFile() || (!f.name.endsWith(".xml") && !f.name.endsWith(".md"))) continue;
      const content = await readIfExists(path.join(dirPath, f.name)) ?? "";
      const text = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (text.length) parts.push(text);
    }
  }
  const phaseTasks = (reg?.tasks ?? []).filter((t) => (t.phase || "").padStart(2, "0") === phaseIdPadded);
  for (const t of phaseTasks) {
    const g = (t.goal || "").trim();
    if (g) parts.push(g);
  }
  let out = parts.join(" ");
  out = out.replace(/\s+/g, " ").trim();
  if (out.length > PHASE_CONTEXT_MAX_CHARS) out = out.slice(0, PHASE_CONTEXT_MAX_CHARS);
  return out;
}

/** Normalize vector in place; return magnitude. */
function normalizeVec(v) {
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return n;
}

/** Compute pairwise cosine similarity (0–1) and return as percentage. Optional: requires fastembed. */
async function computePhaseSimilarity(phaseIds, roadmap, reg) {
  if (!phaseIds || phaseIds.length < 2) return [];
  let FlagEmbedding;
  let EmbeddingModel;
  try {
    const mod = await import("fastembed");
    FlagEmbedding = mod.FlagEmbedding;
    EmbeddingModel = mod.EmbeddingModel;
    if (!FlagEmbedding) return null;
  } catch (e) {
    return null;
  }
  const texts = [];
  for (const id of phaseIds) {
    const t = await getPhaseContextText(id, roadmap, reg);
    texts.push(t || "(no context)");
  }
  const model = await FlagEmbedding.init({ model: EmbeddingModel.BGESmallENV15 });
  const vecs = [];
  const stream = model.embed(texts, Math.min(8, texts.length));
  for await (const batch of stream) {
    for (const row of batch) vecs.push([...row]);
  }
  if (vecs.length !== texts.length) return null;
  vecs.forEach(normalizeVec);
  const pairs = [];
  for (let i = 0; i < phaseIds.length; i++) {
    for (let j = i + 1; j < phaseIds.length; j++) {
      const a = vecs[i];
      const b = vecs[j];
      let dot = 0;
      for (let k = 0; k < a.length; k++) dot += a[k] * b[k];
      const pct = Math.round(Math.max(0, Math.min(1, dot)) * 100);
      pairs.push({ a: phaseIds[i], b: phaseIds[j], pct });
    }
  }
  return pairs;
}

/** Build KPIs for the report: token usage, context tokens per sprint phase, PRD totals. */
async function buildReportKpis() {
  const kpis = { prd: null, sprint: null };
  const refStats = await getReferencesDocStats();
  if (refStats) kpis.prd = { totalChars: refStats.totalChars, totalTokens: refStats.totalTokens, docs: refStats.docs };
  const config = await getConfig();
  const roadmap = await loadRoadmap();
  const state = await loadState();
  const reg = await loadTaskRegistry();
  if (roadmap?.length) {
    const size = config.sprintSize ?? 5;
    let k = state?.currentPhase
      ? (() => {
          const idx = roadmap.findIndex((p) => p.id === state.currentPhase || String(state.currentPhase).padStart(2, "0") === p.id);
          return idx >= 0 ? Math.floor(idx / size) : 0;
        })()
      : 0;
    const phaseIds = getSprintPhaseIds(roadmap, size, k);
    const phases = roadmap.filter((p) => phaseIds.includes(p.id));
    const tasksInSprint = (reg?.tasks ?? []).filter((t) => phaseIds.includes(t.phase));
    const phaseDirStats = [];
    for (const ph of phaseIds) {
      phaseDirStats.push(await getPhaseDirTokenStats(ph));
    }
    const sprintTokens = phaseDirStats.reduce((s, st) => s + st.totalTokens, 0);
    const taskTextTokens = tasksInSprint.reduce((s, t) => s + estimateTokens((t.goal || "") + (t.keywords || "")), 0);
    kpis.sprint = {
      sprintIndex: k,
      phaseIds,
      phases: phases.map((p) => ({ id: p.id, title: p.title, status: p.status })),
      taskCount: tasksInSprint.length,
      taskTextTokens,
      phaseDirs: phaseDirStats.map((st) => ({ phaseId: st.phaseId, dir: st.dir, totalTokens: st.totalTokens, totalChars: st.totalChars })),
      sprintTotalTokens: sprintTokens + taskTextTokens,
    };
  }
  return kpis;
}

/** Build system health metrics for tracking and display (tasks, questions, agents, errors). */
async function buildSystemMetrics() {
  const state = await loadState();
  const reg = await loadTaskRegistry();
  const roadmap = await loadRoadmap();
  const openQuestions = await loadOpenQuestions({});
  const tasks = reg?.tasks ?? [];
  const tasksTotal = tasks.length;
  const tasksDone = tasks.filter((t) => t.status === "done").length;
  const tasksOpen = tasksTotal - tasksDone;
  const completionRate = tasksTotal ? Math.round((tasksDone / tasksTotal) * 100) : 0;
  const openQuestionsCount = openQuestions.reduce((s, r) => s + (r.questions?.length ?? 0), 0);
  const activeAgentsCount = (state?.agents ?? []).filter((a) => {
    const status = (a.status || "").toLowerCase();
    return status === "in-progress" || status === "in_progress" || status === "active";
  }).length;
  const phaseIdsWithTasks = [...new Set(tasks.map((t) => String(t.phase || "").padStart(2, "0")).filter(Boolean))];
  const phasesComplete = (roadmap ?? []).filter((p) => p.status === "Complete" || (p.status || "").toLowerCase() === "complete").length;
  const phasesTotal = (roadmap ?? []).length;
  let errorsAttemptsCount = 0;
  const errorsPath = path.join(PLANNING_DIR, "ERRORS-AND-ATTEMPTS.xml");
  const errorsXml = await readIfExists(errorsPath);
  if (errorsXml) {
    try {
      const obj = parser.parse(errorsXml);
      const root = obj["errors-and-attempts"] ?? obj;
      const attempts = root.attempt != null ? ensureArray(root.attempt) : [];
      errorsAttemptsCount = attempts.length;
    } catch {
      // ignore
    }
  }
  const review = computeReviewItems(reg, roadmap);
  return {
    at: new Date().toISOString(),
    tasksTotal,
    tasksDone,
    tasksOpen,
    completionRate,
    openQuestionsCount,
    activeAgentsCount,
    phasesWithTasks: phaseIdsWithTasks.length,
    phasesTotal,
    phasesComplete,
    errorsAttemptsCount,
    review: {
      phasesAtZeroCount: review?.summary?.phasesAtZeroCount ?? 0,
      unassignedCount: review?.summary?.unassignedCount ?? 0,
      phasesOnlyPlannedCount: review?.summary?.phasesOnlyPlannedCount ?? 0,
    },
  };
}

/** Format KPIs as plain text (same as CLI stdout); used by planning kpis and report code block. */
function formatKpisLines(kpis) {
  const lines = [];
  if (!kpis || (!kpis.prd && !kpis.sprint)) {
    return "No PRD or sprint data available (REQUIREMENTS.xml or ROADMAP.xml missing).";
  }
  if (kpis.prd) {
    lines.push("PRD / REQUIREMENTS.xml");
    lines.push(`Total chars: ${kpis.prd.totalChars} · tokens ≈ ${kpis.prd.totalTokens}`);
    lines.push("");
  }
  if (kpis.sprint) {
    lines.push(`Sprint ${kpis.sprint.sprintIndex} (phases: ${kpis.sprint.phaseIds.join(", ")})`);
    lines.push(`Task count: ${kpis.sprint.taskCount} · task-text tokens ≈ ${kpis.sprint.taskTextTokens}`);
    lines.push("Context tokens per phase (phase dirs):");
    lines.push("");
    for (const pd of kpis.sprint.phaseDirs) {
      lines.push(`${pd.phaseId} (${pd.dir}): ≈ ${pd.totalTokens} tokens (${pd.totalChars} chars)`);
    }
    lines.push("");
    lines.push(`Sprint total (phase dirs + task text): ≈ ${kpis.sprint.sprintTotalTokens} tokens`);
  }
  return lines.join("\n");
}

function escapeCdata(text) {
  return text.replaceAll("]]>", "]]]]><![CDATA[>");
}

async function writeXml(filePath, content) {
  await fs.writeFile(filePath, content, "utf8");
}

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

/** RepoPlanner package root (contains `.planning/templates`). */
function getRepoPlannerPackageRoot() {
  return path.resolve(__dirname, "..");
}

async function pathExists(p) {
  return fs.access(p).then(() => true).catch(() => false);
}

/** Prefer submodule CLI hint when present; else standalone RepoPlanner clone. */
async function resolvePlanningCliInvokeHint() {
  const vendorCli = path.join(ROOT, "vendor", "repo-planner", "scripts", "loop-cli.mjs");
  if (await pathExists(vendorCli)) return "node vendor/repo-planner/scripts/loop-cli.mjs";
  const rootCli = path.join(ROOT, "scripts", "loop-cli.mjs");
  if (await pathExists(rootCli)) return "node scripts/loop-cli.mjs";
  return "node vendor/repo-planner/scripts/loop-cli.mjs";
}

const INIT_PHASE_DIR = "01-greenfield";
const INIT_PLAN_ID = "01-01";

async function writePlanningBootstrapFile(relPath, content, force) {
  const full = path.join(PLANNING_DIR, relPath);
  if (!force && (await pathExists(full))) return { relPath, skipped: true };
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, "utf8");
  return { relPath, skipped: false };
}

async function writeRepoRootFileIfMissing(relPath, content) {
  const full = path.join(ROOT, relPath);
  if (await pathExists(full)) return { relPath, skipped: true };
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, "utf8");
  return { relPath, skipped: false };
}

/** If repo root is missing narrative files, copy from `.planning/*.md` before those paths are removed. */
async function migrateNarrativeMdFromDotPlanningToRoot() {
  const pReq = path.join(PLANNING_DIR, "REQUIREMENTS.md");
  const rReq = path.join(ROOT, "REQUIREMENTS.md");
  if ((await pathExists(pReq)) && !(await pathExists(rReq))) {
    await fs.copyFile(pReq, rReq);
    console.log("migrate  .planning/REQUIREMENTS.md → REQUIREMENTS.md (repo root)");
  }
}

/** Minimal layout: no narrative `REQUIREMENTS.md` or `reports/` inside `.planning/` (root `REQUIREMENTS.md` only). */
async function pruneDotPlanningNarrativeAndReports() {
  await fs.rm(path.join(PLANNING_DIR, "reports"), { recursive: true, force: true }).catch(() => {});
  await fs.rm(path.join(PLANNING_DIR, "REQUIREMENTS.md"), { force: true }).catch(() => {});
  await fs.rm(path.join(PLANNING_DIR, "IMPLEMENTATION_PLAN.md"), { force: true }).catch(() => {});
}

/** Rich `.planning/AGENTS.md`: roadmap + task registry as execution truth; atoms/molecules/organisms; CLI optional. */
function getMinimalPlanningAgentsMd() {
  return [
    "# `.planning/AGENTS.md` — planning for agents (roadmap-first)",
    "",
    "Companion to **repository root** `AGENTS.md`. **You do not need the planning CLI** for day-to-day work: edit **`REQUIREMENTS.md`**, **`.planning/ROADMAP.xml`**, **`.planning/TASK-REGISTRY.xml`**, **`.planning/STATE.xml`**, and **section** `task-registry.mdx` in git. The **Repo Planner cockpit** (e.g. `/docs/tools/repo-planner`) is for **analysis and UI-side editing**; see site docs **Repo Planner → Integration** for product direction (multi-project, packs, local persistence).",
    "",
    "## Trigger phrases → what to do",
    "",
    "| User says (examples) | Your first reads | Then |",
    "| --- | --- | --- |",
    "| *Plan this*, *break this down*, *roadmap this* | Root `REQUIREMENTS.md`, `.planning/ROADMAP.xml`, `.planning/TASK-REGISTRY.xml` | Extend **roadmap** phases / goals; add or split **tasks**; align narrative tables in `REQUIREMENTS.md` |",
    "| *What's next?*, *what should I work on?* | `STATE.xml` (`next-action`), `TASK-REGISTRY.xml` (first non-`done` task), relevant section **task-registry.mdx** | Pick **one** task; implement; set task **`done`** in XML or section registry; refresh `next-action` |",
    "| *Planning docs*, *planning loop*, *Ralph loop* | Root `AGENTS.md`, then **this file** | Read state → one task → verify (root `AGENTS.md` gates) → commit doc changes |",
    "| *Requirements*, *scope*, *PRD* | Root `REQUIREMENTS.md` | Edit narrative; stub `.planning/REQUIREMENTS.xml` optional for XML-only tools |",
    "| *Decisions*, *ADRs* | `.planning/DECISIONS.xml` | Append **Decision** atoms |",
    "",
    "## Where truth lives",
    "",
    "| Artifact | Path | Role |",
    "| --- | --- | --- |",
    "| Narrative + cross-cutting checklist | Repo root `REQUIREMENTS.md` (incl. **Cross-cutting queue** section) | **What** to build; roadmap **tables**; pointers to section registries |",
    "| **Phase timeline** | `.planning/ROADMAP.xml` | **When / at what altitude** — phase goals, `status`, `depends` |",
    "| **Task graph** | `.planning/TASK-REGISTRY.xml` | **Units of work** — `goal`, `keywords`, `commands`, `@_status` |",
    "| **Current pointer** | `.planning/STATE.xml` | `current-phase`, `next-action`, optional `agent-registry` |",
    "| Decisions | `.planning/DECISIONS.xml` | **Decision** atoms |",
    "| Section work | `apps/portfolio/content/docs/<section>/task-registry.mdx` | **Authoritative ids** per product area |",
    "| Playbook | **This file** | Atoms / molecules / organisms + XML patterns |",
    "",
    "There is **no** `IMPLEMENTATION_PLAN.md`. Shipped vs planned history belongs in **`REQUIREMENTS.md`** tables, **section registries**, and task **`done`** status — not a second markdown queue file.",
    "",
    "---",
    "",
    "## Atoms — smallest planning units",
    "",
    "| Atom | Meaning | In Markdown (typical) |",
    "| --- | --- | --- |",
    "| **Goal** | Outcome; success criteria | H3 or table **Goal** column |",
    "| **Scope** | In/out | **Scope** / **Non-goals** bullets |",
    "| **File** | Path + note | **Files** list |",
    "| **Command** | Verify | **Verification** — `pnpm run build`, `pnpm run lint`, etc. |",
    "| **Decision** | Choice + impact | `DECISIONS.xml` or dated **Decision:** line in `REQUIREMENTS.md` **Notes** |",
    "| **Keyword** | Tags | **Keywords:** |",
    "| **Task** | Work unit + status | `TASK-REGISTRY.xml` `<task>` or section registry row |",
    "| **Verification** | Proof | Same as **Command** / gates in root `AGENTS.md` |",
    "| **Reference** | Link | MDX / URL |",
    "",
    "## Molecules — composed blocks",
    "",
    "| Molecule | Example section |",
    "| --- | --- |",
    "| **FilesBlock** | `## Files touched` |",
    "| **CommandsBlock** | `## Verification` |",
    "| **DecisionsBlock** | `## Decisions` |",
    "| **TasksBlock** | `## Tasks` |",
    "| **KeywordsBlock** | `**Keywords:**` |",
    "",
    "## Organisms — document shapes",
    "",
    "| Organism | Maps to |",
    "| --- | --- |",
    "| **PlanDocument** | `REQUIREMENTS.md` subsection + `TASK-REGISTRY.xml` tasks |",
    "| **SummaryDocument** | Short **Verification** note after a task; optional dated line in `REQUIREMENTS.md` |",
    "| **RoadmapDocument** | `ROADMAP.xml` + roadmap tables in `REQUIREMENTS.md` |",
    "",
    "---",
    "",
    "## `REQUIREMENTS.md` — use for",
    "",
    "- **H2** per domain; roadmap **tables** (Phase / Scope / Status / Notes).",
    "- **Cross-cutting queue** — checkbox items that are not worth a full `TASK-REGISTRY` task yet.",
    "- Links to `apps/portfolio/content/docs/<section>/task-registry.mdx`.",
    "",
    "## `TASK-REGISTRY.xml` — example",
    "",
    "```xml",
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<task-registry>",
    "  <phase id=\"01\">",
    "    <task id=\"01-01\" agent-id=\"\" status=\"planned\">",
    "      <goal>Imperative one-line outcome.</goal>",
    "      <keywords>area,topic</keywords>",
    "      <commands>",
    "        <command>pnpm run lint</command>",
    "      </commands>",
    "      <depends></depends>",
    "    </task>",
    "  </phase>",
    "</task-registry>",
    "```",
    "",
    "Edit **`@_status`** (`planned` | `in-progress` | `done` | `blocked`) in git. Optional: `pnpm planning task-update` if you use the CLI.",
    "",
    "## `ROADMAP.xml` — phase row",
    "",
    "```xml",
    "<phase id=\"01\">",
    "  <goal>Phase intent.</goal>",
    "  <status>active</status>",
    "  <depends></depends>",
    "</phase>",
    "```",
    "",
    "## `STATE.xml`",
    "",
    "- **`next-action`** — one concrete step for the next agent turn.",
    "- **`references`** — `REQUIREMENTS.md`, `.planning/AGENTS.md`, key `.xml` paths (no `IMPLEMENTATION_PLAN.md`).",
    "- **`agent-registry`** — optional; only if you adopt CLI agent ids.",
    "",
    "## Optional planning CLI",
    "",
    "Root **`pnpm planning …`** is **not** part of the default loop. Operators may use **`snapshot`**, **`checklist`**, or **`task-update`** for tooling; reports go to **`REPOPLANNER_REPORTS_DIR`** (e.g. `.planning-reports/`). Prefer **cockpit + git** for editing.",
    "",
    "## Minimal layout note",
    "",
    "No `.planning/templates/` in minimal init. Upstream templates: `vendor/repo-planner/.planning/templates/`.",
    "",
  ].join("\n");
}

/** Bare bootstrap: `.planning/` = XML + `planning-config.toml` + `.planning/AGENTS.md` only. Narrative **`REQUIREMENTS.md`** at **repo root** (no `IMPLEMENTATION_PLAN.md`). No `templates/`, `phases/`, `reports/` under `.planning/`. */
async function runPlanningInitMinimal(opts) {
  const force = opts.force === true;
  const wantAgents = opts.agentsMd !== false;
  const archivePointer = ".planning-archive/2026-03-29-pre-barebones";

  await fs.mkdir(PLANNING_DIR, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const cliHint = await resolvePlanningCliInvokeHint();

  if (force) {
    await migrateNarrativeMdFromDotPlanningToRoot();
    await pruneDotPlanningNarrativeAndReports();
    console.log("prune  .planning/reports + narrative .md under .planning/ (minimal layout)");
  }

  const roadmapXml = `<?xml version="1.0" encoding="UTF-8"?>
<roadmap>
  <phase id="01">
    <goal>Keep repo-root REQUIREMENTS.md (roadmap tables + Cross-cutting queue) aligned with ROADMAP.xml, TASK-REGISTRY.xml, and STATE for agents and Repo Planner cockpit.</goal>
    <status>active</status>
    <depends></depends>
  </phase>
  <doc-flow>
    <doc name="REQUIREMENTS.md">Primary narrative PRD + cross-cutting checklist at repo root (not under .planning/).</doc>
    <doc name=".planning/ROADMAP.xml">Phase timeline for RepoPlanner.</doc>
    <doc name=".planning/TASK-REGISTRY.xml">Task graph and status.</doc>
    <doc name=".planning/AGENTS.md">Planning playbook for agents (roadmap-first).</doc>
  </doc-flow>
</roadmap>
`;

  const stateXml = `<?xml version="1.0" encoding="UTF-8"?>
<state>
  <agent-registry />
  <current-phase>01</current-phase>
  <current-plan>bootstrap</current-plan>
  <status>active</status>
  <next-action>Edit REQUIREMENTS.md, .planning/ROADMAP.xml, TASK-REGISTRY.xml, and STATE; read .planning/AGENTS.md. Migrate narrative from ${archivePointer}/ if needed. Optional: ${cliHint} snapshot for a merged CLI view.</next-action>
  <references>
    <reference>REQUIREMENTS.md</reference>
    <reference>.planning/AGENTS.md</reference>
    <reference>.planning/ROADMAP.xml</reference>
    <reference>.planning/TASK-REGISTRY.xml</reference>
    <reference>.planning/DECISIONS.xml</reference>
  </references>
  <agent-id-policy>
    <format>agent-YYYYMMDD-xxxx</format>
    <rule>Optional: register a unique id in STATE.xml before claiming tasks if you use CLI task-update.</rule>
    <generator>${cliHint} new-agent-id</generator>
  </agent-id-policy>
</state>
`;

  const taskRegXml = `<?xml version="1.0" encoding="UTF-8"?>
<task-registry>
  <phase id="01">
    <task id="01-01" agent-id="" status="planned">
      <goal>Migrate any remaining narrative from ${archivePointer}/ into repo-root REQUIREMENTS.md; align ROADMAP.xml and TASK-REGISTRY.xml with real open work.</goal>
      <keywords>bootstrap,migration,requirements,roadmap</keywords>
      <commands>
        <command>pnpm run lint</command>
      </commands>
      <depends></depends>
    </task>
  </phase>
</task-registry>
`;

  const decisionsXml = `<?xml version="1.0" encoding="UTF-8"?>
<decisions>
</decisions>
`;

  const errorsXml = `<?xml version="1.0" encoding="UTF-8"?>
<errors-and-attempts />
`;

  const reqXml = `<?xml version="1.0" encoding="UTF-8"?>
<planning-references>
  <doc>
    <path>REQUIREMENTS.md</path>
    <content><![CDATA[
# Requirements (stub)

Edit **REQUIREMENTS.md** at the repository root. This CDATA block is a bootstrap placeholder for tools that read REQUIREMENTS.xml only.
]]></content>
  </doc>
</planning-references>
`;

  const configToml = `[planning]
sprintSize = 5
currentProfile = "human"
conventionsPaths = ["AGENTS.md", "REQUIREMENTS.md", ".planning/AGENTS.md"]

[profiles.human]
description = "Default human view."

[profiles.agent]
description = "Agent perspective; defaultJson = true."
defaultJson = true
`;

  const requirementsMd = `# Requirements (monorepo)

Restarted **${today}** — this file lives at **repo root** (not \`.planning/\`). **Migrate** substantive prose from the archive folder (if present):

- \`${archivePointer}/REQUIREMENTS.md\`

**Execution queue:** use **roadmap tables** here, **\`.planning/ROADMAP.xml\`**, **\`.planning/TASK-REGISTRY.xml\`**, and the **Cross-cutting queue** section (checkboxes for small items). There is **no** \`IMPLEMENTATION_PLAN.md\`.

Section planning for the site still lives under \`apps/portfolio/content/docs/<section>/\` per root **AGENTS.md**.

## Scope (fill in)

- Books, reader, site stack, documentation — restore headings and tables from the archive as you merge.
`;

  const planningAgentsMd = getMinimalPlanningAgentsMd();

  for (const [rel, body] of [["REQUIREMENTS.md", requirementsMd]]) {
    const r = await writeRepoRootFileIfMissing(rel, body);
    console.log(r.skipped ? `skip  ${r.relPath} (repo root, exists)` : `write ${r.relPath} (repo root)`);
  }

  const planningWrites = [
    ["planning-config.toml", configToml],
    ["STATE.xml", stateXml],
    ["TASK-REGISTRY.xml", taskRegXml],
    ["ROADMAP.xml", roadmapXml],
    ["DECISIONS.xml", decisionsXml],
    ["ERRORS-AND-ATTEMPTS.xml", errorsXml],
    ["REQUIREMENTS.xml", reqXml],
    ["AGENTS.md", planningAgentsMd],
  ];

  for (const [rel, body] of planningWrites) {
    const r = await writePlanningBootstrapFile(rel, body, force);
    console.log(r.skipped ? `skip  .planning/${r.relPath}` : `write .planning/${r.relPath}`);
  }

  if (wantAgents) {
    const agentsPath = path.join(ROOT, "AGENTS.md");
    const pkgRoot = getRepoPlannerPackageRoot();
    const agentsTpl = await readIfExists(path.join(pkgRoot, ".planning", "templates", "AGENTS-TEMPLATE.md"));
    if (agentsTpl) {
      if (force || !(await pathExists(agentsPath))) {
        await fs.writeFile(agentsPath, agentsTpl, "utf8");
        console.log("write AGENTS.md (repo root)");
      } else {
        console.log("skip  AGENTS.md (already exists; use --force to overwrite)");
      }
    } else {
      console.error("warning: AGENTS-TEMPLATE.md missing; skipped AGENTS.md");
    }
  } else {
    console.log("skip  AGENTS.md (repo root) — --no-agents-md");
  }

  console.log(
    "\nBootstrap complete (minimal): .planning/ has XML + planning-config.toml + AGENTS.md; REQUIREMENTS.md at repo root (roadmap + task registry in .planning/); no .planning/reports (set REPOPLANNER_REPORTS_DIR for CLI telemetry).",
  );
}

async function runPlanningInit(opts) {
  const force = opts.force === true;
  const minimal = opts.minimal === true;
  const wantAgents = opts.agentsMd !== false;

  const statePath = path.join(PLANNING_DIR, "STATE.xml");
  if (!force && (await pathExists(statePath))) {
    console.error("Refusing: .planning/STATE.xml already exists. Use --force to overwrite bootstrap outputs.");
    process.exitCode = 1;
    return;
  }

  if (minimal) {
    await runPlanningInitMinimal({ force, agentsMd: opts.agentsMd });
    return;
  }

  const pkgRoot = getRepoPlannerPackageRoot();
  const bundledTemplates = path.join(pkgRoot, ".planning", "templates");
  if (!(await pathExists(bundledTemplates))) {
    throw new Error(
      `RepoPlanner templates not found at ${bundledTemplates}. Use a full RepoPlanner clone or submodule (not a single-file copy of the CLI).`,
    );
  }

  await fs.mkdir(PLANNING_DIR, { recursive: true });
  await fs.mkdir(getReportsDir(), { recursive: true });
  await fs.mkdir(TEMPLATES_DIR, { recursive: true });
  const phaseDirPath = path.join(PHASES_DIR, INIT_PHASE_DIR);
  await fs.mkdir(phaseDirPath, { recursive: true });

  const entries = await fs.readdir(bundledTemplates, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const src = path.join(bundledTemplates, ent.name);
    const dest = path.join(TEMPLATES_DIR, ent.name);
    if (!force && (await pathExists(dest))) continue;
    await fs.copyFile(src, dest);
  }

  const today = new Date().toISOString().slice(0, 10);
  const cliHint = await resolvePlanningCliInvokeHint();

  const planTpl = await readIfExists(path.join(bundledTemplates, "PLAN-TEMPLATE.xml"));
  const summaryTpl = await readIfExists(path.join(bundledTemplates, "SUMMARY-TEMPLATE.xml"));
  if (!planTpl || !summaryTpl) {
    throw new Error("PLAN-TEMPLATE.xml or SUMMARY-TEMPLATE.xml missing from RepoPlanner templates.");
  }

  const planBody = planTpl
    .replace("<phase-id>##</phase-id>", "<phase-id>01</phase-id>")
    .replace("<phase-name>##</phase-name>", "<phase-name>greenfield</phase-name>")
    .replace("<date>YYYY-MM-DD</date>", `<date>${today}</date>`);
  const summaryBody = summaryTpl
    .replace("<phase-id>##</phase-id>", "<phase-id>01</phase-id>")
    .replace("<phase-name>##</phase-name>", "<phase-name>greenfield</phase-name>")
    .replace("<date>YYYY-MM-DD</date>", `<date>${today}</date>`);

  const roadmapXml = `<?xml version="1.0" encoding="UTF-8"?>
<roadmap>
  <phase id="01">
    <goal>Phase 01 — establish requirements and deliver the first planned vertical slice.</goal>
    <requirements>REQ-01</requirements>
    <depends></depends>
    <status>planned</status>
    <links>
      <plan>.planning/phases/${INIT_PHASE_DIR}/${INIT_PLAN_ID}-PLAN.xml</plan>
      <summary>.planning/phases/${INIT_PHASE_DIR}/${INIT_PLAN_ID}-SUMMARY.xml</summary>
    </links>
  </phase>
  <doc-flow>
    <doc name="TASK-REGISTRY.xml">List tasks with keywords + statuses.</doc>
    <doc name="STATE.xml">Current phase pointer + next action.</doc>
    <doc name="REQUIREMENTS.xml">Product / PRD references (CDATA docs).</doc>
  </doc-flow>
</roadmap>
`;

  const stateXml = `<?xml version="1.0" encoding="UTF-8"?>
<state>
  <agent-registry />
  <current-phase>01</current-phase>
  <current-plan>${INIT_PLAN_ID}</current-plan>
  <status>active</status>
  <next-action>Edit REQUIREMENTS.xml and ${INIT_PLAN_ID}-PLAN.xml; run ${cliHint} snapshot; register an agent id before claiming tasks.</next-action>
  <references>
    <reference>.planning/REQUIREMENTS.xml</reference>
    <reference>.planning/ROADMAP.xml</reference>
    <reference>.planning/TASK-REGISTRY.xml</reference>
    <reference>.planning/DECISIONS.xml</reference>
  </references>
  <agent-id-policy>
    <format>agent-YYYYMMDD-xxxx</format>
    <rule>Each agent must generate a unique id and register it in STATE.xml before claiming tasks.</rule>
    <generator>${cliHint} new-agent-id</generator>
  </agent-id-policy>
</state>
`;

  const taskRegXml = `<?xml version="1.0" encoding="UTF-8"?>
<task-registry>
  <phase id="01">
    <task id="${INIT_PLAN_ID}" agent-id="" status="planned">
      <goal>Refine REQUIREMENTS.xml and phase 01 plan; run snapshot and claim this task when ready.</goal>
      <keywords>bootstrap,requirements,planning</keywords>
      <commands>
        <command>${cliHint} snapshot</command>
      </commands>
      <depends></depends>
    </task>
  </phase>
</task-registry>
`;

  const decisionsXml = `<?xml version="1.0" encoding="UTF-8"?>
<decisions>
</decisions>
`;

  const errorsXml = `<?xml version="1.0" encoding="UTF-8"?>
<errors-and-attempts />
`;

  const reqXml = `<?xml version="1.0" encoding="UTF-8"?>
<planning-references>
  <doc>
    <path>README.md</path>
    <content><![CDATA[
# Requirements (REQ-01)

Describe what this repository should deliver, who it is for, and what "done" means for phase 01.

- Replace this stub with your real PRD bullets or link out to a longer doc.
- Keep ROADMAP phase 01 requirements in sync (e.g. REQ-01).
]]></content>
  </doc>
</planning-references>
`;

  const planningReadme = `# Planning loop

This directory holds **STATE**, **TASK-REGISTRY**, **ROADMAP**, phase **PLAN**/**SUMMARY** files, and **templates**.

Bootstrap created \`phases/${INIT_PHASE_DIR}/\` with \`${INIT_PLAN_ID}-PLAN.xml\`. Edit **REQUIREMENTS.xml** and that plan, then run your planning CLI \`snapshot\`.

`;

  const configToml = `[planning]
sprintSize = 5
currentProfile = "human"
conventionsPaths = ["AGENTS.md"]

[profiles.human]
description = "Default human view."

[profiles.agent]
description = "Agent perspective; defaultJson = true."
defaultJson = true
`;

  const rootWrites = [
    ["planning-config.toml", configToml],
    ["STATE.xml", stateXml],
    ["TASK-REGISTRY.xml", taskRegXml],
    ["ROADMAP.xml", roadmapXml],
    ["DECISIONS.xml", decisionsXml],
    ["ERRORS-AND-ATTEMPTS.xml", errorsXml],
    ["REQUIREMENTS.xml", reqXml],
    ["README.md", planningReadme],
  ];

  for (const [rel, body] of rootWrites) {
    const r = await writePlanningBootstrapFile(rel, body, force);
    console.log(r.skipped ? `skip  .planning/${r.relPath}` : `write .planning/${r.relPath}`);
  }

  const gitkeepPath = path.join(getReportsDir(), ".gitkeep");
  if (force || !(await pathExists(gitkeepPath))) {
    await fs.writeFile(gitkeepPath, "\n", "utf8");
    console.log("write .planning/reports/.gitkeep");
  } else {
    console.log("skip  .planning/reports/.gitkeep");
  }

  const planPath = path.join(phaseDirPath, `${INIT_PLAN_ID}-PLAN.xml`);
  const sumPath = path.join(phaseDirPath, `${INIT_PLAN_ID}-SUMMARY.xml`);
  if (force || !(await pathExists(planPath))) {
    await fs.writeFile(planPath, planBody, "utf8");
    console.log(`write .planning/phases/${INIT_PHASE_DIR}/${INIT_PLAN_ID}-PLAN.xml`);
  } else {
    console.log(`skip  .planning/phases/${INIT_PHASE_DIR}/${INIT_PLAN_ID}-PLAN.xml`);
  }
  if (force || !(await pathExists(sumPath))) {
    await fs.writeFile(sumPath, summaryBody, "utf8");
    console.log(`write .planning/phases/${INIT_PHASE_DIR}/${INIT_PLAN_ID}-SUMMARY.xml`);
  } else {
    console.log(`skip  .planning/phases/${INIT_PHASE_DIR}/${INIT_PLAN_ID}-SUMMARY.xml`);
  }

  const agentsPath = path.join(ROOT, "AGENTS.md");
  const agentsTpl = await readIfExists(path.join(bundledTemplates, "AGENTS-TEMPLATE.md"));
  if (wantAgents && agentsTpl) {
    if (force || !(await pathExists(agentsPath))) {
      await fs.writeFile(agentsPath, agentsTpl, "utf8");
      console.log("write AGENTS.md (repo root)");
    } else {
      console.log("skip  AGENTS.md (already exists; use --force to overwrite)");
    }
  } else if (wantAgents && !agentsTpl) {
    console.error("warning: AGENTS-TEMPLATE.md missing; skipped AGENTS.md");
  }

  console.log("\nBootstrap complete. Next: edit .planning/REQUIREMENTS.xml and run `%s snapshot`.", cliHint);
}

function extractDocFromReferences(refXml, docPath) {
  const pattern = new RegExp(
    `<doc>\\s*<path>${docPath.replaceAll(".", "\\.")}<\\/path>\\s*<content><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/content>\\s*<\\/doc>`,
    "m",
  );
  const match = refXml.match(pattern);
  return match ? match[1] : null;
}

function parseProgressTable(markdown) {
  const lines = markdown.split("\n").map((line) => line.replace(/\r$/, ""));
  const progressStart = lines.findIndex((line) => line.trim() === "## Progress");
  if (progressStart === -1) return new Map();
  const map = new Map();
  for (let i = progressStart + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (!line.startsWith("|")) break;
    if (line.includes("---")) continue;
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 3) continue;
    const phaseCell = cells[0];
    const statusCell = cells[2];
    const idMatch = phaseCell.match(/^(\d+)\./);
    if (!idMatch) continue;
    const id = idMatch[1].padStart(2, "0");
    map.set(id, statusCell);
  }
  return map;
}

function parseRoadmapPhases(markdown) {
  const lines = markdown.split("\n").map((line) => line.replace(/\r$/, ""));
  const phases = [];
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^### Phase\s+(\d+)\s*:?\s*(.+)$/);
    if (heading) {
      if (current) phases.push(current);
      current = {
        id: heading[1].padStart(2, "0"),
        title: heading[2].trim(),
        goal: "",
        requirements: "",
        depends: "",
        plans: "",
      };
      continue;
    }
    if (!current) continue;
    const goal = line.match(/^\*\*Goal:\*\*\s*(.*)$/);
    if (goal) {
      current.goal = goal[1].trim();
      continue;
    }
    const req = line.match(/^\*\*Requirements:\*\*\s*(.*)$/);
    if (req) {
      current.requirements = req[1].trim();
      continue;
    }
    const dep = line.match(/^\*\*Depends on:\*\*\s*(.*)$/);
    if (dep) {
      current.depends = dep[1].trim();
      continue;
    }
    const plans = line.match(/^\*\*Plans:\*\*\s*(.*)$/);
    if (plans) {
      current.plans = plans[1].trim();
      continue;
    }
  }
  if (current) phases.push(current);
  return phases;
}

async function migratePlanningMarkdown() {
  const mdFiles = [
    "ROADMAP.md",
    "TASK-REGISTRY.md",
    "STATE.md",
    "DECISIONS.md",
    "ERRORS.md",
    "REQUIREMENTS.md",
    "REFERENCES.md",
    "PROJECT.md",
    "PRD-content-balancing.md",
    "PRD-formulas-and-spaces.md",
    "PRD-text-adventure-embeddings-demo.md",
    "PRD-tooling-gameplay-analysis.md",
    "PRD-ui-engineering-aesthetic.md",
    "GRD-escape-the-dungeon.md",
    "KAPLAY-INTERFACE-SPEC.md",
    "UI-COMPONENT-REGISTRY.md",
    "PANEL-ARCHITECTURE.md",
    "CONTENT-PACK-VERSIONING.md",
    "GAME-VALUE-CONCEPT.md",
    "implementation-roadmap.md",
    "escape-the-dungeon-teen-guide.md",
    "TODO-dungeonbreak-3d.md",
    "TODO-realtime-content-visualizer.md",
    "parity/browser-parity-matrix.md",
  ];

  const docs = [];
  for (const rel of mdFiles) {
    const full = path.join(PLANNING_DIR, rel);
    const content = await readIfExists(full);
    if (content == null) continue;
    docs.push({ path: rel, content });
  }

  const xml = [
    "<planning-references>",
    ...docs.flatMap((doc) => [
      "  <doc>",
      `    <path>${doc.path}</path>`,
      "    <content><![CDATA[",
      escapeCdata(doc.content),
      "]]></content>",
      "  </doc>",
    ]),
    "</planning-references>",
    "",
  ].join("\n");

  const outPath = path.join(PLANNING_DIR, "REQUIREMENTS.xml");
  await writeXml(outPath, xml);

  for (const rel of mdFiles) {
    const full = path.join(PLANNING_DIR, rel);
    try {
      await fs.rm(full);
    } catch {
      // ignore missing files
    }
  }
}

async function migratePhaseMarkdown() {
  const entries = await fs.readdir(PHASES_DIR, { withFileTypes: true }).catch(() => []);
  const generatedAt = new Date().toISOString().slice(0, 10);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const phaseDir = path.join(PHASES_DIR, entry.name);
    const files = await fs.readdir(phaseDir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const mdPath = path.join(phaseDir, file);
      const xmlPath = path.join(phaseDir, file.replace(/\.md$/i, ".xml"));
      const exists = await readIfExists(xmlPath);
      if (exists) continue;
      const content = await fs.readFile(mdPath, "utf8");
      const phaseIdMatch = file.match(/^(\d+)-/);
      const phaseId = phaseIdMatch ? phaseIdMatch[1] : "unknown";
      const docType = file.replace(/^\d+-/, "").replace(/\.md$/i, "");
      const xml = [
        "<phase-doc>",
        "  <metadata>",
        `    <phase id=\"${phaseId}\" />`,
        `    <doc-type>${docType}</doc-type>`,
        `    <source>${path.relative(ROOT, mdPath).replaceAll("\\\\", "/")}</source>`,
        `    <generated-at>${generatedAt}</generated-at>`,
        "  </metadata>",
        "  <legacy>",
        "    <content><![CDATA[",
        escapeCdata(content),
        "]]></content>",
        "  </legacy>",
        "</phase-doc>",
        "",
      ].join("\n");
      await writeXml(xmlPath, xml);
      await fs.rm(mdPath);
    }
  }
}

async function migrateRoadmapFromReferences() {
  const refPath = path.join(PLANNING_DIR, "REQUIREMENTS.xml");
  const refXml = await readIfExists(refPath);
  if (!refXml) throw new Error("REQUIREMENTS.xml not found.");
  const roadmapMd = extractDocFromReferences(refXml, "ROADMAP.md");
  if (!roadmapMd) throw new Error("ROADMAP.md not found inside REQUIREMENTS.xml");
  const phases = parseRoadmapPhases(roadmapMd);
  const progress = parseProgressTable(roadmapMd);
  const lines = ["<roadmap>"];
  for (const phase of phases) {
    lines.push(`  <phase id="${phase.id}">`);
    lines.push(`    <title>${phase.title}</title>`);
    if (phase.goal) lines.push(`    <goal>${phase.goal}</goal>`);
    if (phase.requirements) lines.push(`    <requirements>${phase.requirements}</requirements>`);
    if (phase.depends) lines.push(`    <depends>${phase.depends}</depends>`);
    if (phase.plans) lines.push(`    <plans>${phase.plans}</plans>`);
    const status = progress.get(phase.id);
    if (status) lines.push(`    <status>${status}</status>`);
    lines.push("  </phase>");
  }
  lines.push("  <doc-flow>");
  lines.push(`    <doc name="templates/PLAN-TEMPLATE.xml">PlanDocument structure</doc>`);
  lines.push(`    <doc name="templates/SUMMARY-TEMPLATE.xml">SummaryDocument structure</doc>`);
  lines.push(`    <doc name="templates/TASK-REGISTRY-TEMPLATE.xml">Tasks list template</doc>`);
  lines.push(`    <doc name="templates/DECISIONS-TEMPLATE.xml">Decision record template</doc>`);
  lines.push(`    <doc name="templates/LOOP-DOC-TEMPLATE.xml">Loop record template</doc>`);
  lines.push("  </doc-flow>");
  lines.push("</roadmap>");
  lines.push("");
  await writeXml(path.join(PLANNING_DIR, "ROADMAP.xml"), lines.join("\n"));
}

function extractSingleTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : "";
}

function parseAgentsFromState(xml) {
  const agents = [];
  const agentRegex = /<agent id="([^"]+)">([\s\S]*?)<\/agent>/g;
  let match = null;
  while ((match = agentRegex.exec(xml))) {
    const block = match[2];
    agents.push({
      id: match[1],
      name: extractSingleTag(block, "name"),
      phase: extractSingleTag(block, "phase"),
      plan: extractSingleTag(block, "plan"),
      status: extractSingleTag(block, "status"),
    });
  }
  return agents;
}

function parseTasks(xml) {
  const tasks = [];
  const taskRegex = /<task id="([^"]+)" agent-id="([^"]+)" status="([^"]+)">([\s\S]*?)<\/task>/g;
  let match = null;
  while ((match = taskRegex.exec(xml))) {
    const block = match[4];
    tasks.push({
      id: match[1],
      agentId: match[2],
      status: match[3],
      goal: extractSingleTag(block, "goal"),
      phase: match[1].split("-")[0] ?? "",
    });
  }
  return tasks;
}

function computeProgress(tasks) {
  const byPhase = new Map();
  const byAgent = new Map();
  for (const task of tasks) {
    const phase = task.phase || "unknown";
    const agent = task.agentId || "unassigned";
    if (!byPhase.has(phase)) byPhase.set(phase, []);
    if (!byAgent.has(agent)) byAgent.set(agent, []);
    byPhase.get(phase).push(task);
    byAgent.get(agent).push(task);
  }
  return { byPhase, byAgent };
}

/** Parse <depends> text to extract referenced phase ids (e.g. "Phase 01 complete." -> ["01"]). */
function parseDependsPhaseIds(dependsText) {
  if (!dependsText || typeof dependsText !== "string") return [];
  const ids = [];
  const re = /Phase\s*(\d+)/gi;
  let m;
  while ((m = re.exec(dependsText)) !== null) {
    const id = String(parseInt(m[1], 10)).padStart(2, "0");
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Build a compact dependency tree. If sprintPhaseIds is set, only include those phases and their ancestors (sprint-context deps). */
function formatPhaseDependencyTree(roadmapPhases, sprintPhaseIds = null) {
  if (!roadmapPhases || roadmapPhases.length === 0) return "";
  const byId = new Map(roadmapPhases.map((p) => [p.id, p]));
  const primaryParent = new Map();
  for (const p of roadmapPhases) {
    const refs = parseDependsPhaseIds(p.depends);
    const first = refs.find((id) => byId.has(id));
    if (first) primaryParent.set(p.id, first);
  }
  const children = new Map();
  for (const p of roadmapPhases) {
    const par = primaryParent.get(p.id);
    if (par) {
      if (!children.has(par)) children.set(par, []);
      children.get(par).push(p.id);
    }
  }
  let roots = roadmapPhases.filter((p) => !primaryParent.has(p.id)).map((p) => p.id).sort((a, b) => Number(a) - Number(b));
  let visible = null;
  if (sprintPhaseIds && sprintPhaseIds.length > 0) {
    visible = new Set(sprintPhaseIds);
    roots = sprintPhaseIds.filter((id) => {
      const par = primaryParent.get(id);
      return !par || !visible.has(par);
    }).sort((a, b) => Number(a) - Number(b));
  }
  const statusShort = (s) => {
    const t = (s || "").toLowerCase();
    if (t.includes("complete")) return "done";
    if (t.includes("superseded")) return "abandoned";
    if (t.includes("progress") || t === "in-progress") return "active";
    if (t.includes("planned") || t.includes("not started") || t.includes("pending")) return "plan";
    if (t.includes("stable")) return "stable";
    return (s || "").replace(/\s+/g, "").slice(0, 6) || "—";
  };
  const shortTitle = (t) => (t || "").replace(/\s+/g, " ").trim().slice(0, 28);
  const out = [];
  function visit(id, indent) {
    if (visible && !visible.has(id)) return;
    const p = byId.get(id);
    if (!p) return;
    const prefix = indent ? "  ".repeat(indent) + "└ " : "";
    out.push(`${prefix}${id} ${shortTitle(p.title)} [${statusShort(p.status)}]`);
    const kids = (children.get(id) || []).sort((a, b) => Number(a) - Number(b));
    kids.forEach((kid) => visit(kid, indent + 1));
  }
  for (const id of roots) visit(id, 0);
  return out.join("\n");
}

const STATE_FILE_REF = ".planning/STATE.xml";
const TASK_REGISTRY_REF = ".planning/TASK-REGISTRY.xml";
const ROADMAP_REF = ".planning/ROADMAP.xml";
const AGENTS_MD_REF = "AGENTS.md";

function formatSnapshotLines(stateXml, taskXml, roadmapPhases = null, opts = null) {
  const agents = parseAgentsFromState(stateXml).filter((a) => (a.status || "").toLowerCase() !== "inactive");
  const allTasks = parseTasks(taskXml);
  const openTasks = allTasks.filter((task) => task.status !== "done");
  const progress = computeProgress(allTasks);

  const lines = [];

  const agentsMd = typeof opts === "object" && opts?.agentsMdContent;
  if (agentsMd) {
    lines.push(`BEHAVIOR (${AGENTS_MD_REF})`);
    lines.push("");
    agentsMd.split("\n").forEach((ln) => lines.push(ln));
    lines.push("", "────────────────────────────────────────", "");
  }

  lines.push(`STATE (${STATE_FILE_REF})`);
  lines.push("agents (active):");
  if (agents.length === 0) {
    lines.push("  (none)");
  } else {
    for (const agent of agents) {
      const tasksForAgent = progress.byAgent.get(agent.id) ?? [];
      const openForAgent = tasksForAgent.filter((t) => t.status !== "done");
      const done = tasksForAgent.filter((t) => t.status === "done").length;
      const total = tasksForAgent.length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      lines.push(`  ${agent.id}  phase=${agent.phase} plan=${agent.plan}  ${done}/${total} (${pct}%)`);
      for (const t of openForAgent) {
        const goalShort = (t.goal || "").slice(0, 60);
        lines.push(`    task ${t.id} [${t.status}] ${goalShort}${goalShort.length >= 60 ? "…" : ""}`);
      }
    }
  }

  lines.push("", `OPEN TASKS (${TASK_REGISTRY_REF})`);
  for (const task of openTasks) {
    lines.push(`  ${task.id} [${task.status}] ${task.goal} (agent: ${task.agentId})`);
  }

  const phasesNeedingReview = [];
  for (const [phase, phaseTasks] of progress.byPhase.entries()) {
    const done = phaseTasks.filter((t) => t.status === "done").length;
    const total = phaseTasks.length;
    if (total > 0 && done === 0) phasesNeedingReview.push(phase);
  }

  lines.push("", "PHASE");
  lines.push(`  Progress (${TASK_REGISTRY_REF})`);
  for (const [phase, phaseTasks] of progress.byPhase.entries()) {
    const done = phaseTasks.filter((t) => t.status === "done").length;
    const total = phaseTasks.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const reviewFlag = total > 0 && done === 0 ? "  review?" : "";
    lines.push(`    ${phase}: ${done}/${total} (${pct}%)${reviewFlag}`);
  }
  const sprintPhaseIds = typeof opts === "object" && opts?.sprintPhaseIds?.length > 0 ? opts.sprintPhaseIds : null;
  if (phasesNeedingReview.length > 0) {
    lines.push("", "  NEEDS REVIEW");
    lines.push(`    ${phasesNeedingReview.sort((a, b) => Number(a) - Number(b)).join(", ")}`);
  }
  lines.push(`  DEPS (tree, id title [status]) (${ROADMAP_REF})${sprintPhaseIds ? " — file context" : ""}`);
  if (roadmapPhases && roadmapPhases.length > 0) {
    formatPhaseDependencyTree(roadmapPhases, sprintPhaseIds).split("\n").forEach((ln) => lines.push("    " + ln));
  } else {
    lines.push("    (no roadmap)");
  }

  const similarityPairs = typeof opts === "object" && opts?.phaseSimilarity;
  const phaseFileRefs = typeof opts === "object" && opts?.phaseFileRefs;
  if (similarityPairs && similarityPairs.length > 0) {
    lines.push("", "  Similar phases  (phase↔phase similarity%  files touched)");
    for (const { a, b, pct } of similarityPairs) {
      const refsA = phaseFileRefs?.[a] ?? [];
      const refsB = phaseFileRefs?.[b] ?? [];
      const union = [...new Set([...refsA, ...refsB])].filter(Boolean).slice(0, 6);
      const pathsStr = union.length > 0 ? union.join(", ") : "—";
      lines.push(`    ${a}↔${b} ${pct}%  ${pathsStr}`);
    }
  } else if (typeof opts === "object" && opts?.phaseSimilarityRequested) {
    lines.push("", "  Similar phases: install optional dep fastembed to enable.");
  }

  return lines.join("\n");
}

async function snapshotToString(opts = {}) {
  const stateXml = await readIfExists(path.join(PLANNING_DIR, "STATE.xml"));
  const taskXml = await readIfExists(path.join(PLANNING_DIR, "TASK-REGISTRY.xml"));
  if (!stateXml || !taskXml) return null;
  if (opts.includeBehavior !== false) {
    const agentsMdPath = path.join(ROOT, "AGENTS.md");
    const content = await readIfExists(agentsMdPath);
    if (content) (opts = { ...opts }).agentsMdContent = content;
  }
  const roadmap = await loadRoadmap();
  const config = await getConfig();
  const size = config.sprintSize ?? 5;
  const state = await loadState();
  const idx = roadmap.findIndex((p) => p.id === state?.currentPhase || String(state?.currentPhase || "").padStart(2, "0") === p.id);
  let k = idx >= 0 ? Math.floor(idx / size) : 0;
  let phaseIds = getSprintPhaseIds(roadmap, size, k);
  if (phaseIds.length < 2 && k > 0) {
    k = k - 1;
    phaseIds = getSprintPhaseIds(roadmap, size, k);
  }
  const reg = await loadTaskRegistry();
  const phaseFileRefs = {};
  for (const id of phaseIds) {
    const refs = getPhaseFileRefs(id, reg);
    if (refs.length) phaseFileRefs[id] = refs;
  }
  let snapshotOpts = { sprintPhaseIds: phaseIds };
  if (Object.keys(phaseFileRefs).length) snapshotOpts.phaseFileRefs = phaseFileRefs;
  if (opts.agentsMdContent) snapshotOpts.agentsMdContent = opts.agentsMdContent;
  if (opts.similarity !== false) {
    const pairs = await computePhaseSimilarity(phaseIds, roadmap, reg);
    if (pairs) snapshotOpts.phaseSimilarity = pairs;
    else snapshotOpts.phaseSimilarityRequested = true;
  }
  return formatSnapshotLines(stateXml, taskXml, roadmap, snapshotOpts);
}

async function snapshot(opts = {}) {
  const stateXml = await readIfExists(path.join(PLANNING_DIR, "STATE.xml"));
  const taskXml = await readIfExists(path.join(PLANNING_DIR, "TASK-REGISTRY.xml"));
  if (!stateXml || !taskXml) {
    console.log("STATE.xml or TASK-REGISTRY.xml not found.");
    return;
  }
  let snapshotOpts = {};
  if (opts.includeBehavior !== false) {
    const agentsMdContent = await readIfExists(path.join(ROOT, "AGENTS.md"));
    if (agentsMdContent) snapshotOpts.agentsMdContent = agentsMdContent;
  }
  const roadmap = await loadRoadmap();
  const config = await getConfig();
  const size = config.sprintSize ?? 5;
  const state = await loadState();
  const idx = roadmap.findIndex((p) => p.id === state?.currentPhase || String(state?.currentPhase || "").padStart(2, "0") === p.id);
  let k = idx >= 0 ? Math.floor(idx / size) : 0;
  let phaseIds = getSprintPhaseIds(roadmap, size, k);
  if (phaseIds.length < 2 && k > 0) {
    k = k - 1;
    phaseIds = getSprintPhaseIds(roadmap, size, k);
  }
  snapshotOpts.sprintPhaseIds = phaseIds;
  const reg = await loadTaskRegistry();
  const phaseFileRefs = {};
  for (const id of phaseIds) {
    const refs = getPhaseFileRefs(id, reg);
    if (refs.length) phaseFileRefs[id] = refs;
  }
  if (Object.keys(phaseFileRefs).length) snapshotOpts.phaseFileRefs = phaseFileRefs;
  if (opts.similarity !== false) {
    const pairs = await computePhaseSimilarity(phaseIds, roadmap, reg);
    if (pairs) snapshotOpts.phaseSimilarity = pairs;
    else snapshotOpts.phaseSimilarityRequested = true;
  }
  console.log(formatSnapshotLines(stateXml, taskXml, roadmap, snapshotOpts));
}

/** Append one line to .planning/reports/usage.jsonl for tracking how often agents run key commands. */
async function appendUsageLog(command) {
  const usagePath = path.join(getReportsDir(), "usage.jsonl");
  const line = JSON.stringify({ at: new Date().toISOString(), command }) + "\n";
  await fs.mkdir(getReportsDir(), { recursive: true }).catch(() => {});
  await fs.appendFile(usagePath, line, "utf8").catch(() => {});
}

/** Returns the exact line the CLI prints for new-agent-id. seed: optional 4-char string for report (e.g. "repr"); else random. */
function getNewAgentIdLine(seed) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const suffix = seed != null ? String(seed).slice(0, 4).padEnd(4, "0") : Math.random().toString(36).slice(2, 6);
  const id = `agent-${y}${m}${d}-${suffix}`;
  return "Your new agent id: " + id;
}

function generateAgentId() {
  console.log(getNewAgentIdLine());
}

function updateTaskStatus(xml, taskId, status, agentId) {
  const taskRegex = new RegExp(
    `<task id="${taskId}" agent-id="([^"]+)" status="([^"]+)">`,
  );
  if (!taskRegex.test(xml)) return null;
  return xml.replace(taskRegex, (match, currentAgent, currentStatus) => {
    const nextAgent = agentId ?? currentAgent;
    const nextStatus = status ?? currentStatus;
    return `<task id="${taskId}" agent-id="${nextAgent}" status="${nextStatus}">`;
  });
}

function updatePhaseStatus(xml, phaseId, status) {
  const phaseRegex = new RegExp(`<phase id="${phaseId}">([\\s\\S]*?)<\\/phase>`);
  const match = xml.match(phaseRegex);
  if (!match) return null;
  let block = match[1];
  if (block.includes("<status>")) {
    block = block.replace(/<status>[^<]*<\/status>/, `<status>${status}</status>`);
  } else {
    block = `${block.trim()}\n    <status>${status}</status>\n  `;
  }
  return xml.replace(phaseRegex, `<phase id="${phaseId}">${block}</phase>`);
}

function deactivateAgent(xml, agentId) {
  const agentRegex = new RegExp(`<agent id="${agentId}">([\\s\\S]*?)<\\/agent>`);
  const match = xml.match(agentRegex);
  if (!match) return null;
  let block = match[1];
  block = block.replace(/<status>[^<]*<\/status>/, "<status>inactive</status>");
  block = block.replace(/<phase>[^<]*<\/phase>/, "<phase>none</phase>");
  block = block.replace(/<plan>[^<]*<\/plan>/, "<plan>none</plan>");
  return xml.replace(agentRegex, `<agent id="${agentId}">${block}</agent>`);
}

/** Remove inactive agents from STATE XML. Returns { xml, removedIds }. */
function removeInactiveAgentsFromStateXml(xml) {
  const agentRegex = /<agent id="([^"]+)">([\s\S]*?)<\/agent>/g;
  const kept = [];
  const removedIds = [];
  let m;
  while ((m = agentRegex.exec(xml))) {
    const full = m[0];
    const id = m[1];
    const inner = m[2];
    const isInactive = /<status>\s*inactive\s*<\/status>/i.test(inner);
    if (isInactive) {
      removedIds.push(id);
    } else {
      kept.push(full);
    }
  }
  const registryRegex = /<agent-registry>[\s\S]*?<\/agent-registry>/;
  const newRegistry = "<agent-registry>\n    " + kept.join("\n    ") + "\n  </agent-registry>";
  const newXml = xml.replace(registryRegex, newRegistry);
  return { xml: newXml, removedIds };
}

/** Remove inactive agents from STATE.xml. Options: { silent, dryRun }. Returns { removed: string[] }. */
async function cleanupInactiveAgents(opts = {}) {
  const statePath = path.join(PLANNING_DIR, "STATE.xml");
  const xml = await readIfExists(statePath);
  if (!xml) return { removed: [] };
  const { xml: newXml, removedIds } = removeInactiveAgentsFromStateXml(xml);
  if (!opts.dryRun && removedIds.length > 0) {
    await writeXml(statePath, newXml);
  }
  if (!opts.silent) {
    if (removedIds.length > 0) {
      if (opts.dryRun) {
        console.log("(dry-run) Would remove %s inactive agent(s): %s", removedIds.length, removedIds.join(", "));
      } else {
        console.log("Removed %s inactive agent(s) from STATE.xml: %s", removedIds.length, removedIds.join(", "));
      }
    } else {
      console.log("No inactive agents in STATE.xml.");
    }
  }
  return { removed: removedIds };
}

function insertTask(xml, phaseId, taskXml) {
  const phaseRegex = new RegExp(`<phase id="${phaseId}">([\\s\\S]*?)<\\/phase>`);
  const match = xml.match(phaseRegex);
  if (!match) return null;
  let block = match[1];
  const insertPoint = block.lastIndexOf("</phase>");
  if (insertPoint !== -1) return null;
  block = block.replace(/\s*<\/phase>$/, "");
  const insertion = `\n    ${taskXml.replace(/\n/g, "\n    ")}\n  `;
  return xml.replace(phaseRegex, `<phase id="${phaseId}">${block}${insertion}</phase>`);
}

function createTaskBlock({ taskId, agentId, status, goal, keywords, command }) {
  const lines = [
    `<task id="${taskId}" agent-id="${agentId}" status="${status}">`,
    `  <goal>${goal}</goal>`,
    `  <keywords>${keywords}</keywords>`,
    "  <commands>",
    `    <command>${command}</command>`,
    "  </commands>",
    "</task>",
  ];
  return lines.join("\n");
}

function createPhasePlanFromTemplate(template, { phaseId, phaseName, date }) {
  return template
    .replace("<phase-id>##</phase-id>", `<phase-id>${phaseId}</phase-id>`)
    .replace("<phase-name>##</phase-name>", `<phase-name>${phaseName}</phase-name>`)
    .replace("<date>YYYY-MM-DD</date>", `<date>${date}</date>`);
}

/** Build the context bundle an agent would receive when running the loop (for simulate / Codex). opts.serveContent: include document bodies; conventions are always included when present. */
async function buildAgentLoopBundle(opts = {}) {
  const config = await getConfig();
  const state = await loadState();
  const reg = await loadTaskRegistry();
  const roadmap = await loadRoadmap();
  const openTasks = (reg?.tasks ?? []).filter((t) => t.status !== "done");
  const openQuestions = await loadOpenQuestions({});
  const size = config.sprintSize ?? 5;
  let sprintIndex = opts.sprintIndex != null ? parseInt(opts.sprintIndex, 10) : null;
  if (sprintIndex == null && roadmap?.length && state?.currentPhase) {
    const idx = roadmap.findIndex((p) => p.id === state.currentPhase || String(state.currentPhase).padStart(2, "0") === p.id);
    sprintIndex = idx >= 0 ? Math.floor(idx / size) : 0;
  }
  sprintIndex = sprintIndex ?? 0;
  const phaseIds = roadmap?.length ? getSprintPhaseIds(roadmap, size, sprintIndex) : [];
  const phases = (roadmap ?? []).filter((p) => phaseIds.includes(p.id));
  const tasksInSprint = (reg?.tasks ?? []).filter((t) => phaseIds.includes(t.phase));
  const paths = [
    path.relative(ROOT, path.join(PLANNING_DIR, "STATE.xml")),
    path.relative(ROOT, path.join(PLANNING_DIR, "TASK-REGISTRY.xml")),
    path.relative(ROOT, path.join(PLANNING_DIR, "ROADMAP.xml")),
    path.relative(ROOT, path.join(PLANNING_DIR, "REQUIREMENTS.xml")),
    path.relative(ROOT, path.join(PLANNING_DIR, "DECISIONS.xml")),
  ];
  const phaseDirs = await fs.readdir(PHASES_DIR, { withFileTypes: true }).catch(() => []);
  for (const d of phaseDirs) {
    if (!d.isDirectory()) continue;
    const phaseNum = d.name.match(/^(\d+)-/)?.[1];
    if (phaseNum && phaseIds.includes(phaseNum.padStart(2, "0"))) {
      paths.push(path.relative(ROOT, path.join(PHASES_DIR, d.name)));
    }
  }
  const phaseIdToTitle = Object.fromEntries((roadmap ?? []).map((p) => [p.id, p.title || p.id]));
  const allTasks = reg?.tasks ?? [];
  const agentsWithTasks = (state?.agents ?? []).map((agent) => ({
    agent: { id: agent.id, name: agent.name, phase: agent.phase, plan: agent.plan, status: agent.status },
    tasks: allTasks.filter((t) => (t.agentId || "").trim() === (agent.id || "").trim()).map((t) => ({ id: t.id, status: t.status, goal: t.goal, phase: t.phase, phaseTitle: phaseIdToTitle[t.phase] || t.phase })),
  }));

  const phasesWithInProgressWork = [
    ...new Set([
      ...(state?.agents ?? []).filter((a) => (a.status || "").toLowerCase() === "in-progress").map((a) => String(a.phase || "").padStart(2, "0")).filter(Boolean),
      ...openTasks.filter((t) => (t.status || "").toLowerCase() === "in-progress").map((t) => String(t.phase || "").padStart(2, "0")).filter(Boolean),
    ]),
  ].sort();

  const conventions = await loadConventions(config);
  const codeRefsFromTasks = extractCodeFileReferencesFromTasks(reg?.tasks ?? []);
  const codeFileReferences = [...new Set([...ensureArray(config.codeContextPaths), ...codeRefsFromTasks])].filter(Boolean).sort();

  const norm = (id) => String(id || "").padStart(2, "0");
  const summaryPhases = phases.map((p) => {
    const pid = norm(p.id);
    const tasksInPhase = (allTasks || []).filter((t) => norm(t.phase) === pid);
    const fileRefs = getPhaseFileRefs(p.id, reg);
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      goal: p.goal ?? "",
      tasks: tasksInPhase.map((t) => ({ id: t.id, status: t.status, goal: t.goal, agentId: t.agentId })),
      fileRefs,
    };
  });

  const context = {
    sprintIndex,
    phaseIds,
    paths,
    phaseIdToTitle,
    summary: { phases: summaryPhases, taskCount: tasksInSprint.length },
    codeFileReferences,
  };

  if (opts.serveContent !== false) {
    const documents = [];
    const statePath = path.join(PLANNING_DIR, "STATE.xml");
    const stateContent = await readIfExists(statePath);
    if (stateContent) documents.push({ path: path.relative(ROOT, statePath), content: stateContent });
    const taskPath = path.join(PLANNING_DIR, "TASK-REGISTRY.xml");
    const taskContent = await readIfExists(taskPath);
    if (taskContent) documents.push({ path: path.relative(ROOT, taskPath), content: taskContent });
    const roadmapPath = path.join(PLANNING_DIR, "ROADMAP.xml");
    const roadmapContent = await readIfExists(roadmapPath);
    if (roadmapContent) documents.push({ path: path.relative(ROOT, roadmapPath), content: roadmapContent });
    const decisionsPath = path.join(PLANNING_DIR, "DECISIONS.xml");
    const decisionsContent = await readIfExists(decisionsPath);
    if (decisionsContent) documents.push({ path: path.relative(ROOT, decisionsPath), content: decisionsContent });
    for (const d of phaseDirs) {
      if (!d.isDirectory()) continue;
      const phaseNum = d.name.match(/^(\d+)-/)?.[1];
      if (!phaseNum || !phaseIds.includes(phaseNum.padStart(2, "0"))) continue;
      const dirPath = path.join(PHASES_DIR, d.name);
      const files = await fs.readdir(dirPath, { withFileTypes: true }).catch(() => []);
      for (const f of files) {
        if (!f.isFile()) continue;
        const fp = path.join(dirPath, f.name);
        const content = await readIfExists(fp);
        if (content) documents.push({ path: path.relative(ROOT, fp), content });
      }
    }
    context.documents = documents;
  }

  const reviewItems = computeReviewItems(reg, roadmap);

  return {
    format: AGENT_LOOP_BUNDLE_FORMAT,
    role: "agent-loop-bundle",
    generatedAt: new Date().toISOString(),
    snapshot: state ? { currentPhase: state.currentPhase, currentPlan: state.currentPlan, status: state.status, nextAction: state.nextAction, agents: state.agents } : null,
    phasesWithInProgressWork,
    conventions,
    context,
    openTasks: openTasks.map((t) => ({ id: t.id, status: t.status, agentId: t.agentId, goal: t.goal, phase: t.phase })),
    openQuestions: openQuestions.flatMap((r) => r.questions.map((q) => ({ phaseId: r.phaseId, id: q.id, text: q.text, file: r.planPath }))),
    agentsWithTasks,
    reviewItems,
  };
}

async function generateReportMd() {
  await cleanupInactiveAgents({ silent: true });
  await fs.mkdir(getReportsDir(), { recursive: true });
  const bundle = await buildAgentLoopBundle();
  const systemMetrics = await buildSystemMetrics();
  const verbatimSnapshot = await snapshotToString({ similarity: true });
  systemMetrics.snapshotTokensApprox = verbatimSnapshot ? estimateTokens(verbatimSnapshot) : 0;
  systemMetrics.bundleTokensApprox = estimateTokens(JSON.stringify(bundle));
  const metricsPath = path.join(getReportsDir(), "metrics.jsonl");
  await fs.appendFile(metricsPath, JSON.stringify(systemMetrics) + "\n", "utf8").catch(() => {});
  const verbatimNewAgentIdLine = getNewAgentIdLine("repr");
  const kpis = await buildReportKpis();
  const verbatimKpis = formatKpisLines(kpis);
  const reviewItems = bundle.reviewItems ?? { phasesAtZero: [], unassignedTasks: [], phasesOnlyPlanned: [], summary: { phasesAtZeroCount: 0, unassignedCount: 0, phasesOnlyPlannedCount: 0 } };
  const verbatimReview = formatReviewLines(reviewItems);
  const templatePath = path.join(TEMPLATES_DIR, "agent-loop-report.md.ejs");
  const template = await fs.readFile(templatePath, "utf8").catch(() => null);
  if (!template) throw new Error("Template not found: " + templatePath);
  const md = ejs.render(template, {
    ...bundle,
    format: bundle.format || AGENT_LOOP_BUNDLE_FORMAT,
    generatedAt: bundle.generatedAt,
    snapshot: bundle.snapshot,
    context: bundle.context,
    openTasks: bundle.openTasks,
    openQuestions: bundle.openQuestions,
    agentsWithTasks: bundle.agentsWithTasks ?? [],
    verbatimSnapshot: verbatimSnapshot ?? "(STATE.xml or TASK-REGISTRY.xml not found.)",
    verbatimNewAgentIdLine,
    verbatimKpis,
    verbatimReview,
    kpis,
    reviewItems,
    systemMetrics,
  });
  const latestPath = path.join(getReportsDir(), "latest.md");
  await fs.writeFile(latestPath, md, "utf8");
  const existing = await fs.readdir(getReportsDir()).catch(() => []);
  for (const name of existing) {
    if (name.endsWith(".md") && name !== "latest.md") {
      await fs.rm(path.join(getReportsDir(), name)).catch(() => {});
    }
  }
  return { path: latestPath };
}

function createReportServer(reportsDir, port) {
  return http.createServer(async (req, res) => {
    const u = new URL(req.url || "/", `http://localhost`);
    const p = u.pathname.replace(/^\/+/, "") || "viewer.html";
    const wantRefresh = u.searchParams.get("refresh") === "1";
    if (p === "list") {
      const files = await fs.readdir(reportsDir).catch(() => []);
      const md = files.filter((f) => f.endsWith(".md")).sort();
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(md));
      return;
    }
    if (p === "viewer.html" || p === "") {
      res.setHeader("Content-Type", "text/html");
      res.end(VIEWER_HTML);
      return;
    }
    if (p === "regenerate") {
      try {
        await generateReportMd();
        res.statusCode = 204;
        res.end();
      } catch (e) {
        res.statusCode = 500;
        res.end(e.message || "Generate failed");
      }
      return;
    }
    if (p === "metrics" || p === "metrics.jsonl") {
      const metricsPath = path.join(reportsDir, "metrics.jsonl");
      const tail = parseInt(u.searchParams.get("tail") || "0", 10);
      const content = await fs.readFile(metricsPath, "utf8").catch(() => "");
      const lines = content.trim().split("\n").filter(Boolean);
      const last = tail > 0 ? lines.slice(-tail) : lines;
      const parsed = last.map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);
      res.setHeader("Content-Type", "application/json");
      if (p === "metrics") {
        res.end(JSON.stringify(parsed));
      } else {
        res.setHeader("Content-Type", "application/x-ndjson");
        res.end(content || "");
      }
      return;
    }
    const filePath = path.join(reportsDir, p);
    if (!filePath.startsWith(path.resolve(reportsDir))) {
      res.statusCode = 403;
      res.end();
      return;
    }
    if (p === "latest.md" && wantRefresh) {
      try {
        await generateReportMd();
      } catch (e) {
        console.error("Report regenerate on request failed:", e.message);
      }
    }
    const data = await fs.readFile(filePath).catch(() => null);
    if (!data) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader("Content-Type", p.endsWith(".md") ? "text/markdown" : "text/plain");
    res.end(data);
  });
}

async function openBrowser(url) {
  const { execSync } = await import("node:child_process");
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  try {
    execSync(`${cmd} "${url}"`, { stdio: "ignore" });
  } catch {
    console.log("Open in browser: %s", url);
  }
}

const WORKFLOW_HELP_TEXT = `
Agent loop: snapshot | new-agent-id → claim task → bundle --json (or MCP) → execute → sync STATE/TASK-REGISTRY/ROADMAP. See AGENTS.md and .planning/AGENTS.md when present.
`;

function buildProgram() {
  const program = new Command();
  program
    .name("planning")
    .description("RepoPlanner: state, roadmap, tasks, bundle. Use --help <command> for details.")
    .version(getRepoPlannerPackageVersion(), "-V, --version", "Print repo-planner package version")
    .option("--root <path>", "Planning project root (default: cwd or REPOPLANNER_PROJECT_ROOT)");
  program.configureHelp({ sortSubcommands: true });
  program.addHelpText("after", WORKFLOW_HELP_TEXT);

  program
    .command("roadmap")
    .description("Output full roadmap with all phases, task counts, file refs, and sprint window (for UI).")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const roadmap = await loadRoadmap();
      const reg = await loadTaskRegistry();
      const state = await loadState();
      const config = await getConfig();
      const size = config.sprintSize ?? 5;
      let sprintIndex = 0;
      if (roadmap?.length && state?.currentPhase) {
        const idx = roadmap.findIndex((p) => p.id === state.currentPhase || String(state.currentPhase).padStart(2, "0") === p.id);
        sprintIndex = idx >= 0 ? Math.floor(idx / size) : 0;
      }
      const phaseIdsInSprint = roadmap?.length ? getSprintPhaseIds(roadmap, size, sprintIndex) : [];
      const norm = (id) => String(id || "").padStart(2, "0");
      const phases = (roadmap ?? []).map((p) => {
        const pid = norm(p.id);
        const tasksInPhase = (reg?.tasks ?? []).filter((t) => norm(t.phase) === pid);
        return {
          id: p.id,
          title: p.title,
          status: p.status,
          goal: p.goal ?? "",
          taskCount: tasksInPhase.length,
          fileRefs: getPhaseFileRefs(p.id, reg),
          tasks: tasksInPhase.map((t) => ({ id: t.id, status: t.status, goal: (t.goal || "").slice(0, 120) })),
        };
      });
      const out = { phases, sprintSize: size, sprintIndex, phaseIdsInSprint };
      if (opts.json) {
        console.log(JSON.stringify(out, null, 2));
        return;
      }
      console.log("Sprint %s (phases: %s)", sprintIndex, phaseIdsInSprint.join(", "));
      for (const p of phases) {
        console.log("  %s  %s  [%s]  %s tasks", p.id, p.title, p.status, p.taskCount);
      }
    });

  program
    .command("snapshot")
    .description("Print current phase, agents, open tasks, and phase progress (includes phase similarity by default when fastembed is installed)")
    .option("--no-similarity", "Omit phase context similarity")
    .action(async (opts) => {
      await appendUsageLog("snapshot");
      return snapshot({ similarity: !opts.noSimilarity });
    });

  program
    .command("similarity")
    .description("Phase context similarity for current sprint (embedding-based). Use to infer semantic dependencies. Requires optional dep fastembed.")
    .option("--sprint-index <k>", "Sprint index (0-based); omit for current sprint")
    .option("--json", "Output pairs as JSON")
    .option("--threshold <n>", "Only show pairs with similarity >= n% (e.g. 60)", "0")
    .action(async (opts) => {
      const roadmap = await loadRoadmap();
      const reg = await loadTaskRegistry();
      if (!roadmap?.length) {
        console.error("ROADMAP.xml not found or empty.");
        process.exitCode = 1;
        return;
      }
      const config = await getConfig();
      const size = config.sprintSize ?? 5;
      let k = opts.sprintIndex != null ? parseInt(opts.sprintIndex, 10) : null;
      if (k == null) {
        const state = await loadState();
        const idx = roadmap.findIndex((p) => p.id === state?.currentPhase || String(state?.currentPhase || "").padStart(2, "0") === p.id);
        k = idx >= 0 ? Math.floor(idx / size) : 0;
      }
      const phaseIds = getSprintPhaseIds(roadmap, size, k);
      const pairs = await computePhaseSimilarity(phaseIds, roadmap, reg);
      if (pairs == null) {
        console.error("Phase similarity requires optional dep: pnpm add -w fastembed");
        process.exitCode = 1;
        return;
      }
      if (pairs.length === 0) {
        console.log("Phase similarity (context, sprint %s)", k);
        console.log("Phases: %s (need at least 2 for pairwise similarity)", phaseIds.join(", "));
        return;
      }
      const threshold = parseInt(opts.threshold, 10) || 0;
      const filtered = threshold > 0 ? pairs.filter((p) => p.pct >= threshold) : pairs;
      if (opts.json) {
        console.log(JSON.stringify({ sprintIndex: k, phaseIds, pairs: filtered }, null, 2));
        return;
      }
      console.log("Phase similarity (context, sprint %s)", k);
      console.log("Phases: %s", phaseIds.join(", "));
      console.log("");
      for (const { a, b, pct } of filtered) {
        console.log("  %s↔%s  %s%%", a, b, pct);
      }
      const high = pairs.filter((p) => p.pct >= 60);
      if (high.length > 0) {
        console.log("");
        console.log("Semantic deps (≥60%% similar): consider declaring in ROADMAP or task deps.");
      }
    });

  program
    .command("kpis")
    .description("Print KPIs to stdout (PRD/sprint token usage, context per phase). Same text as report KPIs code block.")
    .action(async () => {
      const kpis = await buildReportKpis();
      console.log(formatKpisLines(kpis));
    });

  program
    .command("metrics")
    .description("System health metrics (tasks, questions, agents, errors). Use for tracking and analysis.")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const m = await buildSystemMetrics();
      if (opts.json) {
        console.log(JSON.stringify(m, null, 2));
      } else {
        console.log("at\t%s", m.at);
        console.log("tasks\t%s / %s (%s%% done)", m.tasksDone, m.tasksTotal, m.completionRate);
        console.log("open questions\t%s", m.openQuestionsCount);
        console.log("active agents\t%s", m.activeAgentsCount);
        console.log("phases (with tasks / total / complete)\t%s / %s / %s", m.phasesWithTasks, m.phasesTotal, m.phasesComplete);
        console.log("errors-and-attempts\t%s", m.errorsAttemptsCount);
        console.log("review\tphasesAtZero=%s unassigned=%s phasesOnlyPlanned=%s", m.review.phasesAtZeroCount, m.review.unassignedCount, m.review.phasesOnlyPlannedCount);
      }
    });

  const metricsHistoryCmd = program
    .command("metrics-history")
    .description("Read last N system metrics from .planning/reports/metrics.jsonl (appended on each report generate).");
  metricsHistoryCmd
    .option("--n <count>", "Last N entries", "30")
    .option("--json", "Output as JSON array")
    .action(async (opts) => {
      const metricsPath = path.join(getReportsDir(), "metrics.jsonl");
      const content = await readIfExists(metricsPath);
      const lines = (content || "").trim().split("\n").filter(Boolean);
      const n = Math.max(1, parseInt(opts.n, 10) || 30);
      const last = lines.slice(-n).map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);
      if (opts.json) {
        console.log(JSON.stringify(last, null, 2));
      } else {
        for (const m of last) {
          console.log("%s\t%s%%\topen=%s\tagents=%s\tquestions=%s", m.at, m.completionRate, m.tasksOpen, m.activeAgentsCount, m.openQuestionsCount);
        }
      }
    });

  program
    .command("workflow")
    .description("Print agent workflow summary (also shown in planning --help)")
    .action(() => {
      console.log(WORKFLOW_HELP_TEXT.trim());
    });

  async function runContextQuick(opts = {}) {
    const state = await loadState();
    const reg = await loadTaskRegistry();
    if (!state || !reg) {
      console.error("STATE.xml or TASK-REGISTRY.xml not found.");
      process.exitCode = 1;
      return;
    }
    const openTasks = reg.tasks.filter((t) => t.status !== "done");
    const out = {
      currentPhase: state.currentPhase,
      currentPlan: state.currentPlan,
      status: state.status,
      nextAction: state.nextAction,
      agents: state.agents,
      openTasks: openTasks.map((t) => ({ id: t.id, status: t.status, agentId: t.agentId, goal: t.goal, phase: t.phase })),
      phaseProgress: (() => {
        const byPhase = new Map();
        for (const t of reg.tasks) {
          const p = t.phase || "?";
          if (!byPhase.has(p)) byPhase.set(p, { done: 0, total: 0 });
          byPhase.get(p).total++;
          if (t.status === "done") byPhase.get(p).done++;
        }
        return Object.fromEntries(byPhase);
      })(),
    };
    if (opts.json) {
      console.log(JSON.stringify(out, null, 2));
    } else {
      console.log("STATE  phase=%s  plan=%s  status=%s", out.currentPhase, out.currentPlan, out.status);
      console.log("next-action: %s", out.nextAction);
      console.log("\nAGENTS");
      for (const a of out.agents) {
        console.log("  %s  name=%s  phase=%s  status=%s", a.id, a.name, a.phase, a.status);
      }
      console.log("\nOPEN TASKS (who is working on what)");
      for (const t of openTasks) {
        console.log("  %s [%s]  agent=%s  %s", t.id, t.status, t.agentId, t.goal);
      }
      console.log("\nPHASE PROGRESS");
      for (const [ph, v] of Object.entries(out.phaseProgress)) {
        const pct = v.total ? Math.round((v.done / v.total) * 100) : 0;
        console.log("  %s: %s/%s (%s%%)", ph, v.done, v.total, pct);
      }
    }
  }

  // ---- Context menu: quick workflows so you don't need to know agent IDs or read files ----
  const contextCmd = program
    .command("context")
    .description("Get relevant context quickly (macros / workflows; no need to know agent IDs).");
  contextCmd
    .command("quick")
    .description("One-shot: snapshot + who is working on what (agents + open tasks). No agent ID needed.")
    .option("--json", "Output as JSON")
    .action((opts) => runContextQuick(opts));
  contextCmd
    .command("sprint")
    .description("Context window for current (or given) sprint: paths + summary. For agents/LLM.")
    .option("--sprint-index <k>", "Sprint (0-based)")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const config = await getConfig();
      const state = await loadState();
      const roadmap = await loadRoadmap();
      const reg = await loadTaskRegistry();
      if (!roadmap?.length) {
        console.error("ROADMAP.xml not found.");
        process.exitCode = 1;
        return;
      }
      const size = config.sprintSize ?? 5;
      let k = opts.sprintIndex != null ? parseInt(opts.sprintIndex, 10) : null;
      if (k == null && state?.currentPhase) {
        const idx = roadmap.findIndex((p) => p.id === state.currentPhase || String(state.currentPhase).padStart(2, "0") === p.id);
        k = idx >= 0 ? Math.floor(idx / size) : 0;
      }
      k = k ?? 0;
      const phaseIds = getSprintPhaseIds(roadmap, size, k);
      const phases = roadmap.filter((p) => phaseIds.includes(p.id));
      const tasksInSprint = (reg?.tasks ?? []).filter((t) => phaseIds.includes(t.phase));
      const paths = [
        path.relative(ROOT, path.join(PLANNING_DIR, "STATE.xml")),
        path.relative(ROOT, path.join(PLANNING_DIR, "TASK-REGISTRY.xml")),
        path.relative(ROOT, path.join(PLANNING_DIR, "ROADMAP.xml")),
        path.relative(ROOT, path.join(PLANNING_DIR, "REQUIREMENTS.xml")),
        path.relative(ROOT, path.join(PLANNING_DIR, "DECISIONS.xml")),
      ];
      const phaseDirs = await fs.readdir(PHASES_DIR, { withFileTypes: true }).catch(() => []);
      for (const d of phaseDirs) {
        if (!d.isDirectory()) continue;
        const phaseNum = d.name.match(/^(\d+)-/)?.[1];
        if (phaseNum && phaseIds.includes(phaseNum.padStart(2, "0"))) {
          paths.push(path.relative(ROOT, path.join(PHASES_DIR, d.name)));
        }
      }
      const context = { sprintIndex: k, phaseIds, paths, summary: { phases: phases.map((p) => ({ id: p.id, title: p.title, status: p.status })), taskCount: tasksInSprint.length, agents: state?.agents ?? [] } };
      if (opts.json) {
        console.log(JSON.stringify(context, null, 2));
      } else {
        console.log("Context (sprint %s) phases: %s", k, phaseIds.join(", "));
        console.log("Paths:\n  " + context.paths.join("\n  "));
        console.log("Tasks in sprint: %s", context.summary.taskCount);
      }
    });
  contextCmd
    .command("full")
    .description("Full context: state + all tasks + roadmap phase list (compact).")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const state = await loadState();
      const reg = await loadTaskRegistry();
      const roadmap = await loadRoadmap();
      if (!state || !reg) {
        console.error("STATE.xml or TASK-REGISTRY.xml not found.");
        process.exitCode = 1;
        return;
      }
      const out = {
        state: { currentPhase: state.currentPhase, currentPlan: state.currentPlan, status: state.status, nextAction: state.nextAction, agents: state.agents },
        tasks: reg.tasks.length,
        tasksByPhase: (() => {
          const m = new Map();
          for (const t of reg.tasks) {
            const p = t.phase || "?";
            m.set(p, (m.get(p) || 0) + 1);
          }
          return Object.fromEntries(m);
        })(),
        roadmapPhases: roadmap?.length ?? 0,
        phaseTitles: (roadmap ?? []).slice(0, 20).map((p) => ({ id: p.id, title: p.title, status: p.status })),
      };
      if (opts.json) {
        console.log(JSON.stringify(out, null, 2));
      } else {
        console.log("State: phase=%s plan=%s", out.state.currentPhase, out.state.currentPlan);
        console.log("Tasks: %s total, by phase: %o", out.tasks, out.tasksByPhase);
        console.log("Roadmap: %s phases", out.roadmapPhases);
        console.log("First phases: %s", out.phaseTitles.map((p) => p.id + " " + p.title).join(" | "));
      }
    });
  contextCmd
    .command("tokens")
    .description("Token report: sprint phases/tasks, phase folder sizes, PRD (REQUIREMENTS.xml) size.")
    .option("--sprint-index <k>", "Sprint (0-based); omit for current sprint")
    .option("--phase <id>", "Single phase dir token count only")
    .option("--prd", "Only REQUIREMENTS.xml (PRD/requirements) token breakdown")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const jsonOut = opts.json;
      const report = { prd: null, sprint: null, phaseDir: null };
      const runPrd = opts.prd || (opts.phase == null && opts.sprintIndex == null);
      const runSprint = opts.sprintIndex != null || (opts.phase == null && !opts.prd);
      if (runPrd) {
        const refStats = await getReferencesDocStats();
        if (refStats) {
          report.prd = { totalChars: refStats.totalChars, totalTokens: refStats.totalTokens, docs: refStats.docs };
        }
      }
      if (opts.phase != null) {
        const phaseStats = await getPhaseDirTokenStats(opts.phase);
        report.phaseDir = phaseStats;
        if (!jsonOut) {
          console.log("Phase %s dir: %s  chars=%s tokens≈%s", phaseStats.phaseId, phaseStats.dir ?? "—", phaseStats.totalChars, phaseStats.totalTokens);
          for (const f of phaseStats.files) {
            console.log("  %s  chars=%s tokens≈%s", f.file, f.chars, f.tokens);
          }
        }
      }
      if (runSprint) {
        const config = await getConfig();
        const roadmap = await loadRoadmap();
        const reg = await loadTaskRegistry();
        const state = await loadState();
        if (roadmap?.length) {
          const size = config.sprintSize ?? 5;
          let k = opts.sprintIndex != null ? parseInt(opts.sprintIndex, 10) : null;
          if (k == null && state?.currentPhase) {
            const idx = roadmap.findIndex((p) => p.id === state.currentPhase || String(state.currentPhase).padStart(2, "0") === p.id);
            k = idx >= 0 ? Math.floor(idx / size) : 0;
          }
          k = k ?? 0;
          const phaseIds = getSprintPhaseIds(roadmap, size, k);
          const phases = roadmap.filter((p) => phaseIds.includes(p.id));
          const tasksInSprint = (reg?.tasks ?? []).filter((t) => phaseIds.includes(t.phase));
          const phaseDirStats = [];
          for (const ph of phaseIds) {
            const st = await getPhaseDirTokenStats(ph);
            phaseDirStats.push(st);
          }
          const sprintTokens = phaseDirStats.reduce((s, st) => s + st.totalTokens, 0);
          const taskTextTokens = tasksInSprint.reduce((s, t) => s + estimateTokens(t.goal + (t.keywords || "")), 0);
          report.sprint = {
            sprintIndex: k,
            phaseIds,
            phases: phases.map((p) => ({ id: p.id, title: p.title, status: p.status })),
            taskCount: tasksInSprint.length,
            taskTextTokens,
            phaseDirs: phaseDirStats.map((st) => ({ phaseId: st.phaseId, dir: st.dir, totalTokens: st.totalTokens, totalChars: st.totalChars })),
            sprintTotalTokens: sprintTokens + taskTextTokens,
          };
          if (!jsonOut && opts.phase == null) {
            console.log("Sprint %s  phases: %s  tasks: %s  task-text tokens≈%s", k, phaseIds.join(", "), report.sprint.taskCount, taskTextTokens);
            console.log("Phase dirs tokens: %s  total sprint≈%s", phaseDirStats.map((s) => s.phaseId + ":" + s.totalTokens).join(" "), report.sprint.sprintTotalTokens);
          }
        }
      }
      if (report.prd && !jsonOut && runPrd) {
        console.log("PRD/REQUIREMENTS: total chars=%s tokens≈%s", report.prd.totalChars, report.prd.totalTokens);
        for (const d of report.prd.docs) {
          console.log("  %s  chars=%s tokens≈%s", d.path, d.chars, d.tokens);
        }
      }
      if (jsonOut) {
        console.log(JSON.stringify(report, null, 2));
      }
    });

  program
    .command("quick")
    .description("Macro: same as 'context quick' — snapshot + who is working on what (no agent ID needed)")
    .option("--json", "Output as JSON")
    .action((opts) => runContextQuick(opts));
  program
    .command("status")
    .description("Macro: same as 'context quick' — one-shot status and open work")
    .option("--json", "Output as JSON")
    .action((opts) => runContextQuick(opts));

  program
    .command("agents")
    .description("List agents in this repo (from STATE.xml)")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const state = await loadState();
      if (!state) {
        console.error("STATE.xml not found.");
        process.exitCode = 1;
        return;
      }
      if (opts.json) {
        console.log(JSON.stringify(state.agents, null, 2));
      } else {
        for (const a of state.agents) {
          console.log(`${a.id}  name=${a.name}  phase=${a.phase}  plan=${a.plan}  status=${a.status}`);
        }
      }
    });

  const cleanupCmd = program
    .command("cleanup")
    .description("Remove inactive or stale data from planning state.");
  cleanupCmd
    .command("agents")
    .description("Remove inactive agents from STATE.xml. Runs automatically on other CLI commands.")
    .option("--dry-run", "Only print what would be removed, do not write")
    .action(async (opts) => {
      await cleanupInactiveAgents({ dryRun: !!opts.dryRun });
    });

  const tasksListCmd = new Command("list")
    .description("List tasks (optional filters)")
    .option("--phase <id>", "Filter by phase id")
    .option("--agent <id>", "Filter by agent id")
    .option("--status <s>", "Filter by status")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const reg = await loadTaskRegistry();
      if (!reg) {
        console.error("TASK-REGISTRY.xml not found.");
        process.exitCode = 1;
        return;
      }
      let list = reg.tasks;
      if (opts.phase) list = list.filter((t) => t.phase === opts.phase);
      if (opts.agent) list = list.filter((t) => t.agentId === opts.agent);
      if (opts.status) list = list.filter((t) => t.status === opts.status);
      if (opts.json) {
        console.log(JSON.stringify(list, null, 2));
      } else {
        for (const t of list) {
          console.log(`${t.id}  [${t.status}]  agent=${t.agentId}  ${t.goal}`);
        }
      }
    });
  program.command("tasks").description("Task registry").addCommand(tasksListCmd);

  const sprintCmd = program
    .command("sprint")
    .description("Sprint = group of N phases (configurable). Set size, show sprints, or get context window.");
  sprintCmd
    .command("set-size <n>")
    .description("Set number of phases per sprint (default 5)")
    .action(async (n) => {
      const num = parseInt(n, 10);
      if (Number.isNaN(num) || num < 1) {
        console.error("sprint set-size requires a positive number.");
        process.exitCode = 1;
        return;
      }
      await setConfig({ sprintSize: num });
      console.log(`Sprint size set to ${num}.`);
    });
  sprintCmd
    .command("show")
    .description("Show sprint boundaries and phases in each sprint")
    .option("--sprint-index <k>", "Show only this sprint (0-based)")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const config = await getConfig();
      const roadmap = await loadRoadmap();
      if (!roadmap || roadmap.length === 0) {
        console.error("ROADMAP.xml not found or has no phases.");
        process.exitCode = 1;
        return;
      }
      const size = config.sprintSize ?? 5;
      const sprintIndex = opts.sprintIndex != null ? parseInt(opts.sprintIndex, 10) : null;
      const totalSprints = Math.ceil(roadmap.length / size);
      const out = [];
      for (let i = 0; i < totalSprints; i++) {
        if (sprintIndex != null && i !== sprintIndex) continue;
        const phaseIds = getSprintPhaseIds(roadmap, size, i);
        const phases = roadmap.filter((p) => phaseIds.includes(p.id));
        out.push({ sprintIndex: i, phaseIds, phases });
      }
      if (opts.json) {
        console.log(JSON.stringify(sprintIndex != null ? out[0] : out, null, 2));
      } else {
        for (const s of out) {
          console.log(`Sprint ${s.sprintIndex}: phases ${s.phaseIds.join(", ")}`);
          for (const p of s.phases) {
            console.log(`  ${p.id}  ${p.title}  [${p.status}]`);
          }
        }
      }
    });
  sprintCmd
    .command("context")
    .description("Context window: paths and summary for a sprint (for agents/LLM context)")
    .option("--sprint-index <k>", "Sprint (0-based); default current phase's sprint")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const config = await getConfig();
      const state = await loadState();
      const roadmap = await loadRoadmap();
      const reg = await loadTaskRegistry();
      if (!roadmap || roadmap.length === 0) {
        console.error("ROADMAP.xml not found.");
        process.exitCode = 1;
        return;
      }
      const size = config.sprintSize ?? 5;
      let k = opts.sprintIndex != null ? parseInt(opts.sprintIndex, 10) : null;
      if (k == null && state?.currentPhase) {
        const idx = roadmap.findIndex((p) => p.id === state.currentPhase || p.id === String(state.currentPhase).padStart(2, "0"));
        k = idx >= 0 ? Math.floor(idx / size) : 0;
      }
      k = k ?? 0;
      const phaseIds = getSprintPhaseIds(roadmap, size, k);
      const phases = roadmap.filter((p) => phaseIds.includes(p.id));
      const tasksInSprint = (reg?.tasks ?? []).filter((t) => phaseIds.includes(t.phase));
      const paths = [
        path.join(PLANNING_DIR, "STATE.xml"),
        path.join(PLANNING_DIR, "TASK-REGISTRY.xml"),
        path.join(PLANNING_DIR, "ROADMAP.xml"),
        path.join(PLANNING_DIR, "REQUIREMENTS.xml"),
        path.join(PLANNING_DIR, "DECISIONS.xml"),
      ];
      const phaseDirs = await fs.readdir(PHASES_DIR, { withFileTypes: true }).catch(() => []);
      for (const d of phaseDirs) {
        if (!d.isDirectory()) continue;
        const phaseNum = d.name.match(/^(\d+)-/)?.[1];
        if (phaseNum && phaseIds.includes(phaseNum.padStart(2, "0"))) {
          paths.push(path.join(PHASES_DIR, d.name));
        }
      }
      const context = {
        sprintIndex: k,
        phaseIds,
        paths: paths.map((p) => path.relative(ROOT, p)),
        summary: {
          phases: phases.map((p) => ({ id: p.id, title: p.title, status: p.status })),
          taskCount: tasksInSprint.length,
          agents: state?.agents ?? [],
        },
      };
      if (opts.json) {
        console.log(JSON.stringify(context, null, 2));
      } else {
        console.log("Context (sprint " + k + ") phases: " + phaseIds.join(", "));
        console.log("Paths:\n  " + context.paths.join("\n  "));
        console.log("Tasks in sprint: " + context.summary.taskCount);
      }
    });

  program
    .command("questions")
    .description("List open questions from phase PLANs (answers feed DECISIONS/REQUIREMENTS)")
    .option("--phase <id>", "Only this phase")
    .option("--all", "Include closed questions")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const results = await loadOpenQuestions(opts);
      if (opts.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        for (const { phaseId, planPath, questions: qs } of results) {
          for (const q of qs) {
            console.log("[%s] %s  %s", phaseId, q.id, q.status);
            console.log("  %s", q.text);
            console.log("  file: %s", planPath);
          }
        }
        if (results.length === 0) console.log("No open questions found.");
      }
    });

  program
    .command("plans")
    .description("List plans (PLAN.xml) and whether they were executed (have SUMMARY.xml). Use --unran for plans not yet run, --ran for executed only.")
    .option("--phase <id>", "Only this phase")
    .option("--unran", "Only plans without a SUMMARY (not yet executed)")
    .option("--ran", "Only plans that have a SUMMARY (executed)")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const results = await loadPlansExecution(opts);
      if (opts.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        for (const { phaseId, phaseDir, plans } of results) {
          console.log("Phase %s  %s", phaseId, phaseDir);
          for (const p of plans) {
            console.log("  %s  %s  %s", p.planId, p.executed ? "ran" : "unran", p.summaryFile ?? "—");
          }
        }
        if (results.length === 0) console.log("No plans found.");
      }
    });

  const profileCmd = program.command("profile").description("Swap profiles to see CLI from different perspectives (e.g. agent). Stored in planning-config.toml.");
  profileCmd
    .command("list")
    .description("List available profiles")
    .action(async () => {
      const config = await getConfig();
      console.log("Current profile: %s", config.currentProfile);
      for (const [name, p] of Object.entries(config.profiles ?? {})) {
        console.log("  %s  %s", name, p.description ?? "");
      }
    });
  profileCmd
    .command("use <name>")
    .description("Set active profile (e.g. human, agent)")
    .action(async (name) => {
      const config = await getConfig();
      if (!config.profiles?.[name]) {
        console.error("Unknown profile: %s. Use 'planning profile list'.", name);
        process.exitCode = 1;
        return;
      }
      await setConfig({ currentProfile: name });
      console.log("Profile set to: %s", name);
    });
  profileCmd
    .command("show")
    .description("Show current profile")
    .action(async () => {
      const config = await getConfig();
      console.log(config.currentProfile);
      const p = config.profiles?.[config.currentProfile];
      if (p) console.log("  %s", p.description ?? "");
    });

  program
    .command("bundle")
    .description("Canonical agent context: snapshot + context paths + open tasks + open questions (same as simulate loop). Use for orchestration; prefer over simulate loop.")
    .option("--json", "Output as JSON (default for agent profile)")
    .action(async (opts) => {
      await appendUsageLog("bundle");
      const config = await getConfig();
      const useJson = opts.json ?? config.profiles?.[config.currentProfile]?.defaultJson === true;
      const bundle = await buildAgentLoopBundle();
      if (useJson) {
        console.log(JSON.stringify(bundle, null, 2));
      } else {
        console.log("=== Agent bundle (canonical context) ===");
        console.log("Snapshot: phase=%s plan=%s status=%s", bundle.snapshot?.currentPhase, bundle.snapshot?.currentPlan, bundle.snapshot?.status);
        console.log("Next action: %s", bundle.snapshot?.nextAction ?? "—");
        console.log("\nContext sprint %s  phases: %s", bundle.context.sprintIndex, bundle.context.phaseIds.join(", "));
        console.log("Paths (%s):\n  %s", bundle.context.paths.length, bundle.context.paths.join("\n  "));
        console.log("\nOpen tasks: %s", bundle.openTasks.length);
        for (const t of bundle.openTasks.slice(0, 10)) {
          console.log("  %s [%s] %s", t.id, t.status, t.goal);
        }
        if (bundle.openTasks.length > 10) console.log("  ...");
        console.log("\nOpen questions: %s", bundle.openQuestions.length);
        for (const q of bundle.openQuestions.slice(0, 5)) {
          console.log("  [%s] %s", q.phaseId, q.text);
        }
        if (bundle.openQuestions.length > 5) console.log("  ...");
      }
    });

  const simulateCmd = program
    .command("simulate")
    .description("Simulate the agent loop: what context an agent would get when it runs the loop. Use with agent profile for Codex-friendly output. Prefer 'planning bundle' for canonical context.");
  simulateCmd
    .command("loop")
    .description("Run the full agent loop simulation: snapshot + context paths + summary + open tasks + open questions (single bundle for Codex/agents)")
    .option("--json", "Output as JSON (default for agent profile)")
    .action(async (opts) => {
      await appendUsageLog("simulate-loop");
      const config = await getConfig();
      const useJson = opts.json ?? config.profiles?.[config.currentProfile]?.defaultJson === true;
      const bundle = await buildAgentLoopBundle();
      if (useJson) {
        console.log(JSON.stringify(bundle, null, 2));
      } else {
        console.log("=== Agent loop simulation ===");
        console.log("Snapshot: phase=%s plan=%s status=%s", bundle.snapshot?.currentPhase, bundle.snapshot?.currentPlan, bundle.snapshot?.status);
        console.log("Next action: %s", bundle.snapshot?.nextAction ?? "—");
        console.log("\nContext sprint %s  phases: %s", bundle.context.sprintIndex, bundle.context.phaseIds.join(", "));
        console.log("Paths (%s):\n  %s", bundle.context.paths.length, bundle.context.paths.join("\n  "));
        console.log("\nOpen tasks: %s", bundle.openTasks.length);
        for (const t of bundle.openTasks.slice(0, 10)) {
          console.log("  %s [%s] %s", t.id, t.status, t.goal);
        }
        if (bundle.openTasks.length > 10) console.log("  ...");
        console.log("\nOpen questions: %s", bundle.openQuestions.length);
        for (const q of bundle.openQuestions.slice(0, 5)) {
          console.log("  [%s] %s", q.phaseId, q.text);
        }
        if (bundle.openQuestions.length > 5) console.log("  ...");
      }
    });
  simulateCmd
    .command("context")
    .description("Simulate only the context window (paths + summary for current sprint)")
    .option("--sprint-index <k>", "Sprint (0-based)")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const config = await getConfig();
      const useJson = opts.json ?? config.profiles?.[config.currentProfile]?.defaultJson === true;
      const bundle = await buildAgentLoopBundle(opts);
      const out = { role: "agent-context", sprintIndex: bundle.context.sprintIndex, phaseIds: bundle.context.phaseIds, paths: bundle.context.paths, summary: bundle.context.summary };
      if (useJson) {
        console.log(JSON.stringify(out, null, 2));
      } else {
        console.log("Sprint %s  phases: %s", out.sprintIndex, out.phaseIds.join(", "));
        console.log("Paths:\n  " + out.paths.join("\n  "));
      }
    });

  const reportCmd = program
    .command("report")
    .description("Generate markdown report from agent loop bundle (EJS template) and optionally view in a minimal markdown viewer.");
  reportCmd
    .command("generate")
    .description("Generate agent-loop report (Markdown) to .planning/reports/latest.md (only this file; older report .mds are removed).")
    .action(async () => {
      try {
        const { path: outPath } = await generateReportMd();
        console.log("Report written to %s", path.relative(ROOT, outPath));
      } catch (e) {
        console.error(e.message);
        process.exitCode = 1;
      }
    });
  reportCmd
    .command("view")
    .description("Generate report if needed, start a minimal HTTP server, and open the markdown report in your browser.")
    .option("--port <n>", "Port for the report server", "3847")
    .option("--no-open", "Do not open browser automatically")
    .action(async (opts) => {
      await fs.mkdir(getReportsDir(), { recursive: true });
      try {
        await generateReportMd();
      } catch (e) {
        console.error("Generate failed:", e.message);
        process.exitCode = 1;
        return;
      }
      const port = parseInt(opts.port, 10) || 3847;
      const server = createReportServer(getReportsDir(), port);
      server.listen(port, "127.0.0.1", () => {
        const url = `http://127.0.0.1:${port}/viewer.html`;
        console.log("Report viewer: %s", url);
        if (opts.open !== false) openBrowser(url);
      });
    });

  program
    .command("review")
    .description("Find phases and tasks that need review (0% progress, unassigned tasks, phases with only planned work). Use --json to output data for serving.")
    .option("--json", "Output review items as JSON (e.g. for tools or APIs)")
    .action(async (opts) => {
      const reg = await loadTaskRegistry();
      const roadmap = await loadRoadmap();
      if (!reg) {
        console.error("TASK-REGISTRY.xml not found.");
        process.exitCode = 1;
        return;
      }
      const review = computeReviewItems(reg, roadmap);
      if (opts.json) {
        console.log(JSON.stringify(review, null, 2));
        return;
      }
      console.log(formatReviewLines(review));
    });

  program
    .command("state")
    .description("Show full state (current phase, plan, status, next-action, agents)")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const state = await loadState();
      if (!state) {
        console.error("STATE.xml not found.");
        process.exitCode = 1;
        return;
      }
      const out = {
        currentPhase: state.currentPhase,
        currentPlan: state.currentPlan,
        status: state.status,
        nextAction: state.nextAction,
        agents: state.agents,
      };
      if (opts.json) {
        console.log(JSON.stringify(out, null, 2));
      } else {
        console.log("current-phase:", state.currentPhase);
        console.log("current-plan:", state.currentPlan);
        console.log("status:", state.status);
        console.log("next-action:", state.nextAction);
        console.log("agents:", state.agents.length);
      }
    });

  const artifactCmd = program.command("artifact").description("Read or list planning artifacts (XML and docs).");
  artifactCmd
    .command("read <path>")
    .description("Read artifact by path (relative to repo root or .planning)")
    .option("--json", "Output parsed as JSON (for XML)")
    .action(async (artifactPath, opts) => {
      let full;
      if (path.isAbsolute(artifactPath)) {
        full = artifactPath;
      } else {
        const inPlanning = path.join(PLANNING_DIR, artifactPath);
        try {
          await fs.access(inPlanning);
          full = inPlanning;
        } catch {
          full = path.join(ROOT, artifactPath);
        }
      }
      try {
        const content = await fs.readFile(full, "utf8");
        if (opts.json && (full.endsWith(".xml") || content.trimStart().startsWith("<?xml") || content.trimStart().startsWith("<"))) {
          const obj = parser.parse(content);
          console.log(JSON.stringify(obj, null, 2));
        } else {
          process.stdout.write(content);
        }
      } catch (e) {
        console.error("Read failed:", e.message);
        process.exitCode = 1;
      }
    });
  artifactCmd
    .command("list")
    .description("List artifacts in a directory")
    .option("--dir <path>", "Directory (default: .planning)", ".planning")
    .action(async (opts) => {
      const dir = path.resolve(ROOT, opts.dir);
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const e of entries) {
        console.log(e.name + (e.isDirectory() ? "/" : ""));
      }
    });

  const packCmd = program.command("pack").description("Planning pack helpers (static JSON for in-browser cockpit embeds).");
  packCmd
    .command("embed-build")
    .description(
      "Write builtin-packs.json: snapshot of .planning (rp-builtin-init) and optional docs folder (.md/.mdx bodies, front matter stripped).",
    )
    .requiredOption("-o, --out <file>", "Output JSON path (relative to cwd unless absolute)")
    .option(
      "--docs-dir <path>",
      "Directory of markdown/MDX for the rp-builtin-docs pack (relative to project --root unless absolute); omit for init-only",
    )
    .option("--planning-dir <path>", "Override .planning directory (default: <root>/.planning)")
    .option("--docs-path-prefix <prefix>", "Virtual path prefix in JSON for docs files (default: docs/repo-planner)")
    .action(async (opts) => {
      const outFile = path.isAbsolute(opts.out) ? opts.out : path.resolve(process.cwd(), opts.out);
      const projectRoot = ROOT;
      const docsDir = opts.docsDir
        ? path.isAbsolute(opts.docsDir)
          ? opts.docsDir
          : path.resolve(projectRoot, opts.docsDir)
        : null;
      const planningDir = opts.planningDir
        ? path.isAbsolute(opts.planningDir)
          ? opts.planningDir
          : path.resolve(projectRoot, opts.planningDir)
        : undefined;
      try {
        const payload = runPlanningEmbedBuildSync({
          projectRoot,
          outFile,
          docsDir,
          planningDir,
          docsPathPrefix: opts.docsPathPrefix,
        });
        console.log(formatEmbedBuildLogLine(projectRoot, outFile, payload));
      } catch (e) {
        console.error(e?.message ?? e);
        process.exitCode = 1;
      }
    });

  program
    .command("new-agent-id")
    .description("Generate a new agent id and show snapshot")
    .action(async () => {
      await appendUsageLog("new-agent-id");
      await snapshot();
      generateAgentId();
    });

  program
    .command("task-update <taskId> <status> [agentId]")
    .description("Update task status and optionally assign agent")
    .action(async (taskId, status, agentId) => {
      const taskPath = path.join(PLANNING_DIR, "TASK-REGISTRY.xml");
      const xml = await readIfExists(taskPath);
      if (!xml) {
        console.error("TASK-REGISTRY.xml not found.");
        process.exitCode = 1;
        return;
      }
      const updated = updateTaskStatus(xml, taskId, status, agentId);
      if (!updated) {
        console.error("Task " + taskId + " not found.");
        process.exitCode = 1;
        return;
      }
      await writeXml(taskPath, updated);
    });

  program
    .command("task-create <phaseId> <taskId> <agentId> [status]")
    .description("Create a task in a phase")
    .option("--goal <text>", "Task goal", "TBD")
    .option("--keywords <text>", "Keywords", "")
    .option("--command <cmd>", "Command", "rg TODO .")
    .action(async (phaseId, taskId, agentId, status, opts) => {
      const taskPath = path.join(PLANNING_DIR, "TASK-REGISTRY.xml");
      const xml = await readIfExists(taskPath);
      if (!xml) {
        console.error("TASK-REGISTRY.xml not found.");
        process.exitCode = 1;
        return;
      }
      const taskBlock = createTaskBlock({
        taskId,
        agentId,
        status: status ?? "planned",
        goal: opts.goal ?? "TBD",
        keywords: opts.keywords ?? "",
        command: opts.command ?? "rg TODO .",
      });
      const updated = insertTask(xml, phaseId, taskBlock);
      if (!updated) {
        console.error("Phase " + phaseId + " not found.");
        process.exitCode = 1;
        return;
      }
      await writeXml(taskPath, updated);
    });

  program
    .command("phase-update <phaseId> <status>")
    .description("Update phase status in ROADMAP.xml")
    .action(async (phaseId, status) => {
      const roadmapPath = path.join(PLANNING_DIR, "ROADMAP.xml");
      const xml = await readIfExists(roadmapPath);
      if (!xml) {
        console.error("ROADMAP.xml not found.");
        process.exitCode = 1;
        return;
      }
      const updated = updatePhaseStatus(xml, phaseId, status);
      if (!updated) {
        console.error("Phase " + phaseId + " not found.");
        process.exitCode = 1;
        return;
      }
      await writeXml(roadmapPath, updated);
    });

  program
    .command("agent-close <agentId>")
    .description("Set agent to inactive in STATE.xml")
    .action(async (agentId) => {
      const statePath = path.join(PLANNING_DIR, "STATE.xml");
      const xml = await readIfExists(statePath);
      if (!xml) {
        console.error("STATE.xml not found.");
        process.exitCode = 1;
        return;
      }
      const updated = deactivateAgent(xml, agentId);
      if (!updated) {
        console.error("Agent " + agentId + " not found.");
        process.exitCode = 1;
        return;
      }
      await writeXml(statePath, updated);
    });

  program
    .command("plan-create <phaseId> <phaseName> <planId> <phaseDir>")
    .description("Create PLAN.xml from template in phase dir")
    .action(async (phaseId, phaseName, planId, phaseDir) => {
      const templatePath = path.join(PLANNING_DIR, "templates", "PLAN-TEMPLATE.xml");
      const template = await readIfExists(templatePath);
      if (!template) {
        console.error("PLAN-TEMPLATE.xml not found.");
        process.exitCode = 1;
        return;
      }
      const date = new Date().toISOString().slice(0, 10);
      const planXml = createPhasePlanFromTemplate(template, { phaseId: planId, phaseName, date });
      const outPath = path.join(PHASES_DIR, phaseDir, `${planId}-PLAN.xml`);
      await writeXml(outPath, planXml);
    });

  program
    .command("iterate")
    .description("Greenfield overnight loop: run an agent until a completion promise appears in output. Progress via git each iteration. See DECISIONS.xml RALPH-WIGGUM-LOOP-GREENFIELD.")
    .requiredOption("--run <cmd>", "Command to run each iteration (e.g. cursor-agent); task file content is piped to stdin.")
    .option("--task <path>", "Task spec file (content sent to agent stdin).")
    .option("--promise <str>", "String that must appear in run output to stop.", "<promise>COMPLETE</promise>")
    .option("--max <n>", "Max iterations.", "50")
    .option("--output <path>", "Where to write last run stdout for promise check.", "planning-iterate-output.txt")
    .option("--commit <msg>", "Git commit message prefix after each iteration; use \"\" to skip.", "planning iter")
    .option("--cwd <path>", "Working directory.")
    .action(async (opts) => {
      const runCmd = opts.run;
      const taskPath = opts.task;
      const promise = opts.promise;
      const maxIter = Math.max(1, parseInt(opts.max, 10) || 50);
      const outputPath = opts.output;
      const commitMsg = opts.commit;
      const cwd = path.resolve(opts.cwd || process.cwd());
      const taskContent = taskPath ? readFileSync(path.resolve(cwd, taskPath), "utf8") : null;
      const outputAbs = path.resolve(cwd, outputPath);
      for (let iter = 1; iter <= maxIter; iter++) {
        console.error("[planning iterate] iteration %s/%s", iter, maxIter);
        const parts = runCmd.trim().split(/\s+/);
        const result = spawnSync(parts[0], parts.slice(1), {
          cwd,
          encoding: "utf8",
          maxBuffer: 10 * 1024 * 1024,
          input: taskContent ?? undefined,
        });
        const stdout = result.stdout ?? "";
        writeFileSync(outputAbs, stdout, "utf8");
        if (result.stderr) console.error(result.stderr);
        if (typeof stdout === "string" && stdout.includes(promise)) {
          console.error("[planning iterate] promise found. Done.");
          return;
        }
        if (commitMsg) {
          spawnSync("git", ["add", "-A"], { cwd });
          const status = spawnSync("git", ["status", "--short"], { cwd, encoding: "utf8" });
          if (status.stdout?.trim()) spawnSync("git", ["commit", "-m", `${commitMsg} ${iter}`], { cwd });
        }
      }
      console.error("[planning iterate] max iterations (%s) reached without promise.", maxIter);
      process.exitCode = 1;
    });

  program
    .command("iterate-tasks")
    .description("Brownfield overnight loop: run agent task-by-task from TASK-REGISTRY until no open tasks or max iterations. See DECISIONS.xml BROWNFIELD-OVERNIGHT-LOOP and OVERNIGHT-DEFINITION-OF-DONE.")
    .requiredOption("--run <cmd>", "Command to run each iteration (e.g. codex-agent); receives JSON with bundle and currentTask on stdin.")
    .option("--phase <id>", "Only consider open tasks in this phase (e.g. 50)")
    .option("--max <n>", "Max iterations.", "50")
    .option("--commit <msg>", "Git commit message prefix after each iteration; use \"\" to skip.", "planning iter-tasks")
    .option("--cwd <path>", "Working directory.")
    .option("--stop-file <path>", "If this file exists, stop after current iteration.", ".planning/stop-overnight")
    .action(async (opts) => {
      const runCmd = opts.run;
      const phaseId = opts.phase || null;
      const maxIter = Math.max(1, parseInt(opts.max, 10) || 50);
      const commitMsg = opts.commit;
      const cwd = path.resolve(opts.cwd || process.cwd());
      const stopFile = opts.stopFile ? path.resolve(cwd, opts.stopFile) : null;
      for (let iter = 1; iter <= maxIter; iter++) {
        const reg = await loadTaskRegistry();
        if (!reg) {
          console.error("[planning iterate-tasks] TASK-REGISTRY.xml not found.");
          process.exitCode = 1;
          return;
        }
        let openTasks = (reg.tasks ?? []).filter((t) => (t.status || "").toLowerCase() !== "done");
        if (phaseId) openTasks = openTasks.filter((t) => String(t.phase || "").padStart(2, "0") === String(phaseId).padStart(2, "0"));
        if (openTasks.length === 0) {
          console.error("[planning iterate-tasks] No open tasks in scope. Done.");
          return;
        }
        if (stopFile && await fs.readFile(stopFile, "utf8").then(() => true).catch(() => false)) {
          console.error("[planning iterate-tasks] Stop file found. Stopping.");
          return;
        }
        const bundle = await buildAgentLoopBundle();
        const currentTask = openTasks[0];
        const stdinPayload = JSON.stringify({ bundle, currentTask });
        console.error("[planning iterate-tasks] iteration %s/%s  task=%s  %s", iter, maxIter, currentTask.id, currentTask.goal?.slice(0, 50) ?? "");
        const parts = runCmd.trim().split(/\s+/);
        const result = spawnSync(parts[0], parts.slice(1), {
          cwd,
          encoding: "utf8",
          maxBuffer: 10 * 1024 * 1024,
          input: stdinPayload,
        });
        if (result.stderr) console.error(result.stderr);
        if (commitMsg) {
          spawnSync("git", ["add", "-A"], { cwd });
          const status = spawnSync("git", ["status", "--short"], { cwd, encoding: "utf8" });
          if (status.stdout?.trim()) spawnSync("git", ["commit", "-m", `${commitMsg} ${iter}`], { cwd });
        }
      }
      console.error("[planning iterate-tasks] max iterations (%s) reached.", maxIter);
      process.exitCode = 1;
    });

  const setupCmd = program
    .command("setup")
    .description("Setup and onboarding: verify environment for greenfield or brownfield planning.");
  setupCmd
    .command("checklist")
    .description("Run setup checklist: git, .planning presence, planning CLI. Use for brownfield (existing repo) or before starting greenfield (new repo).")
    .option("--json", "Output machine-readable pass/fail per item")
    .action(async (opts) => {
      const checks = [];
      const gitResult = spawnSync("git", ["--version"], { encoding: "utf8" });
      const gitOk = gitResult.status === 0;
      checks.push({ id: "git", name: "Git installed and on PATH", ok: gitOk });
      const planningDirOk = await fs.access(PLANNING_DIR).then(() => true).catch(() => false);
      checks.push({ id: "planning-dir", name: ".planning directory exists", ok: planningDirOk });
      let stateOk = false;
      let registryOk = false;
      if (planningDirOk) {
        stateOk = await fs.access(path.join(PLANNING_DIR, "STATE.xml")).then(() => true).catch(() => false);
        registryOk = await fs.access(path.join(PLANNING_DIR, "TASK-REGISTRY.xml")).then(() => true).catch(() => false);
      }
      checks.push({ id: "state-xml", name: ".planning/STATE.xml exists", ok: stateOk });
      checks.push({ id: "task-registry", name: ".planning/TASK-REGISTRY.xml exists", ok: registryOk });
      const allOk = checks.every((c) => c.ok);
      if (opts.json) {
        console.log(JSON.stringify({ ok: allOk, checks }, null, 2));
      } else {
        for (const c of checks) {
          console.log("%s  %s", c.ok ? "ok" : "FAIL", c.name);
        }
        if (!allOk) {
          console.error(
            "\nSetup incomplete. Install git, ensure you are in a repo with .planning (brownfield), or run `planning init` / `planning setup init` to bootstrap .planning (greenfield). See RepoPlanner README / INSTALL.md.",
          );
          process.exitCode = 1;
        }
      }
    });

  const runInitCmd = async (opts, cmd) => {
    try {
      const fromCmd = cmd && typeof cmd.opts === "function" ? cmd.opts() : {};
      await runPlanningInit({ ...fromCmd, ...(opts && typeof opts === "object" ? opts : {}) });
    } catch (e) {
      console.error(e?.message ?? e);
      process.exitCode = 1;
    }
  };

  setupCmd
    .command("init")
    .description(
      "Greenfield: create .planning/, copy templates, core XML, phase 01 plan/summary, optional AGENTS.md at repo root.",
    )
    .option("--force", "Overwrite bootstrap files if they already exist (destructive).")
    .option(
      "--minimal",
      "Bare .planning: XML + planning-config.toml + .planning/AGENTS.md; narrative REQUIREMENTS.md at repo root; no IMPLEMENTATION_PLAN.md; no .planning/reports (use REPOPLANNER_REPORTS_DIR).",
    )
    .option("--no-agents-md", "Do not create AGENTS.md.")
    .action(runInitCmd);

  program
    .command("init")
    .description("Alias for planning setup init — bootstrap .planning in the project root.")
    .option("--force", "Overwrite bootstrap files if they already exist (destructive).")
    .option(
      "--minimal",
      "Bare .planning: XML + planning-config.toml + .planning/AGENTS.md; narrative REQUIREMENTS.md at repo root; no IMPLEMENTATION_PLAN.md; no .planning/reports (use REPOPLANNER_REPORTS_DIR).",
    )
    .option("--no-agents-md", "Do not create AGENTS.md.")
    .action(runInitCmd);

  return program;
}

async function main() {
  const program = buildProgram();
  const argv = process.argv.slice(2);
  const top = argv[0];
  if (top && !["cleanup", "help", "init", "iterate", "iterate-tasks", "setup"].includes(top)) {
    await cleanupInactiveAgents({ silent: true });
  }
  await program.parseAsync(process.argv);
  if (!argv.length) {
    program.outputHelp();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
