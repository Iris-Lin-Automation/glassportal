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
  type GenuiPalette,
  type GenuiStyle,
  type GenuiViewport,
} from "@/config/genui";
import { DeviceFrame } from "@/components/genui/DeviceFrame";
import { StylePicker } from "@/components/genui/StylePicker";
import { SurfaceColors } from "@/components/genui/SurfaceColors";
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
  const bootstrapped = useRef(false);

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

  useEffect(() => {
    void refreshHistory();
  }, []);

  // First paint: show a live preview immediately (sample schema)
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void onGenerate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    return { ...schema, meta: { ...schema.meta, style } };
  }, [schema, style]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#EEF1F4] text-slate-900">
      {/* Top bar */}
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Studio
          </Link>
          <div className="h-3 w-px bg-slate-200" />
          <p className="truncate text-[12px] font-semibold tracking-tight">
            Generative UI
            <span className="ml-1.5 font-normal text-slate-400">
              prompt → live preview
            </span>
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="mr-1 hidden gap-0.5 rounded-md border border-slate-200 p-0.5 sm:flex">
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
                className={`rounded px-1.5 py-1 ${
                  viewport === id
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
                title={id}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          <div className="relative" ref={historyRef}>
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="relative flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              aria-label="History"
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
              <div className="absolute right-0 top-9 z-40 w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                  <p className="text-[11px] font-semibold">Recent runs</p>
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(false)}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                  {history.length === 0 ? (
                    <p className="py-6 text-center text-[11px] text-slate-400">
                      No runs yet
                    </p>
                  ) : (
                    history.slice(0, 12).map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => void loadRun(h.id)}
                        className="mb-0.5 w-full rounded-lg px-2.5 py-2 text-left hover:bg-slate-50"
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
      </header>

      {/* Split: left prompt · right live canvas */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT — writer */}
        <aside className="flex w-full max-w-[320px] shrink-0 flex-col border-r border-slate-200/90 bg-white sm:w-[320px]">
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  Prompt
                </span>
                <button
                  type="button"
                  onClick={() => setTab(tab === "intent" ? "preview" : "intent")}
                  className="text-[10px] font-medium text-slate-400 hover:text-slate-700"
                >
                  {tab === "intent" ? "Hide intent" : "View intent"}
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={7}
                className="w-full resize-none rounded-lg border border-slate-200 bg-[#FAFBFC] px-2.5 py-2 text-[12px] leading-relaxed text-slate-800 outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                placeholder="Describe the UI you want…"
              />
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                Style
              </p>
              <StylePicker value={style} onChange={applyStyle} />
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                Surfaces
              </p>
              <div className="rounded-lg border border-slate-200 bg-[#FAFBFC] px-2.5 py-2">
                <SurfaceColors
                  palette={palette}
                  onChange={setPalette}
                  onReset={() => setPalette(GENUI_PALETTE_DEFAULTS[style])}
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
                {error}
              </p>
            ) : null}
            {note ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600">
                {note}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 space-y-1.5 border-t border-slate-200 p-3">
            <button
              type="button"
              disabled={!!busy || !prompt.trim()}
              onClick={() => void onGenerate(false)}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-[12px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy === "generate" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate
            </button>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                disabled={!!busy || !prompt.trim()}
                onClick={() => void onGenerate(true)}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
                className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {busy === "intent" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                Intent
              </button>
            </div>
            {run ? (
              <p className="truncate text-center text-[10px] text-slate-400">
                {run.model.mode} · {run.model.name}
              </p>
            ) : null}
          </div>
        </aside>

        {/* RIGHT — live preview canvas */}
        <section className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-3 backdrop-blur">
            <div className="flex gap-0.5 rounded-md border border-slate-200 p-0.5">
              {(
                [
                  ["preview", "Preview"],
                  ["schema", "Schema"],
                  ["intent", "Intent"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                    tab === id
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">
              {previewSchema
                ? `${GENUI_STYLE_LABELS[style]} · live`
                : "Waiting for schema"}
            </p>
          </div>

          <div
            className="min-h-0 flex-1 overflow-auto"
            style={{
              backgroundColor: "#E8ECF1",
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.06) 1px, transparent 0)",
              backgroundSize: "16px 16px",
            }}
          >
            {tab === "preview" ? (
              busy && !previewSchema ? (
                <div className="flex h-full min-h-[420px] items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rendering preview…
                </div>
              ) : previewSchema ? (
                <div className="flex min-h-full justify-center p-4 lg:p-6">
                  <DeviceFrame viewport={viewport} className="w-full">
                    <UiSchemaRenderer
                      schema={previewSchema}
                      palette={palette}
                    />
                  </DeviceFrame>
                </div>
              ) : (
                <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-2 p-8 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    Live preview
                  </p>
                  <p className="max-w-xs text-[12px] text-slate-500">
                    Write a prompt on the left, then Generate — the result
                    appears here.
                  </p>
                </div>
              )
            ) : null}

            {tab === "schema" ? (
              <pre className="m-0 h-full overflow-auto bg-white p-4 text-[11px] leading-relaxed text-slate-700">
                {schemaText || "// Schema appears after generate"}
              </pre>
            ) : null}

            {tab === "intent" ? (
              <pre className="m-0 h-full overflow-auto bg-white p-4 text-[11px] leading-relaxed text-slate-700">
                {intent
                  ? `${intentSource ? `// source: ${intentSource}\n` : ""}${JSON.stringify(intent, null, 2)}`
                  : "// Intent appears after parse / generate"}
              </pre>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
