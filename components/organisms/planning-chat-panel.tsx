"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AuiIf,
  AssistantRuntimeProvider,
  ComposerPrimitive,
  ThreadPrimitive,
  useLocalRuntime,
} from "@assistant-ui/react";
import { AssistantMessage, EditComposer, UserMessage } from "@assistant-ui/react-ui";
import { motion } from "motion/react";
import { SendHorizonalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PlanningEditReview,
  type PlanningEdit,
} from "../planning/planning-edit-review";
import { Plan } from "../tool-ui/plan";

type PlanPayload = {
  id: string;
  title: string;
  description?: string;
  todos: Array<{ id: string; label: string; status: "pending" | "in_progress" | "completed" | "cancelled"; description?: string }>;
};

type QuestionStep = {
  id: string;
  title: string;
  description?: string;
  options: Array<{ id: string; label: string }>;
};

type PlanningChatPanelProps = {
  context?: Record<string, unknown>;
  className?: string;
};

function extractTextContent(message: unknown): string {
  if (!message || typeof message !== "object") return "";
  const parts = (message as { content?: unknown }).content;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const typed = part as { type?: unknown; text?: unknown };
      return typed.type === "text" && typeof typed.text === "string" ? typed.text : "";
    })
    .filter((text) => text.length > 0)
    .join("\n");
}

function asTextContent(text: string) {
  return [{ type: "text" as const, text }];
}

function QuestionFlowPlaceholder({
  steps,
  onComplete,
}: {
  steps: QuestionStep[];
  onComplete: (answers: Record<string, string[]>) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const step = steps[stepIndex];
  if (!step) return null;
  const isLast = stepIndex === steps.length - 1;
  const select = (optionId: string) => {
    const next = { ...answers, [step.id]: [optionId] };
    setAnswers(next);
    if (isLast) {
      onComplete(next);
    } else {
      setStepIndex((i) => i + 1);
    }
  };
  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-muted/10 p-3 text-sm">
      <p className="font-medium">{step.title}</p>
      {step.description ? <p className="text-xs text-muted-foreground">{step.description}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {step.options.map((opt) => (
          <Button key={opt.id} variant="outline" size="sm" onClick={() => select(opt.id)}>
            {opt.label}
          </Button>
        ))}
      </div>
      {!isLast && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setStepIndex((i) => Math.max(0, i - 1))}>
          Back
        </Button>
      )}
    </div>
  );
}

