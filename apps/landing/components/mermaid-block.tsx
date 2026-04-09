"use client";

import mermaid from "mermaid";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

let mermaidConfigured = false;

export function MermaidBlock({ chart, className }: { chart: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!containerRef.current) return;
      setError(null);
      if (!mermaidConfigured) {
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          fontFamily: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
          themeVariables: {
            primaryColor: "#292524",
            primaryTextColor: "#fafaf9",
            primaryBorderColor: "#57534e",
            lineColor: "#78716c",
            secondaryColor: "#1c1917",
            tertiaryColor: "#0c0a09",
          },
        });
        mermaidConfigured = true;
      }
      try {
        const { svg } = await mermaid.render(`m-${id}-${Math.random().toString(36).slice(2)}`, chart);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Diagram failed to render");
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 [&_svg]:mx-auto [&_svg]:max-w-full",
        className,
      )}
    >
      {error ? (
        <p className="text-center text-sm text-red-400">{error}</p>
      ) : (
        <div ref={containerRef} className="flex min-h-[120px] justify-center overflow-x-auto" />
      )}
    </div>
  );
}
