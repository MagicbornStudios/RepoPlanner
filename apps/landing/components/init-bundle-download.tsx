"use client";

import { Download, FileArchive, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import JSZip from "jszip";

import { Button } from "@/components/ui/button";
import { INIT_BUNDLE_FILES } from "@/lib/init-bundle";

export function InitBundleDownload() {
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadZip = useCallback(async () => {
    setError(null);
    setZipping(true);
    try {
      const zip = new JSZip();
      for (const f of INIT_BUNDLE_FILES) {
        const res = await fetch(f.href);
        if (!res.ok) {
          throw new Error(`Failed to fetch ${f.href}: ${res.status}`);
        }
        const text = await res.text();
        zip.file(f.zipPath, text);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "repo-planner-minimal-init.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Zip failed");
    } finally {
      setZipping(false);
    }
  }, []);

  return (
    <div className="bg-rp-panel-soft rounded-2xl border border-[var(--border)] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-medium text-[var(--foreground)]">Minimal init bundle</h3>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
            Same shape as <code className="font-mono text-xs">planning setup init --minimal</code>: repo-root{" "}
            <code className="font-mono text-xs">REQUIREMENTS.md</code>, <code className="font-mono text-xs">planning-config.toml</code>, and core XML under{" "}
            <code className="font-mono text-xs">.planning/</code>. Merge into an <strong className="text-[var(--foreground)]">existing</strong> repository — this
            loop is for brownfield work.
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0 gap-2"
          onClick={() => void downloadZip()}
          disabled={zipping}
        >
          {zipping ? <Loader2 className="size-4 animate-spin" /> : <FileArchive className="size-4" />}
          Download zip
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {INIT_BUNDLE_FILES.map((f) => (
          <li key={f.zipPath}>
            <a
              href={f.href}
              download
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-2 text-xs font-mono text-[var(--primary)] transition-colors hover:bg-[var(--muted)]/30"
            >
              <Download className="size-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="min-w-0 truncate">{f.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
