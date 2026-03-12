"use client";
/** Stub for IDE/typecheck when developing this submodule in isolation. Host provides real impl. */
import * as React from "react";

export const ChartConfig = {} as Record<string, unknown>;
export const ChartContainer = (p: React.ComponentProps<"div"> & { config?: Record<string, unknown> }) => <div {...p} />;
export const ChartTooltip = (p: React.ComponentProps<"div">) => <div {...p} />;
export const ChartTooltipContent = (p: React.ComponentProps<"div"> & { children?: React.ReactNode }) => <div {...p} />;
