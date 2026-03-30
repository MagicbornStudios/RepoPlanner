"use client";

/**
 * Cockpit-facing planning parse + XML serialize (DOM).
 * XML parse delegates to `planning-parse-core.mjs` (same `fast-xml-parser` rules as `loop-cli.mjs`).
 */
import {
  classifyPlanningFile,
  parseProgressTableFromMarkdown,
  parseRoadmapPhasesFromMarkdown,
  parseRoadmapXmlString,
  parseSectionTaskRegistryMarkdown,
  parseStateXmlString,
  parseTaskRegistryXmlString,
} from "repo-planner/lib/planning-parse-core.mjs";

export type ParsedTaskRow = {
  id: string;
  agentId: string;
  status: string;
  goal: string;
  keywords: string;
  commands: string[];
  depends: string;
  phaseId: string;
};

export type ParsedPhaseRow = { id: string };

export type ParsedTaskRegistry = {
  phases: ParsedPhaseRow[];
  tasks: ParsedTaskRow[];
};

export type ParsedState = {
  currentPhase: string;
  currentPlan: string;
  status: string;
  nextAction: string;
  references: string[];
};

export type ParsedRoadmapPhase = {
  id: string;
  title?: string;
  goal: string;
  status: string;
  depends: string;
  plans?: string;
  requirements?: string;
};

export type ParsedRoadmap = {
  phases: ParsedRoadmapPhase[];
  docFlow: Array<{ name: string; text: string }>;
};

export {
  classifyPlanningFile,
  parseProgressTableFromMarkdown,
  parseRoadmapPhasesFromMarkdown,
  parseSectionTaskRegistryMarkdown,
};

export function parseTaskRegistryXml(content: string): ParsedTaskRegistry | null {
  const r = parseTaskRegistryXmlString(content);
  if (!r) return null;
  return {
    phases: r.phases,
    tasks: r.tasks.map((t) => ({
      id: t.id,
      agentId: t.agentId,
      status: t.status,
      goal: t.goal,
      keywords: t.keywords,
      commands: t.commands,
      depends: t.depends,
      phaseId: t.phase,
    })),
  };
}

/** Section planning `task-registry.mdx` / exported `.md` task tables. */
export function parseTaskRegistryFromMarkdown(content: string): ParsedTaskRegistry | null {
  const r = parseSectionTaskRegistryMarkdown(content);
  if (!r) return null;
  if (r.tasks.length === 0 && r.phases.length === 0) return null;
  return {
    phases: r.phases.map((p) => ({ id: p.id })),
    tasks: r.tasks.map((t) => ({
      id: t.id,
      agentId: t.agentId,
      status: t.status,
      goal: t.goal,
      keywords: t.keywords,
      commands: t.commands,
      depends: t.depends,
      phaseId: t.phase,
    })),
  };
}

export function parseStateXml(content: string): ParsedState | null {
  const r = parseStateXmlString(content);
  if (!r) return null;
  return {
    currentPhase: r.currentPhase,
    currentPlan: r.currentPlan,
    status: r.status,
    nextAction: r.nextAction,
    references: r.references,
  };
}

export function parseRoadmapXml(content: string): ParsedRoadmap | null {
  const r = parseRoadmapXmlString(content);
  if (!r) return null;
  return {
    phases: r.phases.map((p) => ({
      id: p.id,
      title: p.title,
      goal: p.goal,
      status: p.status,
      depends: p.depends,
      plans: p.plans,
    })),
    docFlow: r.docFlow,
  };
}

/** Markdown roadmap (`### Phase N` blocks) -> cockpit roadmap shape. */
export function parseRoadmapFromMarkdown(content: string): ParsedRoadmap | null {
  const phases = parseRoadmapPhasesFromMarkdown(content);
  if (phases.length) {
    return {
      phases: phases.map((p) => ({
        id: p.id,
        title: p.title,
        goal: p.goal,
        status: "",
        depends: p.depends,
        plans: p.plans,
        requirements: p.requirements,
      })),
      docFlow: [],
    };
  }

  const body = content.replace(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/, "");
  const lines = body.split("\n").map((line) => line.replace(/\r$/, ""));
  const sectionPhases: ParsedRoadmapPhase[] = [];
  const heading = /^##\s+Phase\s+(?:`([^`]+)`|([^\n`]+?))\s*$/;

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index]?.match(heading);
    if (!match) continue;
    const id = (match[1] ?? match[2] ?? "").trim();
    if (!id) continue;
    let title = "";
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const candidate = lines[cursor]?.trim() ?? "";
      if (!candidate) continue;
      if (/^##\s+Phase\s+/i.test(candidate)) break;
      title = candidate.replace(/^#+\s+/, "");
      break;
    }
    sectionPhases.push({
      id,
      title: title || id,
      goal: "",
      status: "",
      depends: "",
      plans: "",
      requirements: "",
    });
  }

  if (!sectionPhases.length) return null;
  return {
    phases: sectionPhases,
    docFlow: [],
  };
}

