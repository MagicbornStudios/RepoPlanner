# Phase Doc Template

Use a consistent template whenever we write or refresh a phase plan/summary. Each section maps to the loop step (Discuss → Plan → Execute → Verify) and gives a quick, searchable reference.

## Purpose
- short sentence describing *why* the phase exists (goal + success signal).

## Scope & Constraints
- what is in/out; controller/mouse/usability constraints; tech stack limitations.

## Files of Interest
- list each touched file with short notes or keywords (sample `packages/kaplay-demo/src/ui/organisms.ts — Command panel layout`).

## Search Keywords
- list 3–5 search terms that quickly surface phase-specific code or docs (e.g., `ThreeColumnShell`, `GridFrame`, `KeyHintLegend`).

## Important Commands
- bullet list of commands used for verification or quick inspection (`pnpm --dir packages/kaplay-demo run build`, `rg CommandPanel packages/kaplay-demo/src/ui`).

## Verification
- testing commands and expected signals (typecheck/build/parity smoke).

## Requriements Suggestions
- capture REQUIREMENTS.xml gaps discovered during execution and propose exact wording updates; do not block delivery on open questions.

## Next Steps
- short reminders for follow-up phases (e.g., “Phase 46 should cover key legends + controller flow”).

## Notes
- Any relevant links (phase summary doc, roadmap entry, planning doc) or lessons learned (e.g., “use shared shell first, then customize content”).
