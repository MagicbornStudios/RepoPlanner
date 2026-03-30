import type { XMLParser } from "fast-xml-parser";

export const planningXmlParser: XMLParser;
export function ensureArray(x: unknown): unknown[];
export function parseTaskRegistryXmlString(xml: string): {
  tasks: Array<{
    id: string;
    agentId: string;
    status: string;
    phase: string;
    goal: string;
    keywords: string;
    commands: string[];
    depends: string;
  }>;
  phases: Array<{ id: string }>;
} | null;
export function parseStateXmlString(xml: string): {
  currentPhase: string;
  currentPlan: string;
  status: string;
  nextAction: string;
  agents: Array<{ id: string; name: string; phase: string; plan: string; status: string; since: string }>;
  references: string[];
  raw: unknown;
} | null;
export function parseRoadmapXmlString(xml: string): {
  phases: Array<{
    id: string;
    title: string;
    goal: string;
    status: string;
    depends: string;
    plans: string;
  }>;
  docFlow: Array<{ name: string; text: string }>;
} | null;
export function parseRoadmapPhasesFromMarkdown(markdown: string): Array<{
  id: string;
  title: string;
  goal: string;
  requirements: string;
  depends: string;
  plans: string;
}>;
export function parseProgressTableFromMarkdown(markdown: string): Map<string, string>;
export function stripYamlFrontmatter(content: string): string;
export function parseSectionTaskRegistryMarkdown(content: string): {
  phases: Array<{ id: string; label: string }>;
  tasks: Array<{
    id: string;
    agentId: string;
    status: string;
    phase: string;
    goal: string;
    keywords: string;
    commands: string[];
    depends: string;
  }>;
} | null;
export function classifyPlanningFile(
  path: string,
  content: string,
):
  | "task-registry-xml"
  | "task-registry-md"
  | "state-xml"
  | "roadmap-xml"
  | "roadmap-md"
  | "generic-md"
  | "generic-xml"
  | "unknown";
