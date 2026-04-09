"use client";

import { XMLParser } from "fast-xml-parser";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Gavel,
  LayoutDashboard,
  ListTodo,
  Loader2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BuiltinEmbedPacksPayload } from "repo-planner/planning-pack";

type PhaseRow = { id: string; title: string; goal: string; status: string };
type TaskRow = { id: string; phaseId: string; goal: string; status: string };
type DecisionRow = { id: string; title: string; summary: string; impact: string };
type ErrorRow = { id: string; context: string; attempts: string };
type MainTab = "tasks" | "decisions" | "errors";

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

function parsePackFilesForCockpit(files: { path: string; content: string }[]) {
  const get = (suffix: string) => files.find((f) => f.path.endsWith(suffix))?.content;
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: true,
  });

  const roadmapXml = get("ROADMAP.xml");
  const stateXml = get("STATE.xml");
  const taskXml = get("TASK-REGISTRY.xml");
  const decisionsXml = get("DECISIONS.xml");
  const errorsXml = get("ERRORS-AND-ATTEMPTS.xml");

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
          title: shortTitle || (goal ? goal.slice(0, 72) + (goal.length > 72 ? "…" : "") : "Phase"),
          goal,
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
        const phaseId = attr(po, "id") || "?";
        const taskNodes = asArray(po.task as unknown | unknown[]);
        for (const t of taskNodes) {
          const o = t as Record<string, unknown>;
          tasks.push({
            id: attr(o, "id") || "?",
            phaseId,
            goal: textContent(o.goal) || "",
            status: (attr(o, "status") || "planned").toLowerCase(),
          });
        }
      }
    } catch {
      tasks = [];
    }
  }

  let decisions: DecisionRow[] = [];
  if (decisionsXml) {
    try {
      const doc = parser.parse(decisionsXml) as { decisions?: { decision?: unknown } };
      const raw = asArray(doc.decisions?.decision);
      for (const d of raw) {
        const o = d as Record<string, unknown>;
        decisions.push({
          id: attr(o, "id") || "?",
          title: textContent(o.title) || "Decision",
          summary: textContent(o.summary),
          impact: textContent(o.impact),
        });
      }
    } catch {
      decisions = [];
    }
  }

  let errors: ErrorRow[] = [];
  if (errorsXml) {
    try {
      const doc = parser.parse(errorsXml) as { "errors-and-attempts"?: Record<string, unknown> };
      const root = doc["errors-and-attempts"];
      if (root && typeof root === "object") {
        const raw = asArray((root as { error?: unknown }).error);
        for (const e of raw) {
          const o = e as Record<string, unknown>;
          errors.push({
            id: attr(o, "id") || "?",
            context: textContent(o.context) || textContent(o.description) || textContent(o.summary),
            attempts: textContent(o.attempts) || textContent(o["attempt-summary"]),
          });
        }
      }
    } catch {
      errors = [];
    }
  }

  return { phases, nextAction, tasks, decisions, errors };
}

function defaultPhaseSelection(phases: PhaseRow[]): "all" | string {
  if (!phases.length || phases[0]?.id === "—") return "all";
  const active = phases.find((p) => /active/i.test(p.status));
  return active?.id ?? "all";
}

