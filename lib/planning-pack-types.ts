"use client";

/** One downloadable / previewable row in the planning pack gallery (site or demo manifest). */
export type PlanningPackItem = {
  id: string;
  title: string;
  file: string;
  filename: string;
  section: string;
  sectionLabel: string;
  slug: string;
};

export type PlanningPackManifest = {
  version: number;
  generatedAt: string;
  demo: PlanningPackItem[];
  site: PlanningPackItem[];
};

/** Built-in cockpit pack JSON (`/planning-embed/builtin-packs.json`). */
export type BuiltinEmbedPackFile = { path: string; content: string };

export type BuiltinEmbedPack = {
  id: string;
  label: string;
  description?: string;
  files: BuiltinEmbedPackFile[];
};

export type BuiltinEmbedPacksPayload = {
  v: number;
  generatedAt: string;
  packs: BuiltinEmbedPack[];
};

/** Strip generated HTML comment + optional YAML frontmatter for markdown preview. */
export function stripPlanningPackPreviewPreamble(raw: string): string {
  let t = raw.replace(/^<!--[\s\S]*?-->\s*/m, "");
  t = t.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/, "");
  return t.trimStart();
}
