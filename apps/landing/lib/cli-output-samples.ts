/** Representative CLI output for the landing page (captured or hand-trimmed for length). */

export const SNAPSHOT_SAMPLE = `BEHAVIOR (AGENTS.md)

(… root AGENTS.md is inlined here so every snapshot re-injects the loop rules — typically multi‑thousand tokens. Prefer a short session start: read this block once, then rely on WORKFLOW + STATE below for the next action.)

────────────────────────────────────────

WORKFLOW
  Workflow reminder (AGENTS.md)
    read: Read AGENTS.md first.
    read: Read the planning records for the scope you are changing.
    rule: Kickoff is required when a phase is vague, stale, or estimated hours exceed policy max.
    rule: Executable work is not done without automated tests on the verification path.
  Sprint 0  phases=01, 02, 03  progress=42%  open=2
  Warnings  stale=0  missing-tests=0  missing-dod=0  needs-discussion=0  kickoff=0  done-gate=1

STATE (.planning/STATE.xml)
current-phase: 01
next-action: Pick one planned task from TASK-REGISTRY.xml; run verification commands; update STATE and commit.

OPEN TASKS (.planning/TASK-REGISTRY.xml)
  (trimmed — snapshot includes sprint-scoped tasks and phase file refs without dumping every XML line)

PHASE
  Progress (.planning/TASK-REGISTRY.xml)
  DEPS (tree, id title [status]) (.planning/ROADMAP.xml)
    01  [active]
    02  [planned]

  Similar phases: install optional dep fastembed to enable.`;

export const SETUP_CHECKLIST_SAMPLE = `ok  Git installed and on PATH
ok  .planning directory exists
ok  .planning/STATE.xml exists
ok  .planning/TASK-REGISTRY.xml exists`;

export const INIT_HELP_SAMPLE = `Usage: planning init [options]

Alias for planning setup init — bootstrap .planning in the project root.

Options:
  --force         Overwrite bootstrap files if they already exist (destructive).
  --minimal       Bare .planning: XML + planning-config.toml +
                  .planning/AGENTS.md; narrative REQUIREMENTS.md at repo root;
                  no IMPLEMENTATION_PLAN.md; no .planning/reports (use
                  REPOPLANNER_REPORTS_DIR).
  --no-agents-md  Do not create AGENTS.md.
  -h, --help      display help for this command`;

export const REPORT_GENERATE_SAMPLE = `planning report generate

Writes markdown to .planning/reports/latest.md using the agent-loop EJS template
when present. If the template is missing, the CLI prints a clear error with the
expected path (e.g. .planning/templates/agent-loop-report.md.ejs).

Typical follow-up: planning report view — opens a minimal local viewer.`;

export const PACK_EMBED_BUILD_HELP_SAMPLE = `Usage: planning pack embed-build [options]

Write builtin-packs.json: snapshot of .planning (rp-builtin-init) and optional
docs folder (.md/.mdx bodies, front matter stripped).

Options:
  -o, --out <file>             Output JSON path (relative to cwd unless
                               absolute)
  --docs-dir <path>            Directory of markdown/MDX for the rp-builtin-docs
                               pack (relative to project --root unless
                               absolute); omit for init-only
  --planning-dir <path>        Override .planning directory (default:
                               <root>/.planning)
  --docs-path-prefix <prefix>  Virtual path prefix in JSON for docs files
                               (default: docs/repo-planner)
  -h, --help                   display help for this command`;

export const REFERENCE_LINKS = {
  ralphAwesome: "https://awesomeclaude.ai/ralph-wiggum",
  ralphDevInterrupted: "https://devinterrupted.substack.com/p/inventing-the-ralph-wiggum-loop-creator",
  ralphYoutube: "https://www.youtube.com/watch?v=_IK18goX4X8&t=1s",
  repomirror: "https://github.com/repomirrorhq/repomirror",
  gsd: "https://github.com/gsd-build/get-shit-done",
  gadSite: "https://get-anything-done.vercel.app/",
} as const;