export function PlanningChatPanel({ context, className }: PlanningChatPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [pendingEdits, setPendingEdits] = useState<PlanningEdit[]>([]);
  const [applying, setApplying] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PlanPayload | null>(null);
  const [pendingQuestions, setPendingQuestions] = useState<{ steps: QuestionStep[] } | null>(null);
  const [planApproved, setPlanApproved] = useState(false);

  const adapter = useMemo(
    () => ({
      run: async (options: unknown) => {
        setError(null);
        setPendingEdits([]);
        setPendingPlan(null);
        setPendingQuestions(null);
        const rawMessages = (options as { messages?: unknown })?.messages;
        const messages = Array.isArray(rawMessages)
          ? rawMessages
              .map((message) => {
                if (!message || typeof message !== "object") return null;
                const role = (message as { role?: unknown }).role;
                if (role !== "user" && role !== "assistant") return null;
                const content = extractTextContent(message);
                if (!content.trim()) return null;
                return { role, content: content.trim() };
              })
              .filter((row): row is { role: "user" | "assistant"; content: string } => Boolean(row))
          : [];

        const response = await fetch("/api/ai/planning-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, context }),
        });
        const body = (await response.json()) as {
          ok?: boolean;
          reply?: string;
          error?: string;
          edits?: PlanningEdit[];
          plan?: PlanPayload;
          questions?: { steps: QuestionStep[] };
        };
        if (!response.ok || !body.ok) {
          const reason = body.error ?? `Request failed (${response.status})`;
          setError(reason);
          return { content: asTextContent(`Error: ${reason}`) };
        }
        if (Array.isArray(body.edits) && body.edits.length > 0) {
          setPendingEdits(body.edits);
        }
        if (body.plan) {
          setPendingPlan(body.plan);
        }
        if (body.questions?.steps?.length) {
          setPendingQuestions(body.questions);
        }
        return {
          content: asTextContent((body.reply ?? "No reply.").trim() || "No reply."),
        };
      },
    }),
    [context, planApproved],
  );

  const runtime = useLocalRuntime(adapter);

  const onApply = useCallback(async (edits: PlanningEdit[]) => {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/planning-edits/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edits: edits.map((e) => ({ path: e.path, newContent: e.newContent })),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; applied?: string[] };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Apply failed.");
        return;
      }
      setPendingEdits([]);
    } finally {
      setApplying(false);
    }
  }, []);

  const onReject = useCallback(() => {
    setPendingEdits([]);
  }, []);

  const hasEdits = pendingEdits.length > 0;

  return (
    <section className={`flex h-full min-h-0 ${hasEdits ? "flex-row gap-0" : "flex-col"} ${className ?? ""}`}>
      <div className={hasEdits ? "flex min-w-0 shrink-0 flex-col border-r border-border/60" : "flex min-h-0 flex-1 flex-col"} style={hasEdits ? { width: "40%" } : undefined}>
        <AssistantRuntimeProvider runtime={runtime}>
          <ThreadPrimitive.Root className="flex h-full min-h-0 flex-col rounded-lg border-0 bg-muted/10">
            <ThreadPrimitive.Viewport className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
              <AuiIf condition={(s) => s.thread.isEmpty}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="rounded-lg border border-border/60 bg-background/50 p-4"
                >
                  <p className="font-semibold text-foreground">Planning assistant</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ask about phases, tasks, agents, STATE, TASK-REGISTRY, or request edits to .planning files. I can propose changes for you to review and apply.
                  </p>
                </motion.div>
              </AuiIf>
              <ThreadPrimitive.Messages
                components={{
                  EditComposer,
                  UserMessage,
                  AssistantMessage,
                }}
              />
              <ThreadPrimitive.ScrollToBottom className="ml-auto" />
            </ThreadPrimitive.Viewport>

            {error ? <p className="px-3 pb-2 text-xs text-red-400">{error}</p> : null}

            {pendingPlan ? (
              <div className="border-t border-border/60 px-3 py-2">
                <Plan
                  id={pendingPlan.id}
                  title={pendingPlan.title}
                  description={pendingPlan.description}
                  todos={pendingPlan.todos}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setPlanApproved(true);
                      setPendingPlan(null);
                    }}
                  >
                    Approve plan
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setPendingPlan(null); setPlanApproved(false); }}
                  >
                    Request changes
                  </Button>
                </div>
              </div>
            ) : null}

            {pendingQuestions?.steps?.length ? (
              <div className="border-t border-border/60 px-3 py-2">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Answer these to continue</p>
                <QuestionFlowPlaceholder
                  steps={pendingQuestions.steps}
                  onComplete={(answers) => {
                    setPendingQuestions(null);
                    console.log("QuestionFlow answers:", answers);
                  }}
                />
              </div>
            ) : null}

            <div className="border-t border-border/60 p-3">
              <ComposerPrimitive.Root className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
                <ComposerPrimitive.Input
                  placeholder="Ask about planning, tasks, phases, STATE..."
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <ComposerPrimitive.Send asChild>
                  <Button type="button" size="icon" className="size-8" aria-label="Send" title="Send">
                    <SendHorizonalIcon className="size-4" />
                  </Button>
                </ComposerPrimitive.Send>
              </ComposerPrimitive.Root>
            </div>
          </ThreadPrimitive.Root>
        </AssistantRuntimeProvider>
      </div>

      {hasEdits ? (
        <div className="flex min-h-0 min-w-0 flex-[3] flex-col">
          <PlanningEditReview
            edits={pendingEdits}
            onApply={onApply}
            onReject={onReject}
            applying={applying}
          />
        </div>
      ) : null}
    </section>
  );
}
