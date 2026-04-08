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
import { SHOWCASE_BUTTON_CODE, SHOWCASE_TABLE_CODE } from "@/lib/showcase-snippets";

const YOUTUBE_ID = "958hJe-AcvU";
const YOUTUBE_START_SEC = 610;

const GET_ANYTHING_DONE = "https://github.com/MagicbornStudios/get-anything-done";
const GET_ANYTHING_DONE_SITE = "https://get-anything-done.vercel.app/";
const GSD_UPSTREAM = "https://github.com/gsd-build/get-shit-done";
const GAD_EVALS = "https://github.com/MagicbornStudios/get-anything-done/tree/main/evals";
const REPO_PLANNER_GITHUB = "https://github.com/MagicbornStudios/RepoPlanner";

const navLinks = [
  { href: "#philosophy", label: "Philosophy" },
  { href: "#cli", label: "CLI" },
  { href: "#artifacts", label: "Artifacts" },
  { href: "#components", label: "Components" },
  { href: "#init", label: "Init bundle" },
  { href: "#gad", label: "Active work" },
] as const;

const cliCommands = [
  { cmd: "snapshot", role: "Summarize planning state from configured roots into a readable digest for agents." },
  { cmd: "checklist", role: "Surface checklist-style progress against roadmap / task registry expectations." },
  { cmd: "init", role: "Bootstrap a minimal `.planning/` tree (XML templates + AGENTS.md + config)." },
  { cmd: "reports", role: "Generate or refresh planning reports the host can render or archive." },
  { cmd: "pack helpers", role: "Build or inspect planning-pack payloads for embed / gallery flows." },
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
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

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

      {/* Philosophy — skillless Ralph, brownfield */}
      <section className="border-t border-[var(--border)] bg-[#141110]/80 py-14" id="philosophy">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
            Skillless Ralph Wiggum loop — brownfield only
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
                  you embed; this site only demonstrates primitives and a <strong>mock</strong> cockpit preview.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-display text-lg font-medium text-[var(--foreground)]">Why brownfield only</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--muted-foreground)]">
                <li>
                  RepoPlanner assumes you already have a repo: modules, tests, CI, and history. Tasks reference{" "}
                  <strong className="text-[var(--foreground)]">real verification commands</strong> and paths.
                </li>
                <li>
                  Greenfield product invention (what to build, user research, blank-slate architecture) is not encoded
                  here — the loop is for <strong className="text-[var(--foreground)]">shipping and maintaining</strong>{" "}
                  software that already exists.
                </li>
                <li>
                  If you need measured workflows, skills, and eval harnesses across greenfield and brownfield, use{" "}
                  <a
                    href={GET_ANYTHING_DONE_SITE}
                    className="text-[var(--primary)] underline-offset-4 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get Anything Done
                  </a>{" "}
                  as the active framework; RepoPlanner remains a <strong className="text-[var(--foreground)]">file + UI</strong>{" "}
                  reference.
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 rounded-xl border border-[var(--border)] bg-[#0f0d0c] p-5">
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
      <section className="border-t border-[var(--border)] bg-[#141110]/80 py-14" id="cli">
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

          <div className="mt-10">
            <h3 className="font-display text-lg font-medium text-[var(--foreground)]">How the CLI sits in a repo</h3>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Config points at planning roots; the CLI reads and summarizes the same files the cockpit displays.
            </p>
            <div className="mt-4">
              <MermaidBlock chart={CHART_CLI_FLOW} />
            </div>
          </div>
        </div>
      </section>

      {/* Artifacts */}
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6" id="artifacts">
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
      </section>

      {/* Component showcase — shadcn-style Preview / Code tabs */}
      <section className="border-t border-[var(--border)] bg-[#141110]/50 py-14" id="components">
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
              description="Illustrative shell: roadmap column, STATE next-action, TASK-REGISTRY rows. Not connected to live XML."
              code={cockpitSource}
              codeLabel="cockpit-preview.tsx"
            >
              <CockpitPreview />
            </ShowcasePanel>
          </div>
        </div>
      </section>

      {/* Downloadable init bundle */}
      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6" id="init">
        <h2 className="font-display text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">Minimal init bundle</h2>
        <p className="mt-3 max-w-3xl text-[var(--muted-foreground)]">
          Download the same file layout the CLI would write for a minimal bootstrap: repo-root narrative,{" "}
          <code className="font-mono text-xs">planning-config.toml</code>, and core XML under{" "}
          <code className="font-mono text-xs">.planning/</code>. Use it to diff against your brownfield repo or to seed a
          review in PR form.
        </p>
        <div className="mt-8">
          <InitBundleDownload />
        </div>
      </section>

      {/* GAD / lineage — secondary */}
      <section className="border-t border-[var(--border)] bg-[#141110]/50 py-14" id="gad">
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

      <footer className="border-t border-[var(--border)] py-10">
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