function xmlParseError(doc: Document | null): boolean {
  if (!doc?.documentElement) return true;
  const root = doc.documentElement;
  if (root.localName === "parsererror" || root.namespaceURI?.includes("mozilla")) {
    return true;
  }
  return doc.getElementsByTagName("parsererror").length > 0;
}

function childrenLocal(el: Element, name: string): Element[] {
  return Array.from(el.children).filter((c) => c.localName === name);
}

export function serializeTaskRegistryFromModel(
  originalContent: string,
  tasks: ParsedTaskRow[],
): string | null {
  if (typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") return null;
  const doc = new DOMParser().parseFromString(originalContent, "application/xml");
  if (xmlParseError(doc)) return null;
  const root = doc.documentElement;
  if (!root || root.localName !== "task-registry") return null;

  const byId = new Map(tasks.map((t) => [t.id, t]));

  for (const phase of childrenLocal(root, "phase")) {
    for (const task of childrenLocal(phase, "task")) {
      const id = task.getAttribute("id") ?? "";
      const row = byId.get(id);
      if (!row) continue;

      task.setAttribute("status", row.status);
      if (row.agentId !== undefined) task.setAttribute("agent-id", row.agentId);

      const setTextChild = (local: string, value: string) => {
        let el = Array.from(task.children).find((c) => c.localName === local);
        if (!el) {
          el = doc.createElement(local);
          task.appendChild(el);
        }
        el.textContent = value;
      };

      setTextChild("goal", row.goal);
      setTextChild("keywords", row.keywords);
      setTextChild("depends", row.depends);

      let cmdWrap = Array.from(task.children).find((c) => c.localName === "commands");
      if (!cmdWrap) {
        cmdWrap = doc.createElement("commands");
        task.appendChild(cmdWrap);
      }
      while (cmdWrap.firstChild) cmdWrap.removeChild(cmdWrap.firstChild);
      for (const line of row.commands) {
        if (!line.trim()) continue;
        const c = doc.createElement("command");
        c.textContent = line;
        cmdWrap.appendChild(c);
      }
    }
  }

  const ser = new XMLSerializer().serializeToString(root);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${ser}\n`;
}

export function serializeStateFromModel(originalContent: string, model: ParsedState): string | null {
  if (typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") return null;
  const doc = new DOMParser().parseFromString(originalContent, "application/xml");
  if (xmlParseError(doc)) return null;
  const root = doc.documentElement;
  if (!root || root.localName !== "state") return null;

  const setText = (local: string, value: string) => {
    let el = Array.from(root.children).find((c) => c.localName === local);
    if (!el) {
      el = doc.createElement(local);
      root.appendChild(el);
    }
    el.textContent = value;
  };

  setText("current-phase", model.currentPhase);
  setText("current-plan", model.currentPlan);
  setText("status", model.status);
  setText("next-action", model.nextAction);

  let refParent = Array.from(root.children).find((c) => c.localName === "references");
  if (!refParent) {
    refParent = doc.createElement("references");
    root.appendChild(refParent);
  }
  while (refParent.firstChild) refParent.removeChild(refParent.firstChild);
  for (const r of model.references) {
    const el = doc.createElement("reference");
    el.textContent = r;
    refParent.appendChild(el);
  }

  const ser = new XMLSerializer().serializeToString(root);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${ser}\n`;
}

export function serializeRoadmapFromModel(
  originalContent: string,
  phases: ParsedRoadmapPhase[],
): string | null {
  if (typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") return null;
  const doc = new DOMParser().parseFromString(originalContent, "application/xml");
  if (xmlParseError(doc)) return null;
  const root = doc.documentElement;
  if (!root || root.localName !== "roadmap") return null;

  const byId = new Map(phases.map((p) => [p.id, p]));
  for (const phase of childrenLocal(root, "phase")) {
    const id = phase.getAttribute("id") ?? "";
    const row = byId.get(id);
    if (!row) continue;

    const setTextChild = (local: string, value: string) => {
      let el = Array.from(phase.children).find((c) => c.localName === local);
      if (!el) {
        el = doc.createElement(local);
        phase.appendChild(el);
      }
      el.textContent = value;
    };
    setTextChild("goal", row.goal);
    setTextChild("status", row.status);
    setTextChild("depends", row.depends);
  }

  const ser = new XMLSerializer().serializeToString(root);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${ser}\n`;
}
