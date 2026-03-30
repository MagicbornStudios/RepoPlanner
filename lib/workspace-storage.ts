/// <reference path="../types/jszip.d.ts" />
"use client";

export const REPO_PLANNER_WORKSPACE_KEY = "repo-planner-workspace-v1";

const MAX_BYTES = 4_500_000;
const PACK_JSON_MIME = "application/json";
const ZIP_MIME = "application/zip";

export type PackFile = { path: string; content: string };

export type PlanningPack = {
  id: string;
  name: string;
  createdAt: string;
  files: PackFile[];
};

export type WorkspaceProject =
  | { id: string; kind: 'live'; label: string }
  | { id: string; kind: 'pack'; label: string; packId: string };

export type WorkspaceStateV1 = {
  v: 1;
  activeProjectId: string;
  /** Built-in embed pack id (e.g. `rp-builtin-init`); when set, main pane shows that pack instead of live APIs. */
  surfaceBuiltinPackId?: string | null;
  projects: WorkspaceProject[];
  packs: Record<string, PlanningPack>;
};

export const defaultWorkspaceState = (): WorkspaceStateV1 => ({
  v: 1,
  activeProjectId: 'live',
  surfaceBuiltinPackId: null,
  projects: [{ id: 'live', kind: 'live', label: 'This repository' }],
  packs: {},
});

function isProject(x: unknown): x is WorkspaceProject {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.kind === 'live') return typeof o.id === 'string' && typeof o.label === 'string';
  if (o.kind === 'pack')
    return (
      typeof o.id === 'string' &&
      typeof o.label === 'string' &&
      typeof o.packId === 'string'
    );
  return false;
}

function isPackFile(x: unknown): x is PackFile {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o.path === 'string' && typeof o.content === 'string';
}

function sanitizePlanningPack(x: unknown): PlanningPack | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.name !== 'string') return null;
  const createdAt = typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString();
  const rawFiles = Array.isArray(o.files) ? o.files : [];
  const files = rawFiles.filter(isPackFile);
  return { id: o.id, name: o.name, createdAt, files };
}

function parsePacksRecord(raw: unknown): Record<string, PlanningPack> {
  const out: Record<string, PlanningPack> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const val of Object.values(raw as Record<string, unknown>)) {
    const pack = sanitizePlanningPack(val);
    if (pack) out[pack.id] = pack;
  }
  return out;
}

export function parseWorkspaceState(raw: string | null): WorkspaceStateV1 {
  if (!raw) return defaultWorkspaceState();
  try {
    const p = JSON.parse(raw) as Partial<WorkspaceStateV1>;
    if (p.v !== 1 || !Array.isArray(p.projects) || typeof p.activeProjectId !== 'string') {
      return defaultWorkspaceState();
    }
    const surfaceBuiltinPackId =
      typeof p.surfaceBuiltinPackId === 'string' && p.surfaceBuiltinPackId.length > 0
        ? p.surfaceBuiltinPackId
        : null;
    const packs = parsePacksRecord(p.packs);
    const projects = p.projects.filter(isProject).filter((pr) => {
      if (pr.kind === 'live') return true;
      return Boolean(packs[pr.packId]);
    });
    if (!projects.some((pr) => pr.id === 'live' && pr.kind === 'live')) {
      projects.unshift({ id: 'live', kind: 'live', label: 'This repository' });
    }
    let active = p.activeProjectId;
    if (!projects.some((pr) => pr.id === active)) active = 'live';
    return { v: 1, activeProjectId: active, surfaceBuiltinPackId, projects, packs };
  } catch {
    return defaultWorkspaceState();
  }
}

export function loadWorkspaceState(): WorkspaceStateV1 {
  if (typeof window === 'undefined') return defaultWorkspaceState();
  return parseWorkspaceState(localStorage.getItem(REPO_PLANNER_WORKSPACE_KEY));
}

export function saveWorkspaceState(state: WorkspaceStateV1): { ok: true } | { ok: false; error: string } {
  if (typeof window === 'undefined') return { ok: true };
  try {
    const json = JSON.stringify(state);
    if (json.length > MAX_BYTES) {
      return {
        ok: false,
        error: `Workspace JSON is ~${Math.round(json.length / 1024)} KB; localStorage safe limit is about ${Math.round(MAX_BYTES / 1024)} KB. Remove a pack or shorten files.`,
      };
    }
    localStorage.setItem(REPO_PLANNER_WORKSPACE_KEY, json);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

function createPackId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `pack-${Date.now()}`;
}

function createPlanningPack(name: string, files: PackFile[]): PlanningPack {
  return {
    id: createPackId(),
    name,
    createdAt: new Date().toISOString(),
    files,
  };
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function normalizePackPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

function inferPackName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') || fileName;
}

async function readZipAsPack(file: File): Promise<PlanningPack> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const files = await Promise.all(
    Object.values(zip.files)
      .filter((entry) => !entry.dir)
      .map(async (entry) => ({
        path: normalizePackPath(entry.name),
        content: await entry.async('string'),
      })),
  );
  if (!files.length) {
    throw new Error('That zip did not contain any readable planning files.');
  }
  return createPlanningPack(inferPackName(file.name), files);
}

async function readJsonAsPack(file: File): Promise<PlanningPack> {
  const raw = await readFileText(file);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That JSON file could not be parsed as a planning pack.');
  }
  const pack = sanitizePlanningPack(parsed);
  if (!pack) {
    throw new Error('That JSON file is not a valid planning pack export.');
  }
  return createPlanningPack(pack.name || inferPackName(file.name), pack.files);
}

export async function readPreviewUploadAsPack(files: FileList | File[]): Promise<PlanningPack> {
  const list = Array.from(files);
  if (!list.length) {
    throw new Error('Choose a planning pack export or .planning zip to preview.');
  }
  if (list.length === 1) {
    const [file] = list;
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.zip') || file.type === ZIP_MIME) return readZipAsPack(file);
    if (lower.endsWith('.json') || file.type === PACK_JSON_MIME) return readJsonAsPack(file);
  }
  return readFilesAsPack(list);
}

export function readFilesAsPack(files: FileList | File[]): Promise<PlanningPack> {
  const list = Array.from(files);
  const name =
    list.length === 1 && list[0]
      ? inferPackName(list[0].name)
      : `Pack (${list.length} files)`;
  return Promise.all(
    list.map(async (file) => ({
      path: normalizePackPath(file.name),
      content: await readFileText(file),
    })),
  ).then((fileRows) => createPlanningPack(name, fileRows));
}
