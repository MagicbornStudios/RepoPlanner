"use client";

import { useEffect, useState } from "react";
import {
  builtinEmbedPackToPlanningPack,
  defaultPlanningHostPolicy,
  PlanningCockpitDashboard,
  RepoPlannerWorkspaceShell,
} from "repo-planner/host";
import type { BuiltinEmbedPacksPayload } from "repo-planner/planning-pack";
import type { PlanningPack } from "repo-planner/workspace-storage";

import "repo-planner/planning.css";

const demoPolicy = {
  ...defaultPlanningHostPolicy,
  hideRawSourceInInspector: false,
};

/**
 * Full RepoPlanner workspace shell + dashboard, static built-in pack only.
 * `demoMode` + `packOnly` on the dashboard skip localStorage and live API routes.
 */
export function CockpitDemo() {
  const [builtinPacks, setBuiltinPacks] = useState<PlanningPack[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/planning-embed/builtin-packs.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((payload: BuiltinEmbedPacksPayload | null) => {
        if (cancelled || !payload?.packs?.length) return;
        setBuiltinPacks(payload.packs.map((p) => builtinEmbedPackToPlanningPack(p)));
      })
      .catch(() => {
        if (!cancelled) setBuiltinPacks([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <RepoPlannerWorkspaceShell className="min-h-screen rounded-none border-0 bg-transparent p-2 sm:p-4">
      <PlanningCockpitDashboard
        demoMode
        packOnly
        livePane={
          <div className="p-4 text-sm text-muted-foreground">
            Live planning APIs are not mounted on this static demo. Use{" "}
            <strong className="text-foreground">Pack</strong> with the built-in snapshot or upload a local bundle.
          </div>
        }
        builtinPacks={builtinPacks}
        preferBuiltinPackId="rp-builtin-init"
        hostPolicy={demoPolicy}
      />
    </RepoPlannerWorkspaceShell>
  );
}
