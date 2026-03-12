"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  message: string;
  secondary?: string;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

/** Reusable empty state message for panels. */
export function EmptyState({ message, secondary, icon, className, children }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/50 bg-muted/5 py-8 px-4 text-center",
        className,
      )}
    >
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <p className="text-sm text-muted-foreground">{message}</p>
      {secondary && <p className="text-xs text-muted-foreground/80">{secondary}</p>}
      {children}
    </div>
  );
}
