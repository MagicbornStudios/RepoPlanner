"use client";

import { XMLParser } from "fast-xml-parser";
import { CheckCircle2, Circle, LayoutDashboard, ListTodo, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { BuiltinEmbedPacksPayload } from "repo-planner/planning-pack";

type PhaseRow = { id: string; title: string; status: string };
type TaskRow = { id: string; goal: string; status: string };

function asArray<T>(x: T | T[] | undefined): T[] {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function attr(el: Record<string, unknown> | undefined, name: string): string {
  if (!el) return "";
  const v = el[`@_${name}`];
  return typeof v === "string" ? v : "";
}

function textContent(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object" && "#text" in v && typeof (v as { "#text": string })["#text"] === "string") {
    return (v as { "#text": string })["#text"].trim();
  }
  return "";
}

function parsePackFiles(files: { path: string; content: string }[]) {
  const get = (suffix: string) => files.find((f) => f.path.endsWith(suffix))?.content;
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: true,
  });

  const roadmapXml = get("ROADMAP.xml");
  const stateXml = get("STATE.xml");
  const taskXml = get("TASK-REGISTRY.xml");

  let phases: PhaseRow[] = [];
  if (roadmapXml) {
    try {
      const doc = parser.parse(roadmapXml) as { roadmap?: { phase?: unknown } };
      const raw = asArray(doc.roadmap?.phase);
      phases = raw.map((ph) => {
        const o = ph as Record<string, unknown>;
        const shortTitle = textContent(o.title);
        const goal = textContent(o.goal);
        return {
          id: attr(o, "id") || "?",
          title: shortTitle || goal || "Phase",
          status: textContent(o.status) || "planned",
        };
      });
    } catch {
      phases = [];
    }
  }

  let nextAction = "";
  if (stateXml) {
    try {
      const doc = parser.parse(stateXml) as { state?: { "next-action"?: unknown } };
      nextAction = textContent(doc.state?.["next-action"]);
    } catch {
      nextAction = "";
    }
  }

  let tasks: TaskRow[] = [];
  if (taskXml) {
    try {
      const doc = parser.parse(taskXml) as {
        "task-registry"?: { phase?: unknown | unknown[] };
      };
      const phaseNodes = asArray(doc["task-registry"]?.phase);
      for (const ph of phaseNodes) {
        const po = ph as Record<string, unknown>;
        const taskNodes = asArray(po.task as unknown | unknown[]);
        for (const t of taskNodes) {
          const o = t as Record<string, unknown>;
          tasks.push({
            id: attr(o, "id") || "?",
            goal: textContent(o.goal) || "",
            status: (attr(o, "status") || "planned").toLowerCase(),
          });
        }
      }
    } catch {
      tasks = [];
    }
  }

  return { phases, nextAction, tasks };
}

