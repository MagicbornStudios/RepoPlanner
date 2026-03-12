"use client";
/** Stub for IDE/typecheck when developing this submodule in isolation. Host provides real impl. */
import * as React from "react";

const Slot = (p: React.ComponentProps<"div">) => <div {...p} />;
export const Card = Slot;
export const CardHeader = Slot;
export const CardTitle = Slot;
export const CardDescription = Slot;
export const CardContent = Slot;
export const CardFooter = Slot;
