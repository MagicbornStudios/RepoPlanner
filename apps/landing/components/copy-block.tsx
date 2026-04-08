"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyBlock({
  label,
  children,
  className,
}: {
  label?: string;
  children: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [children]);

  return (
    <div className={cn("relative rounded-lg border border-[var(--border)] bg-[#0f0d0c]", className)}>
      {label ? (
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2">
          <span className="text-xs font-medium text-[var(--muted-foreground)]">{label}</span>
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => void copy()}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      ) : (
        <div className="absolute right-2 top-2 z-10">
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => void copy()}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      )}
      <pre className="max-h-[min(24rem,50vh)] overflow-auto p-3 pr-20 font-mono text-xs leading-relaxed text-[var(--foreground)] [overflow-wrap:anywhere]">
        {children}
      </pre>
    </div>
  );
}
