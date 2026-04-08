import type { Metadata } from "next";

import { CockpitDemo } from "@/components/cockpit-demo";

export const metadata: Metadata = {
  title: "RepoPlanner — cockpit demo",
  description: "Read-only planning cockpit with a static built-in pack (browser session only; no persistence).",
  robots: { index: false, follow: true },
};

/** Full-screen embed: use the browser Back button to return to the landing page. */
export default function CockpitPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <CockpitDemo />
    </div>
  );
}
