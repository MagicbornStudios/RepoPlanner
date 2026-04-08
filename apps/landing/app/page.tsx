import { ArrowUpRight, BookOpen, Github, LineChart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Same embed as portfolio GetAnythingDoneSection — GSD lineage, creator perspective (~10m10s). */
const YOUTUBE_ID = "958hJe-AcvU";
const YOUTUBE_START_SEC = 610;

const GET_ANYTHING_DONE = "https://github.com/MagicbornStudios/get-anything-done";
const GSD_UPSTREAM = "https://github.com/gsd-build/get-shit-done";
const GAD_EVALS = "https://github.com/MagicbornStudios/get-anything-done/tree/main/evals";
const REPOPLANNER_REPO = "https://github.com/MagicbornStudios/RepoPlanner";

export default function Page() {
  const embedSrc = `https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?start=${YOUTUBE_START_SEC}`;
  const youtubeWatch = `https://www.youtube.com/watch?v=${YOUTUBE_ID}&t=${YOUTUBE_START_SEC}s`;

  return (
    <main className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-4xl lg:px-8">
        <p className="font-display text-sm font-medium tracking-wide text-[var(--primary)]">Archived</p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
          RepoPlanner
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--muted-foreground)]">
          An embeddable planning cockpit and CLI for roadmap, state, and task-registry workflows — XML-first,
          host-mountable React surfaces, and tools that kept the <em>living files</em> as the source of truth.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <a href={GET_ANYTHING_DONE} target="_blank" rel="noopener noreferrer">
              <Github className="size-4" aria-hidden />
              MagicbornStudios / get-anything-done
              <ArrowUpRight className="size-4 opacity-80" aria-hidden />
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={GSD_UPSTREAM} target="_blank" rel="noopener noreferrer">
              GSD upstream
              <ArrowUpRight className="size-4 opacity-80" aria-hidden />
            </a>
          </Button>
          <Button variant="ghost" asChild>
            <a href={REPOPLANNER_REPO} target="_blank" rel="noopener noreferrer">
              RepoPlanner source
            </a>
          </Button>
        </div>
      </div>

      <section className="border-y border-[var(--border)] bg-[#141110]">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:max-w-4xl lg:px-8">
          <h2 className="font-display text-2xl font-semibold text-[var(--foreground)]">What it tried to solve</h2>
          <ul className="mt-6 space-y-4 text-[var(--muted-foreground)]">
            <li>
              <strong className="text-[var(--foreground)]">Visibility without a second database</strong> — summarize
              roadmap, state, tasks, and decisions from the same files agents and humans already edit.
            </li>
            <li>
              <strong className="text-[var(--foreground)]">A lighter loop than heavy methodology</strong> — fewer
              prescriptive gates than a rigid phase machine; closer to “keep the cockpit aligned with the repo.”
            </li>
            <li>
              <strong className="text-[var(--foreground)]">Host integration</strong> — pack views, live reads, and CLI
              helpers so a Next.js app could embed planning without forking the entire workflow engine.
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:max-w-4xl lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[var(--foreground)]">Where we moved</h2>
            <p className="mt-4 leading-relaxed text-[var(--muted-foreground)]">
              Active work now lives in <strong className="text-[var(--foreground)]">Get Anything Done</strong> — a
              monorepo-friendly CLI, planning model, and an{' '}
              <a href={GAD_EVALS} className="text-[var(--primary)] underline-offset-4 hover:underline">
                evaluation framework
              </a>{' '}
              so we can compare runs and read outcomes instead of guessing. The line traces to{' '}
              <a href={GSD_UPSTREAM} className="text-[var(--primary)] underline-offset-4 hover:underline">
                Get Shit Done
              </a>
              ; the talk below is useful context on tight loops and evaluable specs.
            </p>
            <p className="mt-4 leading-relaxed text-[var(--muted-foreground)]">
              <strong className="text-[var(--foreground)]">Emerging findings:</strong> RepoPlanner’s looser constraints
              — lighter than both GSD-shaped rigor and full GAD ceremony — are showing strong results in those same GAD
              benchmarks. The evaluation harness makes the benefit visible; it does not mean “more rigid” always wins.
            </p>
          </div>
          <Card className="overflow-hidden border-[var(--border)] bg-[var(--card)]">
            <div className="aspect-video w-full">
              <iframe
                title="Get Shit Done — creator perspective on structured planning"
                className="h-full w-full"
                src={embedSrc}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
            <CardContent className="pb-4 pt-3">
              <p className="text-center text-xs text-[var(--muted-foreground)]">
                <a href={youtubeWatch} className="underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
                  Open on YouTube
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 lg:max-w-4xl lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LineChart className="size-5 text-[var(--primary)]" aria-hidden />
                Evaluations
              </CardTitle>
              <CardDescription>
                Browse benchmark projects, scoring, and findings — the clearest place to see what GAD measures.
              </CardDescription>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="size-5 text-[var(--primary)]" aria-hidden />
                Why it is not maintained
              </CardTitle>
              <CardDescription>
                Not because the ideas failed — the team shifted to GAD for monorepo tooling and a single eval story.
                Keeping a separate UI aligned with fast-moving planning formats was costly; shipping slowed. RepoPlanner
                remains a reference for a lighter-weight loop; this site is a static signpost.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                If you want the active CLI and methodology, start with{' '}
                <a href={GET_ANYTHING_DONE} className="text-[var(--primary)] underline-offset-4 hover:underline">
                  get-anything-done
                </a>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
