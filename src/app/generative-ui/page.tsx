"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  History,
  Loader2,
  Monitor,
  Smartphone,
  Sparkles,
  Tablet,
  X,
} from "lucide-react";
import {
  GENUI_PALETTE_DEFAULTS,
  GENUI_STYLE_LABELS,
  GENUI_STYLES,
  type GenuiPalette,
  type GenuiStyle,
  type GenuiViewport,
} from "@/config/genui";
import { DeviceFrame } from "@/components/genui/DeviceFrame";
import { UiSchemaRenderer } from "@/components/genui/UiSchemaRenderer";
import type {
  DesignIntent,
  GenerationRun,
  RevisionRecord,
  UiSchema,
} from "@/lib/genui/types";

const OWNER_KEY = "glassportal-local";

const SAMPLE_PROMPT =
  "Create a dark geek night-sky analytics dashboard with a sidebar, KPI cards, revenue chart and recent transactions.";

const STYLE_SWATCH: Record<GenuiStyle, string> = {
  minimal: "#F8FAFC",
  "modern-saas": "#4F46E5",
  editorial: "#FAF7F2",
  "night-sky": "#070B1A",
};

export default function GenerativeUiWorkspacePage() {
  const [prompt, setPrompt] = useState(SAMPLE_PROMPT);
  const [style, setStyle] = useState<GenuiStyle>("night-sky");
  const [palette, setPalette] = useState<GenuiPalette>(
    GENUI_PALETTE_DEFAULTS["night-sky"]
  );
  const [viewport, setViewport] = useState<GenuiViewport>("desktop");
  const [intent, setIntent] = useState<DesignIntent | null>(null);
  const [intentSource, setIntentSource] = useState<string>("");
  const [schema, setSchema] = useState<UiSchema | null>(null);
  const [run, setRun] = useState<GenerationRun | null>(null);
  const [revision, setRevision] = useState<RevisionRecord | null>(null);
  const [history, setHistory] = useState<GenerationRun[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState<"intent" | "generate" | "fixture" | null>(
    null
  );
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<"preview" | "schema" | "intent">("preview");
  const historyRef = useRef<HTMLDivElement>(null);

  const applyStyle = (next: GenuiStyle) => {
    setStyle(next);
    setPalette(GENUI_PALETTE_DEFAULTS[next]);
  };

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

  useEffect(() => {
    if (!historyOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!historyRef.current?.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [historyOpen]);

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
      if (json.run?.style) {
        setStyle(json.run.style);
        setPalette(
          GENUI_PALETTE_DEFAULTS[json.run.style as GenuiStyle] || palette
        );
      }
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
      setPalette(
        GENUI_PALETTE_DEFAULTS[json.run.style as GenuiStyle] ||
          GENUI_PALETTE_DEFAULTS["modern-saas"]
      );
      setTab("preview");
      setHistoryOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  };

  const schemaText = useMemo(
    () => (schema ? JSON.stringify(schema, null, 2) : ""),
    [schema]
  );

  const previewSchema = useMemo(() => {
    if (!schema) return null;
    return {
      ...schema,
      meta: { ...schema.meta, style },
    };
  }, [schema, style]);

  return (
    <main className="min-h-screen bg-[#F4F6F8] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between gap-3 px-4 lg:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Studio
            </Link>
            <div className="h-3.5 w-px bg-slate-200" />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Generative UI
              </p>
              <h1 className="truncate text-[13px] font-semibold tracking-tight">
                Workspace
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-[10px] text-slate-400 sm:inline">
              Schema-safe · no code exec
            </span>
            <div className="relative" ref={historyRef}>
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="relative flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                aria-label="Toggle history"
                title="History"
              >
                <History className="h-3.5 w-3.5" />
                {history.length > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-slate-900 px-1 text-[8px] font-bold text-white">
                    {Math.min(history.length, 9)}
                  </span>
                ) : null}
              </button>
              {historyOpen ? (
                <div className="absolute right-0 top-10 z-40 w-[300px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                    <p className="text-[11px] font-semibold text-slate-800">
                      Recent runs
                    </p>
                    <button
                      type="button"
                      onClick={() => setHistoryOpen(false)}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                      aria-label="Close history"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-1.5">
                    {history.length === 0 ? (
                      <p className="px-2 py-6 text-center text-[11px] text-slate-400">
                        No runs yet
                      </p>
                    ) : (
                      history.slice(0, 12).map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => void loadRun(h.id)}
                          className="mb-1 w-full rounded-lg px-2.5 py-2 text-left last:mb-0 hover:bg-slate-50"
                        >
                          <span className="line-clamp-2 text-[11px] font-medium text-slate-800">
                            {h.prompt}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-slate-400">
                            {GENUI_STYLE_LABELS[h.style]} · {h.model.mode}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-3 px-4 py-3 lg:grid-cols-[300px_1fr] lg:px-5">
        {/* Compact control rail */}
        <aside className="space-y-2.5 lg:sticky lg:top-[3.5rem] lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pr-0.5">
          <section className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm">
            <label className="block space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Prompt
              </span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-[12px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                placeholder="Describe the page…"
              />
            </label>

            <div className="mt-2.5 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Style
              </span>
              <div className="flex flex-wrap gap-1">
                {GENUI_STYLES.map((s) => {
                  const active = style === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => applyStyle(s)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: STYLE_SWATCH[s] }}
                      />
                      {GENUI_STYLE_LABELS[s]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-2">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  Surfaces
                </span>
                <button
                  type="button"
                  onClick={() => setPalette(GENUI_PALETTE_DEFAULTS[style])}
                  className="text-[10px] font-medium text-slate-500 hover:text-slate-800"
                >
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ["background", "Background"],
                    ["card", "Card"],
                    ["table", "Table"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex flex-col items-center gap-1 rounded-md border border-slate-200 bg-white px-1 py-1.5"
                  >
                    <input
                      type="color"
                      value={palette[key]}
                      onChange={(e) =>
                        setPalette((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      className="h-7 w-full cursor-pointer rounded border-0 bg-transparent p-0"
                      title={label}
                    />
                    <span className="text-[9px] font-medium text-slate-500">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-2.5 space-y-1.5">
              <button
                type="button"
                disabled={!!busy || !prompt.trim()}
                onClick={() => void onGenerate(false)}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-[12px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {busy === "generate" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Generate with LLM
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={!!busy || !prompt.trim()}
                  onClick={() => void onGenerate(true)}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {busy === "fixture" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  Sample
                </button>
                <button
                  type="button"
                  disabled={!!busy || !prompt.trim()}
                  onClick={() => void onParseIntent()}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {busy === "intent" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  Intent
                </button>
              </div>
            </div>

            {error ? (
              <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
                {error}
              </p>
            ) : null}
            {note ? (
              <p className="mt-2 rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5 text-[11px] text-sky-900">
                {note}
              </p>
            ) : null}
            {run ? (
              <p className="mt-2 truncate text-[10px] text-slate-400">
                {run.model.mode} · {run.model.name}
                {revision ? ` · ${revision.id.slice(0, 12)}` : ""}
              </p>
            ) : null}
          </section>
        </aside>

        {/* Preview stage — first visual focus */}
        <section className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
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
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                    tab === id
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
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
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
                    viewport === id
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                  title={id}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden capitalize sm:inline">{id}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {tab === "preview" ? (
              previewSchema ? (
                <DeviceFrame viewport={viewport} className="p-3">
                  <UiSchemaRenderer schema={previewSchema} palette={palette} />
                </DeviceFrame>
              ) : (
                <div className="flex min-h-[520px] flex-col items-center justify-center gap-2 p-8 text-center">
                  <p className="text-sm font-semibold">Preview stage</p>
                  <p className="max-w-sm text-[12px] leading-relaxed text-slate-500">
                    Generate with Groq, or load a sample schema. The canvas on
                    the right is the hero — controls stay compact on the left.
                  </p>
                </div>
              )
            ) : null}

            {tab === "intent" ? (
              <pre className="max-h-[75vh] overflow-auto p-3 text-[11px] leading-relaxed text-slate-700">
                {intent
                  ? `${intentSource ? `// source: ${intentSource}\n` : ""}${JSON.stringify(intent, null, 2)}`
                  : "// Parse intent or generate to see DesignIntent JSON"}
              </pre>
            ) : null}

            {tab === "schema" ? (
              <pre className="max-h-[75vh] overflow-auto p-3 text-[11px] leading-relaxed text-slate-700">
                {schemaText || "// Schema appears after a successful generate"}
              </pre>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
