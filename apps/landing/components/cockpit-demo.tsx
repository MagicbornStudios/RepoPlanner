"use client";

import { CockpitFromPack } from "@/components/cockpit-from-pack";

/**
 * Cockpit route: mock-aligned shell fed by the static built-in pack (no host bundle weight).
 */
export function CockpitDemo() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8 sm:py-12">
      <p className="mb-6 text-center">
        <a
          href="/"
          className="text-sm text-[var(--primary)] underline-offset-4 hover:underline"
        >
          ← Back to RepoPlanner
        </a>
      </p>
      <CockpitFromPack preferPackId="rp-builtin-init" />
      <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
        Read-only demo — browser session only, no persistence. Host apps wire real XML and packs via{" "}
        <code className="font-mono text-[var(--muted-foreground)]">repo-planner/host</code>.
      </p>
    </div>
  );
}
