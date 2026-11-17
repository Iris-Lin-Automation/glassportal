"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  History,
  Loader2,
  Monitor,
  PanelLeft,
  PanelLeftClose,
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
import { PreviewStage } from "@/components/genui/PreviewStage";
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
  const [panelOpen, setPanelOpen] = useState(true);
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
      // Collapse controls so preview fills the screen
      setPanelOpen(false);
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
      setPanelOpen(true);
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
      setPanelOpen(false);
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
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#0B0F17] text-slate-900">
      {/* Slim chrome */}
      <header className="flex h-9 shrink-0 items-center justify-between border-b border-white/10 bg-[#111827] px-2 text-slate-200">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" />
            Studio
          </Link>
          <span className="text-slate-600">/</span>
          <span className="truncate text-[11px] font-medium text-slate-200">
            Generative UI
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-slate-300 hover:bg-white/5"
            title={panelOpen ? "Hide prompt panel" : "Show prompt panel"}
          >
            {panelOpen ? (
              <PanelLeftClose className="h-3.5 w-3.5" />
            ) : (
              <PanelLeft className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {panelOpen ? "Hide" : "Prompt"}
            </span>
          </button>

          <div className="mx-0.5 hidden gap-0.5 rounded-md border border-white/10 p-0.5 sm:flex">
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
                    ? "bg-white text-slate-900"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
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
              className="relative flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-slate-300 hover:bg-white/5"
              aria-label="History"
            >
              <History className="h-3.5 w-3.5" />
              {history.length > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-cyan-400 px-1 text-[8px] font-bold text-slate-900">
                  {Math.min(history.length, 9)}
                </span>
              ) : null}
            </button>
            {historyOpen ? (
              <div className="absolute right-0 top-9 z-50 w-[280px] overflow-hidden rounded-xl border border-white/10 bg-[#1A2233] text-slate-200 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                  <p className="text-[11px] font-semibold">Recent runs</p>
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(false)}
                    className="rounded p-0.5 text-slate-400 hover:bg-white/5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                  {history.length === 0 ? (
                    <p className="py-6 text-center text-[11px] text-slate-500">
                      No runs yet
                    </p>
                  ) : (
                    history.slice(0, 12).map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => void loadRun(h.id)}
                        className="mb-0.5 w-full rounded-lg px-2.5 py-2 text-left hover:bg-white/5"
                      >
                        <span className="line-clamp-2 text-[11px] font-medium">
                          {h.prompt}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">
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

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* LEFT panel — slides away after generate */}
        <aside
          className={`absolute inset-y-0 left-0 z-20 flex w-[300px] flex-col border-r border-white/10 bg-[#111827] text-slate-100 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            panelOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Prompt
              </p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                className="w-full resize-none rounded-lg border border-white/10 bg-[#0B0F17] px-2.5 py-2 text-[12px] leading-relaxed text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20"
                placeholder="Describe the UI…"
              />
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Style
              </p>
              <StylePicker value={style} onChange={applyStyle} />
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Surfaces
              </p>
              <div className="rounded-lg border border-white/10 bg-[#0B0F17] px-2.5 py-2">
                <SurfaceColors
                  palette={palette}
                  onChange={setPalette}
                  onReset={() => setPalette(GENUI_PALETTE_DEFAULTS[style])}
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">
                {error}
              </p>
            ) : null}
            {note ? (
              <p className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-slate-400">
                {note}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 space-y-1.5 border-t border-white/10 p-3">
            <button
              type="button"
              disabled={!!busy || !prompt.trim()}
              onClick={() => void onGenerate(false)}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-400 text-[12px] font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
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
                className="inline-flex h-8 items-center justify-center rounded-lg border border-white/10 text-[11px] font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50"
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
                className="inline-flex h-8 items-center justify-center rounded-lg border border-white/10 text-[11px] font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50"
              >
                {busy === "intent" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                Intent
              </button>
            </div>
          </div>
        </aside>

        {/* Dimmer when panel open on small screens / focus preview when closed */}
        {panelOpen ? (
          <button
            type="button"
            aria-label="Close prompt panel"
            className="absolute inset-0 z-10 bg-black/40 transition-opacity duration-500 lg:bg-black/25"
            onClick={() => setPanelOpen(false)}
          />
        ) : null}

        {/* RIGHT — full stage */}
        <section className="relative z-0 flex min-w-0 flex-1 flex-col bg-[#0B0F17]">
          <div className="flex h-8 shrink-0 items-center justify-between border-b border-white/5 px-2">
            <div className="flex gap-0.5 rounded border border-white/10 p-0.5">
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
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                    tab === id
                      ? "bg-white text-slate-900"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">
              {previewSchema
                ? `${GENUI_STYLE_LABELS[style]} · fit to screen`
                : "Generating…"}
            </p>
          </div>

          <div className="relative min-h-0 flex-1">
            {tab === "preview" ? (
              busy && !previewSchema ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                  Rendering…
                </div>
              ) : previewSchema ? (
                <PreviewStage viewport={viewport} className="h-full w-full">
                  <UiSchemaRenderer
                    schema={previewSchema}
                    palette={palette}
                  />
                </PreviewStage>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Write a prompt, then Generate
                </div>
              )
            ) : null}

            {tab === "schema" ? (
              <pre className="m-0 h-full overflow-auto bg-[#0B0F17] p-4 text-[11px] leading-relaxed text-slate-300">
                {schemaText || "// Schema appears after generate"}
              </pre>
            ) : null}

            {tab === "intent" ? (
              <pre className="m-0 h-full overflow-auto bg-[#0B0F17] p-4 text-[11px] leading-relaxed text-slate-300">
                {intent
                  ? `${intentSource ? `// source: ${intentSource}\n` : ""}${JSON.stringify(intent, null, 2)}`
                  : "// Intent appears after parse / generate"}
              </pre>
            ) : null}

            {/* Floating reopen when collapsed */}
            {!panelOpen ? (
              <button
                type="button"
                onClick={() => setPanelOpen(true)}
                className="absolute bottom-4 left-4 z-30 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#1A2233]/95 px-3 py-2 text-[11px] font-semibold text-white shadow-xl backdrop-blur hover:bg-[#243049]"
              >
                <PanelLeft className="h-3.5 w-3.5" />
                Edit prompt
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
