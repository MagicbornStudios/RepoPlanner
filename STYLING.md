# RepoPlanner styling and atomic design

RepoPlanner uses **atomic design** for UI: atoms → molecules → organisms. Host apps use `planning.css` (scoped tokens); package does not own global host styles.

---

## For agents (compact reuse rules)

1. **Build order** — Prefer atoms → molecules → organisms. Before adding UI, check `atoms/` and `molecules/` for something to reuse or extend.
2. **Reuse first** — Use `PanelSection` (title + actions + content, optional `scrollable`) for any titled block. Use `statusVariant` / `statusClassName` from `planning-status` for any status badge. Use `EmptyState` for empty lists. Extract repeated patterns into shared components or `lib/` utils before adding one-off markup.
3. **Tabs save space** — Prefer a tab strip over stacked sections when showing alternate views of the same area (e.g. Summary | Code). One primary tab strip per screen; nested tabs only for alternate views of one context (e.g. edit review).
4. **Compact by default** — Dense tables/lists (`text-xs`, `py-2`/`px-3`), short tab labels, fixed-height charts. No modals for primary content; use inline expansion or panels.
5. **Utilities** — Extract formatters, filters, and pure helpers to `lib/` or `utils/`; keep components thin and compositional.

**UI snapshot** — One card → **5 main tabs** (Overview, Work, State, Tools, Chat) with sub-view pills where applicable → one content pane. Split only when needed (e.g. Chat | Review). **Theming:** Use `statusVariant`/`statusClassName` for status (green/amber/red); one icon per tab/sub (size-3.5 main, size-3 sub). Reuse: `PanelSection`, `PlanningMetricCard`, `planning-status`, `EmptyState`, shadcn `Tabs`/`Card`/`Badge`/`ScrollArea`. Continue to revisit layouts and color context.

---

## Atomic structure

- **atoms/** — Smallest blocks: status helpers (`planning-status`), empty state, icon+label. No layout composition.
- **molecules/** — Composed: `PanelSection` (title + actions + content), `PlanningMetricCard` (title, optional icon, value, secondary), table row with status.
- **organisms/** — Full sections: cockpit, test-reports tab, chat panel, terminal panel.

Current mapping:

| Component | Layer | Path |
|-----------|--------|------|
| `statusClassName` / `statusVariant` | atom | `components/atoms/planning-status.ts` (re-export), `components/planning/planning-status.ts` |
| `EmptyState` | atom | `components/atoms/empty-state.tsx`, `components/ui/empty-state.tsx` |
| `PanelSection` | molecule | `components/molecules/panel-section.tsx`, `components/ui/panel-section.tsx` |
| `PlanningMetricCard` | molecule | `components/molecules/planning-metric-card.tsx` |
| `PlanningTestReportsTab` | organism | `components/organisms/planning-test-reports-tab.tsx` (planning/ re-exports) |
| `PlanningCockpit` | organism | `components/organisms/planning-cockpit.tsx` (planning/ re-exports) |
| `PlanningChatPanel` | organism | `components/organisms/planning-chat-panel.tsx` (planning/ re-exports) |

## Design tokens (planning.css)

All semantic and planning-specific tokens are scoped under `.repo-planner` with fallbacks. See `planning.css`. Host overrides by defining the same variables (e.g. in `:root` or `.repo-planner`).

## Loop / doc templates

Planning *documents* (PLAN, SUMMARY, ROADMAP) follow the loop’s own atoms/molecules/organisms in `.planning/templates/` (doc-template-atoms.xml, doc-template-molecules.xml, doc-template-organisms.xml). That is separate from UI atomic design; both use “atoms/molecules/organisms” as a structure.

## Standalone mode

When running RepoPlanner as a standalone app (not embedded in a host), set `REPOPLANNER_PROJECT_ROOT` to the folder containing the project to plan (e.g. the repo with `.planning/`). The UI can offer a project-folder selector that sets this (e.g. via env or a small backend that writes it).
