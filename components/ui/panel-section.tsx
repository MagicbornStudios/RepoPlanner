"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type PanelSectionProps = {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  scrollClassName?: string;
  /** If true, content is scrollable with a max height */
  scrollable?: boolean;
};

/** Reusable panel block with optional title, actions, and scroll area. */
export function PanelSection({
  title,
  actions,
  children,
  className,
  scrollClassName,
  scrollable = false,
}: PanelSectionProps) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      {(title != null || actions != null) && (
        <div className="flex flex-none items-center justify-between gap-2">
          {title != null && <h3 className="text-sm font-medium text-foreground">{title}</h3>}
          {actions}
        </div>
      )}
      {scrollable ? (
        <ScrollArea className={cn("flex-1 min-h-0", scrollClassName)}>
          {children}
        </ScrollArea>
      ) : (
        children
      )}
    </section>
  );
}
