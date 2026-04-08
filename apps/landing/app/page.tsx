import { ArrowUpRight, BookOpen, LineChart, Terminal } from "lucide-react";

import { CopyBlock } from "@/components/copy-block";
import { MermaidBlock } from "@/components/mermaid-block";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CHART_ARTIFACT_GRAPH,
  CHART_CLI_FLOW,
  DECISIONS_STUB,
  MINIMAL_TREE_SNIPPET,
  STATE_XML_STUB,
  TASK_REGISTRY_STUB,
} from "@/lib/planning-content";

const YOUTUBE_ID = "958hJe-AcvU";
const YOUTUBE_START_SEC = 610;

const GET_ANYTHING_DONE = "https://github.com/MagicbornStudios/get-anything-done";
const GSD_UPSTREAM = "https://github.com/gsd-build/get-shit-done";
const GAD_EVALS = "https://github.com/MagicbornStudios/get-anything-done/tree/main/evals";

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

  return (
    <main className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Hero — RepoPlanner is the site */}
      <header className="mx-auto max-w-4xl px-4 pb-10 pt-16 sm:px-6 sm:pb-14 sm:pt-20">
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
          reference implementation. Active CLI and eval work continues in Get Anything Done (see end of page).
        </p>
      </header>

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

      {/* GAD / lineage — secondary */}
      <section className="border-t border-[var(--border)] bg-[#141110]/50 py-14" id="gad">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-semibold text-[var(--foreground)]">Where active work lives</h2>
          <p className="mt-3 max-w-2xl text-[var(--muted-foreground)]">
            The team moved day-to-day planning to <strong className="text-[var(--foreground)]">Get Anything Done</strong>{" "}
            — a CLI, shared docs model, and an evaluation framework so outcomes are measurable. Lineage traces to{" "}
            <a href={GSD_UPSTREAM} className="text-[var(--primary)] underline-offset-4 hover:underline">
              Get Shit Done
            </a>
            .
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Card className="border-[var(--border)] bg-[var(--card)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="size-5 text-[var(--primary)]" aria-hidden />
                  get-anything-done
                </CardTitle>
                <CardDescription>Primary open-source home for the GAD CLI, skills, and benchmarks.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button asChild className="w-full sm:w-auto">
                  <a href={GET_ANYTHING_DONE} target="_blank" rel="noopener noreferrer">
                    GitHub — MagicbornStudios / get-anything-done
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
                    github.com/…/get-anything-done/tree/main/evals
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
            RepoPlanner’s lighter constraints still show strong results in those GAD benchmarks — the harness makes
            tradeoffs visible without claiming “more ceremony” always wins.
          </p>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-10">
        <div className="mx-auto max-w-4xl px-4 text-center text-xs text-[var(--muted-foreground)] sm:px-6">
          <p>RepoPlanner — archived reference; cockpit + CLI + planning file model.</p>
          <p className="mt-2">
            Source:{" "}
            <a
              href="https://github.com/MagicbornStudios/RepoPlanner"
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
