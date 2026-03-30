/**
 * Shared planning parsers for RepoPlanner CLI and browser cockpit.
 * XML: same options as loop-cli (`fast-xml-parser`). Markdown: roadmap phases + progress table + section task-registry tables.
 */
import { XMLParser } from "fast-xml-parser";

export const planningXmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

export function ensureArray(x) {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function textNode(val) {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && "#text" in val) return String(val["#text"] ?? "");
  return String(val);
}

/**
 * @returns {{ tasks: Array<{id: string, agentId: string, status: string, phase: string, goal: string, keywords: string, commands: string[], depends: string}>, phases: Array<{id: string}> } | null}
 */
export function parseTaskRegistryXmlString(xml) {
  if (!xml || typeof xml !== "string") return null;
  try {
    const obj = planningXmlParser.parse(xml);
    const reg = obj["task-registry"] ?? obj;
    if (!reg || typeof reg !== "object") return null;
    const rawPhases = ensureArray(reg.phase ?? []);
    const tasks = [];
    const phaseIds = [];
    for (const ph of rawPhases) {
      const phaseId = String(ph["@_id"] ?? "").padStart(2, "0");
      phaseIds.push({ id: phaseId });
      const phaseTasks = ensureArray(ph.task ?? []);
      for (const t of phaseTasks) {
        const goal = t.goal ?? "";
        const keywords = t.keywords ?? "";
        const depends = t.depends ?? "";
        const commands = t.commands?.command != null ? ensureArray(t.commands.command).map((c) => textNode(c)) : [];
        tasks.push({
          id: t["@_id"] ?? "",
          agentId: t["@_agent-id"] ?? "",
          status: t["@_status"] ?? "",
          phase: phaseId,
          goal: textNode(goal),
          keywords: textNode(keywords),
          depends: textNode(depends),
          commands,
        });
      }
    }
    return { tasks, phases: phaseIds };
  } catch {
    return null;
  }
}

/**
 * @returns {{ currentPhase: string, currentPlan: string, status: string, nextAction: string, agents: Array<{id: string, name: string, phase: string, plan: string, status: string, since: string}>, references: string[], raw: unknown } | null}
 */
export function parseStateXmlString(xml) {
  if (!xml || typeof xml !== "string") return null;
  try {
    const obj = planningXmlParser.parse(xml);
    const state = obj?.state ?? obj;
    if (!state || typeof state !== "object") return null;
    const registry = state["agent-registry"];
    const agents = registry?.agent != null ? ensureArray(registry.agent) : [];
    const refBlock = state.references;
    const refList = refBlock?.reference != null ? ensureArray(refBlock.reference) : [];
    const references = refList.map((r) => textNode(r)).filter(Boolean);
    return {
      currentPhase: state["current-phase"] ?? "",
      currentPlan: state["current-plan"] ?? "",
      status: state["status"] ?? "",
      nextAction: state["next-action"] ?? "",
      agents: agents.map((a) => ({
        id: a["@_id"] ?? "",
        name: textNode(a.name),
        phase: textNode(a.phase),
        plan: textNode(a.plan),
        status: textNode(a.status),
        since: textNode(a.since),
      })),
      references,
      raw: state,
    };
  } catch {
    return null;
  }
}

/**
 * @returns {{ phases: Array<{id: string, title: string, goal: string, status: string, depends: string, plans: string}>, docFlow: Array<{name: string, text: string}> } | null}
 */
export function parseRoadmapXmlString(xml) {
  if (!xml || typeof xml !== "string") return null;
  try {
    const obj = planningXmlParser.parse(xml);
    const road = obj.roadmap ?? obj;
    if (!road || typeof road !== "object") return null;
    const phaseList = ensureArray(road.phase ?? []);
    const phases = phaseList.map((ph) => {
      const goal = ph.goal ?? "";
      return {
        id: String(ph["@_id"] ?? "").padStart(2, "0"),
        title: textNode(ph.title),
        goal: textNode(goal),
        status: textNode(ph.status),
        depends: textNode(ph.depends),
        plans: textNode(ph.plans),
      };
    });
    phases.sort((a, b) => Number(a.id) - Number(b.id));

    const docFlow = [];
    const flow = road["doc-flow"];
    if (flow?.doc != null) {
      for (const d of ensureArray(flow.doc)) {
        docFlow.push({
          name: String(d["@_name"] ?? ""),
          text: typeof d === "string" ? d : textNode(d["#text"] ?? d),
        });
      }
    }
    return { phases, docFlow };
  } catch {
    return null;
  }
}

