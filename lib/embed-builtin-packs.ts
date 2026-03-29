"use client";

import type { BuiltinEmbedPack } from "./planning-pack-types";
import type { PlanningPack } from "./workspace-storage";

/** Turn JSON embed payload entry into cockpit `PlanningPack` shape. */
export function builtinEmbedPackToPlanningPack(b: BuiltinEmbedPack): PlanningPack {
  return {
    id: b.id,
    name: b.label,
    createdAt: new Date().toISOString(),
    files: b.files.map((f) => ({ path: f.path, content: f.content })),
  };
}
