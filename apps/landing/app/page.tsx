import { ArrowUpRight, BookOpen, ExternalLink, Github, LineChart, Terminal } from "lucide-react";

import { CockpitPreview } from "@/components/cockpit-preview";
import { CopyBlock } from "@/components/copy-block";
import { InitBundleDownload } from "@/components/init-bundle-download";
import { MermaidBlock } from "@/components/mermaid-block";
import { ShowcaseArtifactTable, ShowcaseButtonRow } from "@/components/showcase-primitives";
import { ShowcasePanel } from "@/components/showcase-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCockpitPreviewSource } from "@/lib/get-cockpit-source";
import {
  CHART_ARTIFACT_GRAPH,
  CHART_CLI_FLOW,
  DECISIONS_STUB,
  MINIMAL_TREE_SNIPPET,
  STATE_XML_STUB,
  TASK_REGISTRY_STUB,
} from "@/lib/planning-content";
import {
  INIT_HELP_SAMPLE,
  REFERENCE_LINKS,
  REPORT_GENERATE_SAMPLE,
  SETUP_CHECKLIST_SAMPLE,
  SNAPSHOT_SAMPLE,
} from "@/lib/cli-output-samples";
import { SHOWCASE_BUTTON_CODE, SHOWCASE_TABLE_CODE } from "@/lib/showcase-snippets";

const YOUTUBE_ID = "958hJe-AcvU";
const YOUTUBE_START_SEC = 610;

const GET_ANYTHING_DONE = "https://github.com/MagicbornStudios/get-anything-done";
const GET_ANYTHING_DONE_SITE = "https://get-anything-done.vercel.app/";
const GSD_UPSTREAM = "https://github.com/gsd-build/get-shit-done";
const GAD_EVALS = "https://github.com/MagicbornStudios/get-anything-done/tree/main/evals";
const REPO_PLANNER_GITHUB = "https://github.com/MagicbornStudios/RepoPlanner";

const navLinks = [
  { href: "#quick-start", label: "Quick start" },
  { href: "#philosophy", label: "Philosophy" },
  { href: "#cli", label: "CLI" },
  { href: "/cockpit", label: "Cockpit demo" },
  { href: "#artifacts", label: "Artifacts" },
  { href: "#components", label: "Components" },
  { href: "#init", label: "Init bundle" },
  { href: "#gad", label: "Active work" },
] as const;

const cliCommands = [
  {
    cmd: "planning snapshot",
    role: "One digest: sprint-scoped phases, workflow summary, STATE, tasks, optional AGENTS.md re-injection — steers the next action without opening every XML file.",
  },
  {
    cmd: "planning setup checklist",
    role: "Verify git, `.planning/`, and core XML exist before you lean on the loop.",
  },
  {
    cmd: "planning init",
    role: "Bootstrap `.planning/` (full or `--minimal`), templates, and repo-root narrative files where applicable.",
  },
  {
    cmd: "planning report …",
    role: "Generate markdown reports under `.planning/reports/` from the agent-loop template; optional local viewer.",
  },
] as const;

const artifacts = [
  {
    file: "ROADMAP.xml",
    role: "Phases, goals, and ordering — what the milestone is trying to ship.",
    holds: "phase id, title, goal text, status, depends",
  },
  {
    file: "STATE.xml",
    role: "Current focus — the single next action and references into other docs.",
    holds: "current-phase, next-action, status, references",
  },
  {
    file: "TASK-REGISTRY.xml",
    role: "Concrete tasks with ids, keywords, and verification commands.",
    holds: "task id, goal, status, depends, commands",
  },
  {
    file: "DECISIONS.xml",
    role: "Architecture and process ADRs — durable rationale.",
    holds: "decision id, title, summary, impact",
  },
  {
    file: "ERRORS-AND-ATTEMPTS.xml",
    role: "What failed and what was tried — reduces repeated mistakes.",
    holds: "error id, context, attempts",
  },
  {
    file: "REQUIREMENTS.xml",
    role: "Stable requirement ids the roadmap and tasks trace back to.",
    holds: "requirement id, statement, status",
  },
  {
    file: "AGENTS.md",
    role: "Human + agent playbook — read order, conventions, guardrails.",
    holds: "Markdown prose (not XML)",
  },
] as const;