export function CockpitFromPack({ preferPackId }: { preferPackId: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [phases, setPhases] = useState<PhaseRow[]>([]);
  const [nextAction, setNextAction] = useState("");
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetch("/planning-embed/builtin-packs.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((payload: BuiltinEmbedPacksPayload) => {
        if (cancelled) return;
        const pack =
          payload.packs?.find((p) => p.id === preferPackId) ?? payload.packs?.[0];
        if (!pack?.files?.length) {
          setErr("No built-in pack loaded.");
          return;
        }
        const parsed = parsePackFiles(pack.files);
        setPhases(parsed.phases.length ? parsed.phases : [{ id: "—", title: "No roadmap phases in pack", status: "—" }]);
        setNextAction(
          parsed.nextAction ||
            "Run planning snapshot in your repo to see the current next-action from STATE.xml.",
        );
        setTasks(parsed.tasks);
      })
      .catch(() => {
        if (!cancelled) setErr("Could not load built-in pack.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [preferPackId]);

  const displayPhases = useMemo(() => phases, [phases]);
  const displayTasks = useMemo(() => tasks, [tasks]);

  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)]">
        <Loader2 className="size-8 animate-spin text-[var(--primary)]" aria-hidden />
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 text-center text-sm text-[var(--muted-foreground)]">
        {err}
      </div>
    );
  }

  const activeIdx = displayPhases.findIndex((p) => /active/i.test(p.status));

  return (
    <div className="overflow-hidden rounded-xl border-2 border-[var(--primary)]/35 bg-[var(--background)] text-left shadow-lg">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--foreground)]">
          <LayoutDashboard className="size-4 text-[var(--primary)]" aria-hidden />
          Planning cockpit
          <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)]">
            read-only · parsed XML
          </span>
        </div>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled>
          Snapshot
        </Button>
      </div>
      <div className="grid min-h-[220px] gap-0 md:grid-cols-[minmax(0,11rem)_1fr]">
        <aside className="border-b border-[var(--border)] bg-[var(--card)] p-3 md:border-b-0 md:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Roadmap</p>
          <ul className="mt-2 max-h-[min(22rem,50vh)] space-y-1.5 overflow-y-auto pr-1 text-xs">
            {displayPhases.map((ph, i) => {
              const isActive = i === (activeIdx >= 0 ? activeIdx : 0);
              return (
                <li
                  key={ph.id + String(i)}
                  className={
                    isActive
                      ? "rounded-md border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-2 py-1.5 text-[var(--foreground)]"
                      : "rounded-md px-2 py-1.5 text-[var(--muted-foreground)]"
                  }
                >
                  <span className="font-mono text-[var(--primary)]">{ph.id}</span> ·{" "}
                  {ph.title.length > 56 ? `${ph.title.slice(0, 54)}…` : ph.title}
                </li>
              );
            })}
          </ul>
        </aside>
        <div className="p-3">
          <div className="flex items-start gap-2">
            <ListTodo className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Next action <span className="font-normal normal-case text-[var(--muted-foreground)]">(STATE.xml)</span>
              </p>
              <p className="mt-1 text-sm leading-snug text-[var(--foreground)]">{nextAction}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Tasks <span className="font-normal normal-case">(TASK-REGISTRY.xml)</span>
            </p>
            {displayTasks.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]">No tasks in this pack.</p>
            ) : (
              <ul className="max-h-[min(22rem,50vh)] space-y-2 overflow-y-auto pr-1 text-xs">
                {displayTasks.map((t) => {
                  const st = t.status;
                  const done = st === "done";
                  const progress = st === "in-progress" || st === "in_progress";
                  return (
                    <li
                      key={t.id}
                      className={
                        progress
                          ? "flex items-start gap-2 rounded-lg border border-[var(--primary)]/45 bg-[var(--card)] px-2 py-2"
                          : "flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-2"
                      }
                    >
                      {done ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500/90" aria-hidden />
                      ) : (
                        <Circle
                          className={
                            progress
                              ? "mt-0.5 size-4 shrink-0 text-amber-500/90"
                              : "mt-0.5 size-4 shrink-0 text-[var(--muted-foreground)]/70"
                          }
                          aria-hidden
                        />
                      )}
                      <div>
                        <span className="font-mono text-[var(--primary)]">{t.id}</span> · {t.goal}{" "}
                        <span className="text-[var(--muted-foreground)]">{st}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
      <p className="border-t border-[var(--border)] px-3 py-2 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
        <strong className="text-[var(--foreground)]">Read-only app:</strong> rows above are parsed from committed{" "}
        <code className="font-mono">ROADMAP.xml</code>, <code className="font-mono">STATE.xml</code>, and{" "}
        <code className="font-mono">TASK-REGISTRY.xml</code> in this repo&apos;s{" "}
        <code className="font-mono">.planning/</code>, bundled as JSON and parsed in the browser with{" "}
        <strong className="text-[var(--foreground)]">fast-xml-parser</strong> (not embeddings). Same chrome as the home page{" "}
        <strong className="text-[var(--foreground)]">Cockpit (mock)</strong>, which uses static placeholder copy. For the full
        workspace, embed <code className="font-mono">repo-planner/host</code>.
      </p>
    </div>
  );
}