/** Legacy snapshot helper: phases from markdown roadmap (### Phase N : title). */
export function parseRoadmapPhasesFromMarkdown(markdown) {
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

/** Progress table under ## Progress in markdown roadmap. */
export function parseProgressTableFromMarkdown(markdown) {
  const lines = markdown.split("\n").map((line) => line.replace(/\r$/, ""));
  const progressStart = lines.findIndex((line) => line.trim() === "## Progress");
  if (progressStart === -1) return new Map();
  const map = new Map();
  for (let i = progressStart + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (!line.startsWith("|")) break;
    if (line.includes("---")) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
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

export function stripYamlFrontmatter(content) {
  if (!content || typeof content !== "string") return content;
  const m = content.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  return m ? content.slice(m.length) : content;
}

function stripBackticks(s) {
  const t = (s ?? "").trim();
  if (t.startsWith("`") && t.endsWith("`") && t.length >= 2) return t.slice(1, -1);
  return t;
}

function inferPhaseIdFromTaskId(taskId) {
  const id = stripBackticks(taskId);
  if (!id) return "";
  const short = id.match(/^(\d+)-\d+$/);
  if (short) return short[1].padStart(2, "0");
  const phaseLike = id.replace(/-\d+$/, "");
  return phaseLike === id ? "" : phaseLike;
}

/**
 * Section planning MDX/Markdown: ## Phase `id` + markdown tables (Id | Status | Goal | Depends | Verify).
 * @returns {{ phases: Array<{id: string, label: string}>, tasks: Array<{id: string, agentId: string, status: string, phase: string, goal: string, keywords: string, commands: string[], depends: string}> } | null}
 */
export function parseSectionTaskRegistryMarkdown(content) {
  if (!content || typeof content !== "string") return null;
  const body = stripYamlFrontmatter(content);
  if (!body.includes("|")) return null;

  const tasks = [];
  const phases = [];
  const phaseHeader = /^##\s+Phase\s+(?:`([^`]+)`|([^\n`]+?))\s*(?:\(([^)]*)\))?\s*$/;

  let currentPhaseId = "";
  let currentLabel = "";
  let inTable = false;
  let colIndex = {};

  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, "");
    const phMatch = line.match(phaseHeader);
    if (phMatch) {
      inTable = false;
      currentPhaseId = (phMatch[1] ?? phMatch[2] ?? "").trim();
      if (/^\d+$/.test(currentPhaseId)) currentPhaseId = currentPhaseId.padStart(2, "0");
      currentLabel = (phMatch[3] ?? currentPhaseId).trim();
      if (currentPhaseId) phases.push({ id: currentPhaseId, label: currentLabel });
      continue;
    }

    if (!line.trim().startsWith("|")) {
      inTable = false;
      continue;
    }

    const rawLine = line.trim();
    const parts = rawLine.split("|").map((c) => c.trim());
    if (parts.length < 3) continue;
    const cells = parts.slice(1, -1);
    if (cells.length < 2) continue;

    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) {
      continue;
    }

    const headerLike = cells.some((c) => /^id$/i.test(stripBackticks(c)));
    if (headerLike && cells.length >= 3) {
      colIndex = {};
      cells.forEach((c, idx) => {
        const key = stripBackticks(c).toLowerCase().replace(/\s+/g, "");
        if (key === "id") colIndex.id = idx;
        else if (key === "status") colIndex.status = idx;
        else if (key === "goal") colIndex.goal = idx;
        else if (key === "depends") colIndex.depends = idx;
        else if (key === "verify") colIndex.verify = idx;
      });
      if (colIndex.id === undefined) {
        inTable = false;
        continue;
      }
      inTable = true;
      continue;
    }

    if (!inTable || colIndex.id === undefined) continue;

    const id = stripBackticks(cells[colIndex.id] ?? "");
    if (!id || /^id$/i.test(id)) continue;
    const phaseId = currentPhaseId || inferPhaseIdFromTaskId(id);
    if (!phaseId) continue;
    if (!phases.some((phase) => phase.id === phaseId)) {
      phases.push({ id: phaseId, label: phaseId });
    }

    const status = stripBackticks(colIndex.status !== undefined ? cells[colIndex.status] ?? "" : "");
    const goal = stripBackticks(colIndex.goal !== undefined ? cells[colIndex.goal] ?? "" : "");
    const depends = stripBackticks(colIndex.depends !== undefined ? cells[colIndex.depends] ?? "" : "");
    const verify = stripBackticks(colIndex.verify !== undefined ? cells[colIndex.verify] ?? "" : "");
    const commands = verify
      ? verify
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    tasks.push({
      id,
      agentId: "",
      status,
      phase: phaseId,
      goal,
      keywords: "",
      depends: depends === "-" ? "" : depends,
      commands,
    });
  }

  if (tasks.length === 0 && phases.length === 0) return null;
  return { phases, tasks };
}

/**
 * @param {string} path
 * @param {string} content
 * @returns {'task-registry-xml' | 'task-registry-md' | 'state-xml' | 'roadmap-xml' | 'roadmap-md' | 'generic-md' | 'generic-xml' | 'unknown'}
 */
export function classifyPlanningFile(path, content) {
  const p = (path ?? "").replace(/\\/g, "/");
  const base = p.split("/").pop() ?? p;
  const lower = base.toLowerCase();
  const c = content ?? "";

  if (lower === "task-registry.xml" || lower.endsWith("/task-registry.xml")) return "task-registry-xml";
  if (lower === "state.xml" || base === "STATE.xml") return "state-xml";
  if (lower === "roadmap.xml" || base === "ROADMAP.xml") return "roadmap-xml";
  if (/task-registry\.mdx?$/i.test(lower)) return "task-registry-md";
  if (
    /roadmap\.mdx?$/i.test(lower) &&
    (/###\s+Phase\s+\d+/i.test(c) || /##\s+Phase\s+(?:`[^`]+`|[^\n`]+)/i.test(c))
  ) {
    return "roadmap-md";
  }
  if (lower.endsWith(".md") || lower.endsWith(".mdx")) {
    if (parseSectionTaskRegistryMarkdown(c)?.tasks?.length) return "task-registry-md";
    return "generic-md";
  }
  if (lower.endsWith(".xml")) return "generic-xml";
  return "unknown";
}
