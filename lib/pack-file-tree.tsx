"use client";

import type { PackFile } from "./workspace-storage";

export type PackTreeNode =
  | {
      kind: "dir";
      name: string;
      /** Prefix path for nested keys (no trailing slash). */
      prefix: string;
      children: PackTreeNode[];
    }
  | { kind: "file"; name: string; path: string };

/** Build a nested tree from slash-separated paths (planning pack files). */
export function buildPackFileTree(files: PackFile[]): PackTreeNode[] {
  type Dir = { name: string; prefix: string; subdirs: Map<string, Dir>; files: { name: string; path: string }[] };
  const root: Dir = { name: "", prefix: "", subdirs: new Map(), files: [] };

  for (const f of files) {
    const segments = f.path.split("/").filter(Boolean);
    if (!segments.length) continue;
    const fileName = segments.pop()!;
    let cur = root;
    let prefix = "";
    for (const seg of segments) {
      prefix = prefix ? `${prefix}/${seg}` : seg;
      if (!cur.subdirs.has(seg)) {
        cur.subdirs.set(seg, { name: seg, prefix, subdirs: new Map(), files: [] });
      }
      cur = cur.subdirs.get(seg)!;
    }
    cur.files.push({ name: fileName, path: f.path });
  }

  function dirToNodes(d: Dir): PackTreeNode[] {
    const childDirs = [...d.subdirs.values()].sort((a, b) => a.name.localeCompare(b.name));
    const childFiles = [...d.files].sort((a, b) => a.name.localeCompare(b.name));
    const out: PackTreeNode[] = [];
    for (const sd of childDirs) {
      const children = dirToNodes(sd);
      out.push({ kind: "dir", name: sd.name, prefix: sd.prefix, children });
    }
    for (const sf of childFiles) {
      out.push({ kind: "file", name: sf.name, path: sf.path });
    }
    return out;
  }

  return dirToNodes(root);
}
