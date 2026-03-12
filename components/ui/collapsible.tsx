"use client";
/** Stub for IDE/typecheck when developing this submodule in isolation. Host provides real impl. */
import * as React from "react";

export const Collapsible = (p: React.ComponentProps<"div"> & { open?: boolean; onOpenChange?: (open: boolean) => void; asChild?: boolean }) => <div data-state="open" {...p} />;
export const CollapsibleTrigger = (p: React.ComponentProps<"button">) => <button type="button" {...p} />;
export const CollapsibleContent = (p: React.ComponentProps<"div">) => <div {...p} />;
