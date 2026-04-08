/** Paths are under `public/init/` — served at `/init/...` */

export type InitBundleFile = {
  /** Path inside the downloadable zip (repo layout) */
  zipPath: string;
  /** URL to fetch from this site */
  href: string;
  /** Short label for individual download links */
  label: string;
};

export const INIT_BUNDLE_FILES: InitBundleFile[] = [
  { zipPath: "planning-config.toml", href: "/init/planning-config.toml", label: "planning-config.toml" },
  { zipPath: "REQUIREMENTS.md", href: "/init/REQUIREMENTS.md", label: "REQUIREMENTS.md (repo root)" },
  { zipPath: ".planning/STATE.xml", href: "/init/planning/STATE.xml", label: ".planning/STATE.xml" },
  { zipPath: ".planning/ROADMAP.xml", href: "/init/planning/ROADMAP.xml", label: ".planning/ROADMAP.xml" },
  { zipPath: ".planning/TASK-REGISTRY.xml", href: "/init/planning/TASK-REGISTRY.xml", label: ".planning/TASK-REGISTRY.xml" },
  { zipPath: ".planning/DECISIONS.xml", href: "/init/planning/DECISIONS.xml", label: ".planning/DECISIONS.xml" },
  { zipPath: ".planning/ERRORS-AND-ATTEMPTS.xml", href: "/init/planning/ERRORS-AND-ATTEMPTS.xml", label: ".planning/ERRORS-AND-ATTEMPTS.xml" },
  { zipPath: ".planning/REQUIREMENTS.xml", href: "/init/planning/REQUIREMENTS.xml", label: ".planning/REQUIREMENTS.xml" },
  { zipPath: ".planning/AGENTS.md", href: "/init/planning/AGENTS.md", label: ".planning/AGENTS.md" },
];
