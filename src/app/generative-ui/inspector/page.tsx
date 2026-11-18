"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { RevisionRecord, UiNode, UiSchema } from "@/lib/genui/types";

function walk(node: UiNode, depth = 0): Array<{ depth: number; node: UiNode }> {
  const rows = [{ depth, node }];
  for (const c of node.children || []) rows.push(...walk(c, depth + 1));
  return rows;
}

function InspectorInner() {
  const params = useSearchParams();
  const runId = params.get("run") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [schema, setSchema] = useState<UiSchema | null>(null);
  const [revision, setRevision] = useState<RevisionRecord | null>(null);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/genui/runs/${encodeURIComponent(runId)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Load failed");
        if (cancelled) return;
        setRevision(json.current || null);
        setSchema(json.current?.schema || null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Load failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const rows = useMemo(
    () => (schema ? walk(schema.root) : []),
    [schema]
  );

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900">
      <header className="flex h-11 items-center gap-2 border-b border-slate-200 bg-white px-4 text-[12px]">
        <Link
          href="/generative-ui"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-slate-500 hover:bg-slate-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Workspace
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-semibold">UI Inspector</span>
        <Link
          href="/generative-ui/dashboard"
          className="ml-auto text-[11px] font-semibold text-slate-500 hover:text-slate-800"
        >
          Dashboard
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {!runId ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            Open a run from Dashboard / Workspace history, or pass{" "}
            <code className="rounded bg-slate-100 px-1">?run=run_…</code>
          </p>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading schema…
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : schema ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Page
              </p>
              <h1 className="mt-1 text-lg font-bold tracking-tight">
                {schema.meta.title}
              </h1>
              <p className="mt-1 text-[12px] text-slate-500">
                style={schema.meta.style}
                {revision?.critique
                  ? ` · score ${revision.critique.overall}/10`
                  : ""}
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-2 text-[11px] font-semibold text-slate-600">
                Component tree ({rows.length} nodes)
              </div>
              <ul className="max-h-[70vh] overflow-auto py-2 text-[12px]">
                {rows.map(({ depth, node }) => (
                  <li
                    key={node.id}
                    className="border-b border-slate-50 px-4 py-1.5 font-mono text-[11px] text-slate-700"
                    style={{ paddingLeft: 16 + depth * 14 }}
                  >
                    <span className="font-semibold text-slate-900">
                      {node.type}
                    </span>
                    <span className="text-slate-400"> · {node.id}</span>
                    {node.props?.title || node.props?.text ? (
                      <span className="text-slate-500">
                        {" "}
                        — {String(node.props.title || node.props.text).slice(0, 48)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default function InspectorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      }
    >
      <InspectorInner />
    </Suspense>
  );
}
