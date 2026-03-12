"use client";
/** Stub for IDE/typecheck when developing this submodule in isolation. Host provides real impl. */
import * as React from "react";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { size?: string }
>((props, ref) => <input ref={ref} {...props} />);
