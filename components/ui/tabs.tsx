"use client";
/** Stub for IDE/typecheck when developing this submodule in isolation. Host provides real impl. */
import * as React from "react";

type TabsContext = { value: string; onValueChange: (v: string) => void };
const TabsCtx = React.createContext<TabsContext | null>(null);

export const Tabs = (p: React.ComponentProps<"div"> & { value?: string; onValueChange?: (v: string) => void; defaultValue?: string }) => (
  <TabsCtx.Provider value={{ value: p.value ?? p.defaultValue ?? "", onValueChange: p.onValueChange ?? (() => {}) }}>{p.children}</TabsCtx.Provider>
);
export const TabsList = (p: React.ComponentProps<"div">) => <div role="tablist" {...p} />;
export const TabsTrigger = (p: React.ComponentProps<"button"> & { value: string }) => <button type="button" {...p} />;
export const TabsContent = (p: React.ComponentProps<"div"> & { value: string }) => <div role="tabpanel" {...p} />;