export default function Page() {
  const embedSrc = `https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?start=${YOUTUBE_START_SEC}`;
  const youtubeWatch = `https://www.youtube.com/watch?v=${YOUTUBE_ID}&t=${YOUTUBE_START_SEC}s`;
  const cockpitSource = getCockpitPreviewSource();

  return (
    <main className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 rp-hero-glow" />
      <div aria-hidden className="pointer-events-none absolute inset-0 rp-hero-noise" />

      {/* Hero — RepoPlanner is the site */}
      <header className="mx-auto max-w-4xl px-4 pb-6 pt-16 sm:px-6 sm:pb-8 sm:pt-20">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
          Planning cockpit &amp; CLI
        </p>
        <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl md:text-6xl">
          RepoPlanner
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--muted-foreground)] sm:text-xl">
          A source-first toolkit: <strong className="font-medium text-[var(--foreground)]">XML planning files</strong>{" "}
          under <code className="rounded bg-[var(--muted)] px-1.5 py-0.5 font-mono text-sm">.planning/</code>, a{" "}
          <strong className="font-medium text-[var(--foreground)]">CLI</strong> that reads them, and{" "}
          <strong className="font-medium text-[var(--foreground)]">embeddable React surfaces</strong> so a host app can
          show roadmap, tasks, and pack views without a second database.
        </p>
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          This project is <span className="text-[var(--foreground)]">archived</span> — the ideas below stay valid as a
          reference implementation. Active CLI, skills, and eval work continues in{" "}
          <a
            href={GET_ANYTHING_DONE_SITE}
            className="text-[var(--primary)] underline-offset-4 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get Anything Done
          </a>{" "}
          (see <a href="#gad" className="text-[var(--primary)] underline-offset-4 hover:underline">Active work</a>).
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <Button asChild size="sm" className="gap-2">
            <a href="/cockpit">
              <Terminal className="size-4" aria-hidden />
              Open cockpit demo
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <a href={REPO_PLANNER_GITHUB} target="_blank" rel="noopener noreferrer">
              <Github className="size-4" aria-hidden />
              RepoPlanner source
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <a href={GET_ANYTHING_DONE_SITE} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" aria-hidden />
              get-anything-done site
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <a href={GET_ANYTHING_DONE} target="_blank" rel="noopener noreferrer">
              <Github className="size-4" aria-hidden />
              GAD on GitHub
            </a>
          </Button>
        </div>

        <nav
          className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-[var(--border)] pt-6 text-sm"
          aria-label="On this page"
        >
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[var(--muted-foreground)] underline-offset-4 transition-colors hover:text-[var(--primary)] hover:underline"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </header>

      {/* Quick start — init, agent handoff, snapshot shape */}
      <section className="rp-section-band border-t border-[var(--border)] py-14" id="quick-start">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">Quick start</h2>
          <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[var(--muted-foreground)]">
            <li>
              <strong className="text-[var(--foreground)]">Bootstrap</strong> — run{" "}
              <code className="rounded bg-[var(--muted)] px-1.5 py-0.5 font-mono text-xs">planning init</code> (add{" "}
              <code className="font-mono text-xs">--minimal</code> if you want a lean tree). That writes{" "}
              <code className="font-mono text-xs">.planning/</code> with the core XML,{" "}
              <code className="font-mono text-xs">planning-config.toml</code>, and{" "}
              <code className="font-mono text-xs">.planning/AGENTS.md</code>.
            </li>
            <li>
              <strong className="text-[var(--foreground)]">Point your coding agent at the folder</strong> — tell it to use
              the new <code className="font-mono text-xs">.planning/</code> tree as the source of truth for the planning
              loop: read <code className="font-mono text-xs">STATE.xml</code> for the next action, pick one{" "}
              <code className="font-mono text-xs">planned</code> task in{" "}
              <code className="font-mono text-xs">TASK-REGISTRY.xml</code>, follow{" "}
              <code className="font-mono text-xs">AGENTS.md</code>, update the XML, commit. Same artifacts the CLI and
              cockpit summarize — nothing hidden in tool state.
            </li>
            <li>
              <strong className="text-[var(--foreground)]">Steer with snapshot</strong> — run{" "}
              <code className="font-mono text-xs">planning snapshot</code> whenever you want a terminal digest of phase,
              workflow, state, and open tasks (plus re-injected loop rules from root{" "}
              <code className="font-mono text-xs">AGENTS.md</code>). Below is an illustrative slice of that output.
            </li>
          </ol>
          <div className="mt-8">
            <h3 className="text-sm font-medium text-[var(--foreground)]">Example: planning snapshot (illustrative)</h3>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Real repos print longer AGENTS and task tables; run the CLI locally for authoritative output.
            </p>
            <div className="mt-3">
              <CopyBlock label="terminal">{SNAPSHOT_SAMPLE}</CopyBlock>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy — skillless Ralph */}
      <section className="rp-section-band border-t border-[var(--border)] py-14" id="philosophy">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
            Skillless Ralph Wiggum loop
          </h2>
          <p className="mt-4 max-w-3xl text-[var(--muted-foreground)]">
            <strong className="text-[var(--foreground)]">“Ralph Wiggum loop”</strong> here means the same tight cycle
            people describe in agent memes: read state, do one thing, write state back, repeat. RepoPlanner implements
            that loop with <strong className="text-[var(--foreground)]">files on disk</strong> and optional tooling —
            not with a library of agent skills, MCP tool packs, or hidden session state.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="font-display text-lg font-medium text-[var(--foreground)]">What “skillless” means</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--muted-foreground)]">
                <li>
                  <strong className="text-[var(--foreground)]">No skills layer</strong> — no YAML triggers, no skill
                  registry, no “when the user says X invoke skill Y.” Agents follow{" "}
                  <code className="font-mono text-xs">AGENTS.md</code> and the XML the same way a human would.
                </li>
                <li>
                  <strong className="text-[var(--foreground)]">Visible state</strong> — roadmap, tasks, decisions, and
                  errors live in git-tracked files. The cockpit and CLI are <strong>views</strong>, not a second source of
                  truth.
                </li>
                <li>
                  <strong className="text-[var(--foreground)]">Host-owned UI</strong> — React surfaces ship as packages
                  you embed; this site demonstrates primitives, a mock cockpit preview, and a{" "}
                  <a className="text-[var(--primary)] underline-offset-4 hover:underline" href="/cockpit">
                    pack-driven demo
                  </a>{" "}
                  that matches the mock layout.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-display text-lg font-medium text-[var(--foreground)]">Where it fits</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--muted-foreground)]">
                <li>
                  <strong className="text-[var(--foreground)]">Well suited to existing codebases</strong> — real modules,
                  tests, and CI give tasks meaningful verification commands and paths.
                </li>
                <li>
                  <strong className="text-[var(--foreground)]">Keeps planning in one place</strong> — one{" "}
                  <code className="font-mono text-xs">.planning/</code> tree instead of scattering roadmap and task state
                  across issues and one-off markdown.
                </li>
                <li>
                  For measured workflows, skills, and eval harnesses, use{" "}
                  <a
                    href={GET_ANYTHING_DONE_SITE}
                    className="text-[var(--primary)] underline-offset-4 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get Anything Done
                  </a>{" "}
                  as the active framework; RepoPlanner stays a <strong className="text-[var(--foreground)]">file + UI</strong>{" "}
                  reference.
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] p-5">
            <h3 className="text-sm font-medium text-[var(--foreground)]">One iteration, spelled out</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--muted-foreground)]">
              <li>
                <strong className="text-[var(--foreground)]">Snapshot</strong> — CLI or cockpit shows current phase and{" "}
                <code className="font-mono text-xs">next-action</code> from <code className="font-mono text-xs">STATE.xml</code>.
              </li>
              <li>
                <strong className="text-[var(--foreground)]">Pick</strong> — exactly one <code className="font-mono text-xs">planned</code>{" "}
                task in <code className="font-mono text-xs">TASK-REGISTRY.xml</code>.
              </li>
              <li>
                <strong className="text-[var(--foreground)]">Implement</strong> — minimal diff; run listed commands.
              </li>
              <li>
                <strong className="text-[var(--foreground)]">Record</strong> — update XML/Markdown, add decisions or
                errors as needed.
              </li>
              <li>
                <strong className="text-[var(--foreground)]">Commit</strong> — preferably one commit per task for traceability.
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* CLI */}
      <section className="rp-section-band border-t border-[var(--border)] py-14" id="cli">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-start gap-3">
            <Terminal className="mt-1 size-8 shrink-0 text-[var(--primary)]" aria-hidden />
            <div>
              <h2 className="font-display text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">CLI entrypoint</h2>
              <p className="mt-2 max-w-2xl text-[var(--muted-foreground)]">
                The package exposes <code className="font-mono text-sm text-[var(--foreground)]">repo-planner</code>{" "}
                (see <code className="font-mono text-sm">scripts/loop-cli.mjs</code>). Typical host usage:{" "}
                <code className="font-mono text-sm">pnpm exec repo-planner snapshot</code> or a{" "}
                <code className="font-mono text-sm">package.json</code> script pointing at the same script.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[9rem]">Command</TableHead>
                  <TableHead>What it does</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cliCommands.map((row) => (
                  <TableRow key={row.cmd}>
                    <TableCell className="font-mono text-sm text-[var(--primary)]">{row.cmd}</TableCell>
                    <TableCell className="text-[var(--muted-foreground)]">{row.role}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-10 space-y-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
            <h3 className="font-display text-lg font-medium text-[var(--foreground)]">Snapshot ≈ Ralph loop fuel</h3>
            <p>
              The <strong className="text-[var(--foreground)]">Ralph Wiggum</strong> pattern (persistent iteration with
              clear stop conditions) shows up in agent tooling under many names — see{" "}
              <a href={REFERENCE_LINKS.ralphAwesome} className="text-[var(--primary)] underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">
                Awesome Claude — Ralph Wiggum
              </a>
              ,{" "}
              <a
                href={REFERENCE_LINKS.ralphDevInterrupted}
                className="text-[var(--primary)] underline-offset-4 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Inventing the Ralph Wiggum Loop (Dev Interrupted)
              </a>
              , and{" "}
              <a href={REFERENCE_LINKS.ralphYoutube} className="text-[var(--primary)] underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">
                the creator interview on YouTube
              </a>
              . RepoPlanner&apos;s CLI treats each <code className="font-mono text-xs">snapshot</code> as a{" "}
              <strong className="text-[var(--foreground)]">steering digest</strong> — it
              narrows attention to the current sprint window, workflow signals, and the next actionable tasks instead of
              re-reading every artifact. It also <strong className="text-[var(--foreground)]">re-injects</strong> root{" "}
              <code className="font-mono text-xs">AGENTS.md</code> under <code className="font-mono text-xs">BEHAVIOR</code> so
              the loop rules ride along with every run (same spirit as handing the agent its standing orders each
              iteration).
            </p>
            <p>
              Optional <code className="font-mono text-xs">planning new-agent-id</code> still prints a fresh{" "}
              <code className="font-mono text-xs">agent-YYYYMMDD-xxxx</code> id when you use the task-claim flow — it is
              not required for read-only planning.
            </p>
            <p>
              Lineage: <a href={REFERENCE_LINKS.gsd} className="text-[var(--primary)] underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">Get Shit Done</a>{" "}
              principles, heavy inspiration from{" "}
              <a href={REFERENCE_LINKS.repomirror} className="text-[var(--primary)] underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">
                repomirror
              </a>{" "}
              (&quot;lighter framework and guidelines&quot; vs rigid checklists).{" "}
              <a href={REFERENCE_LINKS.gadSite} className="text-[var(--primary)] underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">
                Get Anything Done
              </a>{" "}
              measures how much structure actually helps — see the live site for the latest evals and write-ups.
            </p>
          </div>

          <div className="mt-12">
            <h3 className="font-display text-lg font-medium text-[var(--foreground)]">More example output (illustrative)</h3>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              A full <code className="font-mono text-xs">planning snapshot</code> trace lives in{" "}
              <a href="#quick-start" className="text-[var(--primary)] underline-offset-4 hover:underline">
                Quick start
              </a>
              . Below: checklist, init help, and report behavior.
            </p>
            <div className="mt-6 space-y-8">
              <div>
                <h4 className="text-sm font-medium text-[var(--foreground)]">planning setup checklist</h4>
                <div className="mt-2">
                  <CopyBlock label="terminal">{SETUP_CHECKLIST_SAMPLE}</CopyBlock>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-[var(--foreground)]">planning init --help</h4>
                <div className="mt-2">
                  <CopyBlock label="terminal">{INIT_HELP_SAMPLE}</CopyBlock>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-[var(--foreground)]">planning report generate (behavior)</h4>
                <div className="mt-2">
                  <CopyBlock label="terminal">{REPORT_GENERATE_SAMPLE}</CopyBlock>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <h3 className="font-display text-lg font-medium text-[var(--foreground)]">How the CLI sits in a repo</h3>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Config points at planning roots; the CLI reads and summarizes the same files the cockpit displays. Try the
              interactive read-only cockpit on <a className="text-[var(--primary)] underline-offset-4 hover:underline" href="/cockpit">/cockpit</a>.
            </p>
            <div className="mt-4">
              <MermaidBlock chart={CHART_CLI_FLOW} />
            </div>
          </div>
        </div>
      </section>

      {/* Artifacts */}
      <section className="rp-section-mid border-t border-[var(--border)] py-14" id="artifacts">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="font-display text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
          <code className="font-mono">.planning/</code> artifacts
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--muted-foreground)]">
          RepoPlanner aligns with a <strong className="text-[var(--foreground)]">minimal XML tree</strong> by default.
          These files are the durable record; the UI and CLI summarize them — they do not replace them with hidden
          state.
        </p>

        <div className="mt-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[11rem]">File</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Typical contents</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {artifacts.map((a) => (
                <TableRow key={a.file}>
                  <TableCell className="font-mono text-sm text-[var(--primary)]">{a.file}</TableCell>
                  <TableCell className="text-[var(--muted-foreground)]">{a.role}</TableCell>
                  <TableCell className="hidden font-mono text-xs text-[var(--muted-foreground)] md:table-cell">
                    {a.holds}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-10">
          <h3 className="font-display text-lg font-medium text-[var(--foreground)]">Relationships (high level)</h3>
          <div className="mt-4">
            <MermaidBlock chart={CHART_ARTIFACT_GRAPH} />
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="font-display text-lg font-medium text-[var(--foreground)]">Minimal tree (after init)</h3>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Select and copy, or use the copy button.</p>
            <div className="mt-3">
              <CopyBlock label="Directory layout">{MINIMAL_TREE_SNIPPET}</CopyBlock>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-[var(--foreground)]">STATE.xml (illustrative)</h4>
              <div className="mt-2">
                <CopyBlock label="XML stub">{STATE_XML_STUB}</CopyBlock>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[var(--foreground)]">TASK-REGISTRY.xml (illustrative)</h4>
              <div className="mt-2">
                <CopyBlock label="XML stub">{TASK_REGISTRY_STUB}</CopyBlock>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[var(--foreground)]">DECISIONS.xml (illustrative)</h4>
              <div className="mt-2">
                <CopyBlock label="XML stub">{DECISIONS_STUB}</CopyBlock>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Component showcase — shadcn-style Preview / Code tabs */}
      <section className="rp-section-band-soft border-t border-[var(--border)] py-14" id="components">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">UI components</h2>
          <p className="mt-3 max-w-3xl text-[var(--muted-foreground)]">
            The landing app vendors lightweight primitives (Button, Card, Table, Tabs) in the same spirit as{" "}
            <strong className="text-[var(--foreground)]">shadcn/ui</strong>: copy-owned components, Radix behavior, token
            styling. Each block below has a <strong className="text-[var(--foreground)]">Preview</strong> tab (live) and a{" "}
            <strong className="text-[var(--foreground)]">Code</strong> tab (what you would paste into a host). The{" "}
            <strong className="text-[var(--foreground)]">cockpit</strong> preview is static — real hosts import{" "}
            <code className="font-mono text-xs">repo-planner/host</code> and wire XML/packs.
          </p>

          <div className="mt-10 space-y-10">
            <ShowcasePanel
              title="Buttons"
              description="Primary actions and secondary/outline affordances — same variants the CLI docs and cards use."
              code={SHOWCASE_BUTTON_CODE}
              codeLabel="ShowcaseButtonRow.tsx"
            >
              <ShowcaseButtonRow />
            </ShowcasePanel>

            <ShowcasePanel
              title="Table"
              description="Tabular planning data (commands, artifacts) uses the same table primitives as this page."
              code={SHOWCASE_TABLE_CODE}
              codeLabel="ShowcaseArtifactTable.tsx"
            >
              <ShowcaseArtifactTable />
            </ShowcasePanel>

            <ShowcasePanel
              title="Cockpit (mock)"
              description={
                <>
                  Static preview of the shell: roadmap column, STATE next-action, TASK-REGISTRY rows.{" "}
                  <a className="text-[var(--primary)] underline-offset-4 hover:underline" href="/cockpit">
                    /cockpit
                  </a>{" "}
                  uses the same layout with data from the built-in pack (read-only, no persistence).
                </>
              }
              code={cockpitSource}
              codeLabel="cockpit-preview.tsx"
            >
              <CockpitPreview />
            </ShowcasePanel>
          </div>
        </div>
      </section>

      {/* Downloadable init bundle */}
      <section className="rp-section-mid border-t border-[var(--border)] py-14" id="init">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="font-display text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">Minimal init bundle</h2>
        <p className="mt-3 max-w-3xl text-[var(--muted-foreground)]">
          Download the same file layout the CLI would write for a minimal bootstrap: repo-root narrative,{" "}
          <code className="font-mono text-xs">planning-config.toml</code>, and core XML under{" "}
          <code className="font-mono text-xs">.planning/</code>. Use it to diff against an existing repo or to seed a
          review in PR form.
        </p>
        <div className="mt-8">
          <InitBundleDownload />
        </div>
        </div>
      </section>

      {/* GAD / lineage — secondary */}
      <section className="rp-section-band-soft border-t border-[var(--border)] py-14" id="gad">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-semibold text-[var(--foreground)]">Where active work lives</h2>
          <p className="mt-3 max-w-2xl text-[var(--muted-foreground)]">
            Day-to-day planning and benchmarks for the wider framework live in{" "}
            <strong className="text-[var(--foreground)]">Get Anything Done</strong> — CLI, skills, eval harness, and the
            public site that explains results. Lineage traces to{" "}
            <a href={GSD_UPSTREAM} className="text-[var(--primary)] underline-offset-4 hover:underline">
              Get Shit Done
            </a>
            .
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Card className="border-[var(--border)] bg-[var(--card)] md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ExternalLink className="size-5 text-[var(--primary)]" aria-hidden />
                  GAD site
                </CardTitle>
                <CardDescription>
                  Marketing + framework narrative, eval comparison, and &quot;run it locally&quot; — the public face of the
                  project.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" asChild>
                  <a href={GET_ANYTHING_DONE_SITE} target="_blank" rel="noopener noreferrer">
                    get-anything-done.vercel.app
                    <ArrowUpRight className="size-4" aria-hidden />
                  </a>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-[var(--border)] bg-[var(--card)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="size-5 text-[var(--primary)]" aria-hidden />
                  get-anything-done
                </CardTitle>
                <CardDescription>GitHub — CLI source, skills, AGENTS loop, and release history.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href={GET_ANYTHING_DONE} target="_blank" rel="noopener noreferrer">
                    MagicbornStudios / get-anything-done
                    <ArrowUpRight className="size-4" aria-hidden />
                  </a>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-[var(--border)] bg-[var(--card)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LineChart className="size-5 text-[var(--primary)]" aria-hidden />
                  Evaluations
                </CardTitle>
                <CardDescription>Benchmark projects and findings — compares runs in one place.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <a href={GAD_EVALS} target="_blank" rel="noopener noreferrer">
                    …/get-anything-done/tree/main/evals
                    <ArrowUpRight className="size-4" aria-hidden />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <div className="aspect-video w-full">
              <iframe
                title="GSD lineage — creator perspective on structured planning"
                className="h-full w-full"
                src={embedSrc}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
            <p className="border-t border-[var(--border)] px-4 py-3 text-center text-xs text-[var(--muted-foreground)]">
              <a href={youtubeWatch} className="underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
                Open on YouTube
              </a>{" "}
              — context on tight loops and evaluable specs (same embed as the portfolio GAD section).
            </p>
          </div>

          <p className="mt-8 text-sm leading-relaxed text-[var(--muted-foreground)]">
            RepoPlanner’s lighter constraints still show up in those GAD benchmarks — the harness makes tradeoffs visible
            without claiming “more ceremony” always wins. For the current story and scores, start at the{" "}
            <a
              href={GET_ANYTHING_DONE_SITE}
              className="text-[var(--primary)] underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              live site
            </a>
            .
          </p>
        </div>
      </section>

      <footer className="rp-footer-slab border-t border-[var(--border)] py-10">
        <div className="mx-auto max-w-4xl px-4 text-center text-xs text-[var(--muted-foreground)] sm:px-6">
          <p>RepoPlanner — archived reference; cockpit + CLI + planning file model.</p>
          <p className="mt-2">
            Source:{" "}
            <a
              href={REPO_PLANNER_GITHUB}
              className="text-[var(--primary)] underline-offset-4 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/MagicbornStudios/RepoPlanner
            </a>{" "}
            · Orphan experiments after skills: branch <code className="font-mono">gad-planner</code>.
          </p>
        </div>
      </footer>
    </main>
  );
}