export function CockpitFromPack({ preferPackId }: { preferPackId: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [phases, setPhases] = useState<PhaseRow[]>([]);
  const [nextAction, setNextAction] = useState("");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState<"all" | string>("all");
  const [mainTab, setMainTab] = useState<MainTab>("tasks");

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
        const parsed = parsePackFilesForCockpit(pack.files);
        const ph = parsed.phases.length ? parsed.phases : [{ id: "—", title: "No roadmap phases in pack", goal: "", status: "—" }];
        setPhases(ph);
        setNextAction(
          parsed.nextAction ||
            "Run planning snapshot in your repo to see the current next-action from STATE.xml.",
        );
        setTasks(parsed.tasks);
        setDecisions(parsed.decisions);
        setErrors(parsed.errors);
        setSelectedPhaseId(defaultPhaseSelection(ph));
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

  const selectablePhases = useMemo(
    () => (phases[0]?.id === "—" ? [] : phases),
    [phases],
  );

  const filteredTasks = useMemo(() => {
    if (selectedPhaseId === "all") return tasks;
    return tasks.filter((t) => t.phaseId === selectedPhaseId);
  }, [tasks, selectedPhaseId]);

  const selectedPhaseMeta = useMemo(
    () => selectablePhases.find((p) => p.id === selectedPhaseId),
    [selectablePhases, selectedPhaseId],
  );

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
      <div className="grid min-h-[220px] gap-0 md:grid-cols-[minmax(0,12.5rem)_1fr]">
        <aside className="border-b border-[var(--border)] bg-[var(--card)] p-3 md:border-b-0 md:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Roadmap <span className="font-normal normal-case">(click to filter tasks)</span>
          </p>
          <ul className="mt-2 max-h-[min(24rem,55vh)] space-y-1 overflow-y-auto pr-1 text-xs" role="list">
            {selectablePhases.length > 0 && (
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedPhaseId("all")}
                  className={cn(
                    "w-full rounded-md px-2 py-1.5 text-left transition-colors",
                    selectedPhaseId === "all"
                      ? "border border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/40",
                  )}
                  aria-pressed={selectedPhaseId === "all"}
                >
                  All phases
                </button>
              </li>
            )}
            {phases.map((ph, i) => {
              const selected = selectedPhaseId === ph.id;
              const isPlaceholder = ph.id === "—";
              return (
                <li key={ph.id + String(i)}>
                  {isPlaceholder ? (
                    <div className="rounded-md px-2 py-1.5 text-[var(--muted-foreground)]">
                      <span className="font-mono">{ph.id}</span> · {ph.title}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedPhaseId(ph.id)}
                      className={cn(
                        "w-full rounded-md px-2 py-1.5 text-left transition-colors",
                        selected
                          ? "border border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--foreground)]"
                          : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/40",
                      )}
                      aria-pressed={selected}
                    >
                      <span className="font-mono text-[var(--primary)]">{ph.id}</span> ·{" "}
                      {ph.title.length > 52 ? `${ph.title.slice(0, 50)}…` : ph.title}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>
        <div className="flex min-h-0 min-w-0 flex-col p-3">
          <div className="flex items-start gap-2 shrink-0">
            <ListTodo className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Next action <span className="font-normal normal-case text-[var(--muted-foreground)]">(STATE.xml)</span>
              </p>
              <p className="mt-1 text-sm leading-snug text-[var(--foreground)]">{nextAction}</p>
              {selectedPhaseMeta?.goal && selectedPhaseId !== "all" ? (
                <p className="mt-2 border-l-2 border-[var(--primary)]/35 pl-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
                  <span className="font-medium text-[var(--foreground)]">Phase goal · </span>
                  {selectedPhaseMeta.goal}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex shrink-0 flex-wrap gap-1 border-b border-[var(--border)] pb-2" role="tablist" aria-label="Planning detail">
            {(
              [
                ["tasks", "Tasks", ListTodo] as const,
                ["decisions", "Decisions", Gavel] as const,
                ["errors", "Errors & attempts", AlertTriangle] as const,
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mainTab === id}
                onClick={() => setMainTab(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  mainTab === id
                    ? "bg-[var(--primary)]/15 text-[var(--foreground)] ring-1 ring-[var(--primary)]/35"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]",
                )}
              >
                <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-hidden">
            {mainTab === "tasks" && (
              <div className="flex h-full flex-col">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Tasks <span className="font-normal normal-case">(TASK-REGISTRY.xml)</span>
                  {selectedPhaseId !== "all" ? (
                    <span className="ml-1 font-mono text-[var(--primary)]">phase {selectedPhaseId}</span>
                  ) : null}
                </p>
                {filteredTasks.length === 0 ? (
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    No tasks for this filter{selectedPhaseId !== "all" ? ` (phase ${selectedPhaseId})` : ""}.
                  </p>
                ) : (
                  <ul className="mt-2 max-h-[min(20rem,45vh)] space-y-2 overflow-y-auto pr-1 text-xs">
                    {filteredTasks.map((t) => {
                      const st = t.status;
                      const done = st === "done";
                      const progress = st === "in-progress" || st === "in_progress";
                      return (
                        <li
                          key={`${t.phaseId}-${t.id}`}
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
                            <span className="font-mono text-[var(--primary)]">{t.id}</span>
                            {selectedPhaseId === "all" ? (
                              <span className="text-[var(--muted-foreground)]"> · ph {t.phaseId}</span>
                            ) : null}{" "}
                            · {t.goal} <span className="text-[var(--muted-foreground)]">{st}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {mainTab === "decisions" && (
              <div className="max-h-[min(22rem,48vh)] overflow-y-auto pr-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Decisions <span className="font-normal normal-case">(DECISIONS.xml)</span>
                </p>
                {decisions.length === 0 ? (
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">No decisions in this pack.</p>
                ) : (
                  <ul className="mt-2 space-y-3 text-xs">
                    {decisions.map((d) => (
                      <li
                        key={d.id}
                        className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-2 leading-relaxed"
                      >
                        <p className="font-medium text-[var(--foreground)]">
                          <span className="font-mono text-[var(--primary)]">{d.id}</span> · {d.title}
                        </p>
                        {d.summary ? (
                          <p className="mt-1 text-[var(--muted-foreground)]">{d.summary}</p>
                        ) : null}
                        {d.impact ? (
                          <p className="mt-1 border-t border-[var(--border)] pt-1.5 text-[10px] text-[var(--muted-foreground)]">
                            <span className="font-semibold text-[var(--foreground)]">Impact · </span>
                            {d.impact}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {mainTab === "errors" && (
              <div className="max-h-[min(22rem,48vh)] overflow-y-auto pr-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Errors &amp; attempts <span className="font-normal normal-case">(ERRORS-AND-ATTEMPTS.xml)</span>
                </p>
                {errors.length === 0 ? (
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    No logged entries — file may be empty or only comments.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-3 text-xs">
                    {errors.map((e) => (
                      <li
                        key={e.id}
                        className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-2 leading-relaxed"
                      >
                        <p className="font-mono text-[var(--primary)]">{e.id}</p>
                        {e.context ? <p className="mt-1 text-[var(--muted-foreground)]">{e.context}</p> : null}
                        {e.attempts ? (
                          <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                            <span className="font-semibold text-[var(--foreground)]">Attempts · </span>
                            {e.attempts}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="border-t border-[var(--border)] px-3 py-2 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
        <strong className="text-[var(--foreground)]">Read-only app:</strong> roadmap click filters tasks by{" "}
        <code className="font-mono">TASK-REGISTRY</code> phase; tabs read <code className="font-mono">DECISIONS.xml</code> and{" "}
        <code className="font-mono">ERRORS-AND-ATTEMPTS.xml</code>. All sources are committed{" "}
        <code className="font-mono">.planning/</code> files in the pack, parsed with{" "}
        <strong className="text-[var(--foreground)]">fast-xml-parser</strong>. For the full workspace, embed{" "}
        <code className="font-mono">repo-planner/host</code>.
      </p>
    </div>
  );
}
