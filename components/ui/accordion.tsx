"use client";
/** Stub for IDE/typecheck when developing this submodule in isolation. Host provides real impl. */
import * as React from "react";

export const Accordion = (p: React.ComponentProps<"div"> & { type?: string; value?: string; collapsible?: boolean; onValueChange?: (v: string) => void }) => <div {...p} />;
export const AccordionItem = (p: React.ComponentProps<"div"> & { value?: string; collapsible?: boolean }) => <div {...p} />;
export const AccordionTrigger = (p: React.ComponentProps<"button"> & { asChild?: boolean }) => <button type="button" {...p} />;
export const AccordionContent = (p: React.ComponentProps<"div">) => <div {...p} />;
