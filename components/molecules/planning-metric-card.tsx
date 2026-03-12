"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PlanningMetricCardProps = {
  title: string;
  icon?: React.ReactNode;
  value: React.ReactNode;
  secondary?: React.ReactNode;
  /** Optional class for the value wrapper (default: text-2xl font-bold text-foreground). Use e.g. text-base for Badge/custom content. */
  valueClassName?: string;
  className?: string;
  /** Shown on hover (native title). Use for extra context without clutter. */
  tooltip?: string;
};

/** Reusable metric card: title (optional icon), main value, optional secondary line. Use for dashboard and test-reports grids. */
export function PlanningMetricCard({
  title,
  icon,
  value,
  secondary,
  valueClassName = "text-2xl font-bold text-foreground",
  className,
  tooltip,
}: PlanningMetricCardProps) {
  return (
    <Card className={cn("border-border/50 bg-muted/20", className)} title={tooltip}>
      <CardHeader className="pb-1">
        <CardTitle className={cn("text-xs font-medium text-muted-foreground", icon && "flex items-center gap-2")}>
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn(valueClassName)}>{value}</div>
        {secondary != null && <p className="text-[10px] text-muted-foreground">{secondary}</p>}
      </CardContent>
    </Card>
  );
}
