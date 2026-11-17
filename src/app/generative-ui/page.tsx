"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Monitor,
  Smartphone,
  Sparkles,
  Tablet,
} from "lucide-react";
import {
  GENUI_STYLE_LABELS,
  GENUI_STYLES,
  type GenuiStyle,
  type GenuiViewport,
} from "@/config/genui";
import { DeviceFrame } from "@/components/genui/DeviceFrame";
import { UiSchemaRenderer } from "@/components/genui/UiSchemaRenderer";
import { GlassCard } from "@/components/ui/GlassCard";
import type {
  DesignIntent,
  GenerationRun,
  RevisionRecord,
  UiSchema,
} from "@/lib/genui/types";

const OWNER_KEY = "glassportal-local";

const SAMPLE_PROMPT =
  "Create a modern SaaS analytics dashboard with a sidebar, KPI cards, revenue chart and recent transactions. Use a clean modern SaaS style.";

export default function GenerativeUiWorkspacePage() {
  const [prompt, setPrompt] = useState(SAMPLE_PROMPT);
  const [style, setStyle] = useState<GenuiStyle>("modern-saas");
  const [viewport, setViewport] = useState<GenuiViewport>("desktop");
  const [intent, setIntent] = useState<DesignIntent | null>(null);
  const [intentSource, setIntentSource] = useState<string>("");
  const [schema, setSchema] = useState<UiSchema | null>(null);
  const [run, setRun] = useState<GenerationRun | null>(null);
  const [revision, setRevision] = useState<RevisionRecord | null>(null);
  const [history, setHistory] = useState<GenerationRun[]>([]);
  const [busy, setBusy] = useState<"intent" | "generate" | "fixture" | null>(
    null
  );
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<"preview" | "schema" | "intent">("preview");

  const refreshHistory = async () => {
    try {
      const res = await fetch(
        `/api/genui/runs?ownerKey=${encodeURIComponent(OWNER_KEY)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (res.ok) setHistory(json.runs || []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void refreshHistory();
  }, []);

  const onParseIntent = async () => {
    setError("");
    setBusy("intent");
    try {
      const res = await fetch("/api/genui/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Intent parse failed");
      setIntent(json.intent);
      setIntentSource(json.source);
      setTab("intent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Intent parse failed");
    } finally {
      setBusy(null);
    }
  };

  const onGenerate = async (fixture: boolean) => {
    setError("");
    setNote("");
    setBusy(fixture ? "fixture" : "generate");
    try {
      const res = await fetch("/api/genui/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          style,
          ownerKey: OWNER_KEY,
          fixture,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generate failed");
      setIntent(json.run.intent);
      setIntentSource(json.intentSource || "");
      setRun(json.run);
      setRevision(json.current);
      setSchema(json.current?.schema || null);
      setNote(json.meta?.note || "");
      setTab("preview");
      await refreshHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(null);
    }
  };

  const loadRun = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/genui/runs/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Load failed");
      setRun(json.run);
      setRevision(json.current);
      setSchema(json.current?.schema || null);
      setIntent(json.run.intent);
      setPrompt(json.run.prompt);
      setStyle(json.run.style);
      setTab("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  };

  const schemaText = useMemo(
    () => (schema ? JSON.stringify(schema, null, 2) : ""),
    [schema]
  );

  return (
    <main className="min-h-screen bg-[#F9FAFB] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Studio
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                Generative UI Playground
              </p>
              <h1 className="text-sm font-semibold tracking-tight sm:text-base">
                Workspace — prompt → schema → preview
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Sparkles className="h-3.5 w-3.5" />
            Schema-safe · no arbitrary code exec
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[360px_1fr] lg:px-6">
        {/* Left: prompt controls */}
        <aside className="space-y-4 lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:self-start lg:overflow-y-auto">
          <GlassCard hover={false} className="space-y-3 p-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-600">
                Design prompt
              </span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                className="mech-input min-h-[140px] resize-y"
                placeholder="Describe the page you want…"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-600">
                Visual style
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {GENUI_STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStyle(s)}
                    className={`rounded-lg border px-2 py-2 text-[11px] font-semibold transition ${
                      style === s
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {GENUI_STYLE_LABELS[s]}
                  </button>
                ))}
              </div>
            </label>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={!!busy || !prompt.trim()}
                onClick={() => void onGenerate(false)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {busy === "generate" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate with LLM
              </button>
              <button
                type="button"
                disabled={!!busy || !prompt.trim()}
                onClick={() => void onGenerate(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {busy === "fixture" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Load sample schema
              </button>
              <button
                type="button"
                disabled={!!busy || !prompt.trim()}
                onClick={() => void onParseIntent()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {busy === "intent" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Parse intent only
              </button>
            </div>

            <p className="text-[10px] leading-relaxed text-slate-400">
              LLM needs <code className="text-slate-500">OPENAI_API_KEY</code>{" "}
              on the server. Sample schema works offline and is labeled as a
              fixture — not a fake model result.
            </p>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            ) : null}
            {note ? (
              <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                {note}
              </p>
            ) : null}
            {run ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">Run</span>{" "}
                  {run.id}
                </p>
                <p>
                  Model: {run.model.provider}/{run.model.name} ·{" "}
                  {run.model.mode}
                </p>
                {revision ? <p>Revision: {revision.id}</p> : null}
              </div>
            ) : null}
          </GlassCard>

          <GlassCard hover={false} className="space-y-2 p-4">
            <h2 className="text-sm font-semibold">Recent runs</h2>
            {history.length === 0 ? (
              <p className="text-xs text-slate-400">No saved runs yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {history.slice(0, 8).map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => void loadRun(h.id)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-[11px] hover:bg-slate-50"
                    >
                      <span className="line-clamp-2 font-medium text-slate-800">
                        {h.prompt}
                      </span>
                      <span className="mt-1 block text-slate-400">
                        {GENUI_STYLE_LABELS[h.style]} · {h.model.mode} ·{" "}
                        {new Date(h.createdAt).toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </aside>

        {/* Right: preview */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
              {(
                [
                  ["preview", "Preview"],
                  ["intent", "Intent"],
                  ["schema", "Schema"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    tab === id
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
              {(
                [
                  ["desktop", Monitor],
                  ["tablet", Tablet],
                  ["mobile", Smartphone],
                ] as const
              ).map(([id, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setViewport(id)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                    viewport === id
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  title={id}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline capitalize">{id}</span>
                </button>
              ))}
            </div>
          </div>

          <GlassCard hover={false} className="overflow-hidden p-0">
            {tab === "preview" ? (
              schema ? (
                <DeviceFrame viewport={viewport}>
                  <UiSchemaRenderer schema={schema} />
                </DeviceFrame>
              ) : (
                <div className="flex min-h-[420px] flex-col items-center justify-center gap-2 p-8 text-center">
                  <p className="text-sm font-semibold">No preview yet</p>
                  <p className="max-w-sm text-sm text-slate-500">
                    Generate with your API key, or load a sample schema to see
                    the whitelist renderer.
                  </p>
                </div>
              )
            ) : null}

            {tab === "intent" ? (
              <pre className="max-h-[70vh] overflow-auto p-4 text-xs leading-relaxed text-slate-700">
                {intent
                  ? `${intentSource ? `// source: ${intentSource}\n` : ""}${JSON.stringify(intent, null, 2)}`
                  : "// Parse intent or generate to see DesignIntent JSON"}
              </pre>
            ) : null}

            {tab === "schema" ? (
              <pre className="max-h-[70vh] overflow-auto p-4 text-xs leading-relaxed text-slate-700">
                {schemaText || "// Schema appears after a successful generate"}
              </pre>
            ) : null}
          </GlassCard>
        </section>
      </div>
    </main>
  );
}
