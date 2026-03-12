"use client";
/** Stub for IDE/typecheck when developing this submodule in isolation. Host provides real impl. */
import * as React from "react";

export const Badge = (p: React.ComponentProps<"span"> & { variant?: string }) => <span {...p} />;
