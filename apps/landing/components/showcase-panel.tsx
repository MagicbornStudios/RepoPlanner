"use client";

import type { ReactNode } from "react";

import { CopyBlock } from "@/components/copy-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ShowcasePanel({
  title,
  description,
  code,
  codeLabel = "tsx",
  children,
}: {
  title: string;
  description?: ReactNode;
  code: string;
  /** Shown in the code panel header */
  codeLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[#141110]/50 p-5">
      <h3 className="font-display text-lg font-medium text-[var(--foreground)]">{title}</h3>
      {description ? (
        <div className="mt-2 text-sm text-[var(--muted-foreground)]">{description}</div>
      ) : null}
      <Tabs defaultValue="preview" className="mt-4">
        <TabsList className="w-full justify-start sm:w-auto">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
        <TabsContent value="preview" className="mt-4">
          {children}
        </TabsContent>
        <TabsContent value="code" className="mt-4">
          <CopyBlock label={codeLabel}>{code}</CopyBlock>
        </TabsContent>
      </Tabs>
    </div>
  );
}
