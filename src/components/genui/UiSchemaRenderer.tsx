"use client";

import { createContext, useContext, type CSSProperties } from "react";
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  GENUI_PALETTE_DEFAULTS,
  isDarkGenuiStyle,
  type GenuiPalette,
  type GenuiStyle,
  type GenuiViewport,
} from "@/config/genui";
import type { UiNode, UiSchema } from "@/lib/genui/types";
import { cn } from "@/lib/utils";

export type GenuiAnnotateTarget = {
  nodeId: string;
  nodeType: string;
  label: string;
};

type AnnotateContextValue = {
  enabled: boolean;
  onPick: (target: GenuiAnnotateTarget) => void;
};

const GenuiAnnotateContext = createContext<AnnotateContextValue | null>(null);

function nodeLabel(node: UiNode) {
  const p = node.props || {};
  const text =
    (typeof p.text === "string" && p.text) ||
    (typeof p.title === "string" && p.title) ||
    (typeof p.label === "string" && p.label) ||
    "";
  return text ? `${node.type}: ${text.slice(0, 40)}` : node.type;
}

function gapClass(gap?: unknown) {
  if (gap === "sm") return "gap-2";
  if (gap === "lg") return "gap-8";
  return "gap-4";
}

function str(v: unknown, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

function numArr(v: unknown): number[] {
  if (!Array.isArray(v)) return [10, 16, 14, 20, 24, 22, 30];
  return v.map((x) => Number(x) || 0);
}

function paletteVars(palette: GenuiPalette): CSSProperties {
  return {
    ["--genui-bg" as string]: palette.background,
    ["--genui-card" as string]: palette.card,
    ["--genui-table" as string]: palette.table,
    ["--genui-text" as string]: palette.text,
    ["--genui-muted" as string]: palette.muted,
    ["--genui-accent" as string]: palette.accent,
    ["--genui-border" as string]: palette.border,
    color: palette.text,
  };
}

function styleAtmosphere(style: GenuiStyle): CSSProperties | undefined {
  if (style === "night-sky") {
    return {
      backgroundImage: `
      radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.45), transparent),
      radial-gradient(1px 1px at 70% 18%, rgba(255,255,255,0.35), transparent),
      radial-gradient(1.5px 1.5px at 40% 70%, rgba(34,211,161,0.45), transparent),
      radial-gradient(1px 1px at 85% 55%, rgba(255,255,255,0.28), transparent),
      radial-gradient(900px 420px at 15% -10%, rgba(34,211,161,0.16), transparent),
      radial-gradient(720px 400px at 92% 0%, rgba(124,58,237,0.28), transparent),
      linear-gradient(180deg, #05070D 0%, #070B14 100%)
    `,
    };
  }
  if (style === "obsidian") {
    return {
      backgroundImage: `
      radial-gradient(1200px 520px at 70% 10%, rgba(34,211,238,0.10), transparent 55%),
      radial-gradient(900px 480px at 10% 90%, rgba(124,58,237,0.12), transparent 50%),
      linear-gradient(180deg, #050505 0%, #0a0a0a 55%, #050505 100%)
    `,
    };
  }
  if (style === "fintech" || style === "modern-saas") {
    return {
      backgroundImage: `
      radial-gradient(900px 420px at 100% 0%, rgba(139,92,246,0.08), transparent 55%),
      radial-gradient(700px 360px at 0% 100%, rgba(99,102,241,0.05), transparent 50%),
      linear-gradient(180deg, var(--genui-bg), #FFFFFF 100%)
    `,
    };
  }
  return undefined;
}

function NodeBody({
  node,
  style,
  accent,
  viewport,
}: {
  node: UiNode;
  style: GenuiStyle;
  accent: string;
  viewport: GenuiViewport;
}) {
  const p = node.props || {};
  const isNight = isDarkGenuiStyle(style);
  const isObsidian = style === "obsidian";
  const isEditorial = style === "editorial" || isObsidian;
  const isFintech = style === "fintech" || style === "modern-saas";
  const isMobile = viewport === "mobile";
  const isTablet = viewport === "tablet";
  const isDesktop = viewport === "desktop";

  switch (node.type) {
    case "page": {
      const hasSidebar = (node.children || []).some(
        (c) => c.type === "sidebar-layout"
      );
      return (
        <div
          className={cn(
            "h-full min-h-full",
            // Dashboards fill edge-to-edge; landings keep breathing room
            hasSidebar ? "p-0" : isMobile ? "px-5 py-6" : "px-10 py-10"
          )}
          style={{
            backgroundColor: "var(--genui-bg)",
            ...styleAtmosphere(style),
          }}
        >
          {(node.children || []).map((c) => (
            <NodeView
              key={c.id}
              node={c}
              style={style}
              accent={accent}
              viewport={viewport}
            />
          ))}
        </div>
      );
    }
    case "stack":
      return (
        <div className={cn("flex flex-col", gapClass(p.gap))}>
          {(node.children || []).map((c) => (
            <NodeView
              key={c.id}
              node={c}
              style={style}
              accent={accent}
              viewport={viewport}
            />
          ))}
        </div>
      );
    case "row":
      return (
        <div className={cn("flex flex-wrap items-center", gapClass(p.gap))}>
          {(node.children || []).map((c) => (
            <NodeView
              key={c.id}
              node={c}
              style={style}
              accent={accent}
              viewport={viewport}
            />
          ))}
        </div>
      );
    case "grid": {
      const cols = Number(p.columns) || 3;
      const capped = Math.min(Math.max(cols, 1), 4);
      const effective = isMobile ? 1 : isTablet ? Math.min(capped, 2) : capped;
      return (
        <div
          className={cn("grid", gapClass(p.gap))}
          style={{
            gridTemplateColumns: `repeat(${effective}, minmax(0, 1fr))`,
          }}
        >
          {(node.children || []).map((c) => (
            <NodeView
              key={c.id}
              node={c}
              style={style}
              accent={accent}
              viewport={viewport}
            />
          ))}
        </div>
      );
    }
    case "sidebar-layout": {
      const [side, main] = node.children || [];
      // Use preview viewport density — NOT browser media queries
      const sideBySide = isDesktop || isTablet;
      return (
        <div
          className={cn(
            "grid h-full min-h-full",
            sideBySide
              ? isTablet
                ? "grid-cols-[180px_1fr]"
                : "grid-cols-[220px_1fr]"
              : "grid-cols-1"
          )}
        >
          <aside
            className={cn(
              "p-4",
              sideBySide ? "border-r" : "border-b"
            )}
            style={{
              backgroundColor: "var(--genui-card)",
              borderColor: "var(--genui-border)",
            }}
          >
            {side ? (
              <NodeView
                node={side}
                style={style}
                accent={accent}
                viewport={viewport}
              />
            ) : null}
          </aside>
          <main className={cn(isMobile ? "p-4" : "p-5")}>
            {main ? (
              <NodeView
                node={main}
                style={style}
                accent={accent}
                viewport={viewport}
              />
            ) : null}
          </main>
        </div>
      );
    }
    case "heading": {
      const level = Number(p.level) || 2;
      const text = str(p.text, "Heading");
      const cls = cn(
        isEditorial
          ? "font-serif tracking-tight"
          : "font-semibold tracking-tight",
        level === 1 &&
          (isObsidian
            ? isMobile
              ? "text-3xl leading-[1.1]"
              : "text-5xl leading-[1.05]"
            : isMobile
              ? "text-2xl"
              : "text-3xl"),
        level === 2 && (isMobile ? "text-lg" : "text-xl"),
        level >= 3 && "text-base"
      );
      const el =
        level === 1 ? (
          <h1 className={cls}>{text}</h1>
        ) : level === 2 ? (
          <h2 className={cls}>{text}</h2>
        ) : (
          <h3 className={cls}>{text}</h3>
        );
      return <div style={{ color: "var(--genui-text)" }}>{el}</div>;
    }
    case "text":
      return (
        <p
          className="text-[15px] leading-relaxed"
          style={{
            color: p.muted ? "var(--genui-muted)" : "var(--genui-text)",
          }}
        >
          {str(p.text)}
        </p>
      );
    case "button": {
      const variant = str(p.variant, "primary");
      return (
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold transition",
            isFintech || isObsidian ? "rounded-xl" : "rounded-lg"
          )}
          style={
            variant === "primary"
              ? {
                  backgroundColor: "var(--genui-accent)",
                  color: isNight ? "#041016" : "#FFFFFF",
                  boxShadow: isFintech
                    ? "0 8px 24px rgba(139,92,246,0.25)"
                    : isObsidian
                      ? "0 0 24px rgba(34,211,238,0.25)"
                      : undefined,
                }
              : variant === "secondary"
                ? {
                    backgroundColor: "var(--genui-card)",
                    color: "var(--genui-text)",
                    border: "1px solid var(--genui-border)",
                  }
                : {
                    backgroundColor: "transparent",
                    color: isObsidian ? "var(--genui-accent)" : "var(--genui-muted)",
                    textDecoration: isObsidian ? "underline" : undefined,
                    textUnderlineOffset: isObsidian ? "6px" : undefined,
                  }
          }
        >
          {str(p.label, "Button")}
        </button>
      );
    }
    case "card":
      return (
        <div
          className={cn(
            "p-4",
            style === "editorial" ? "rounded-none" : "rounded-2xl",
            isNight &&
              "shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_12px_40px_rgba(0,0,0,0.35)]",
            isFintech && "shadow-[0_8px_30px_rgba(15,23,42,0.04)]"
          )}
          style={{
            backgroundColor: "var(--genui-card)",
            border: "1px solid var(--genui-border)",
          }}
        >
          {(node.children || []).map((c) => (
            <NodeView
              key={c.id}
              node={c}
              style={style}
              accent={accent}
              viewport={viewport}
            />
          ))}
        </div>
      );
    case "kpi-card": {
      const deltaRaw = str(p.delta);
      const negative = /^\s*-/.test(deltaRaw);
      const deltaColor =
        str(p.deltaColor) ||
        (negative
          ? isNight
            ? "#FB7185"
            : "#DC2626"
          : isNight
            ? "#34D399"
            : "#059669");
      const accentColor = str(p.accentColor);
      return (
        <div
          className={cn(
            "rounded-2xl p-4",
            isNight && "shadow-[0_0_24px_rgba(34,211,238,0.06)]",
            isFintech && "shadow-[0_10px_30px_rgba(124,58,237,0.06)]"
          )}
          style={{
            backgroundColor: "var(--genui-card)",
            border: accentColor
              ? `1px solid ${accentColor}`
              : "1px solid var(--genui-border)",
            boxShadow: accentColor
              ? `0 0 0 1px ${accentColor}33`
              : undefined,
          }}
        >
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--genui-muted)" }}
          >
            {str(p.title, "Metric")}
          </p>
          <p
            className="mt-2 text-2xl font-bold tracking-tight tabular-nums"
            style={{ color: accentColor || "var(--genui-text)" }}
          >
            {str(p.value, "—")}
          </p>
          {p.delta ? (
            <p
              className="mt-1 text-xs font-semibold"
              style={{ color: deltaColor }}
            >
              {deltaRaw}
            </p>
          ) : null}
        </div>
      );
    }
    case "badge":
      return (
        <span
          className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{
            backgroundColor: "var(--genui-card)",
            border: "1px solid var(--genui-border)",
            color: "var(--genui-muted)",
          }}
        >
          {str(p.text, "Badge")}
        </span>
      );
    case "input":
      return (
        <label className="block space-y-1.5">
          <span
            className="text-xs font-medium"
            style={{ color: "var(--genui-muted)" }}
          >
            {str(p.label, "Field")}
          </span>
          <input
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: "var(--genui-card)",
              border: "1px solid var(--genui-border)",
              color: "var(--genui-text)",
            }}
            placeholder={str(p.placeholder, "")}
            readOnly
          />
        </label>
      );
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={
            str(
              p.src,
              isObsidian
                ? "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80"
                : isNight
                  ? "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&q=80"
                  : "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80"
            )
          }
          alt={str(p.alt, "")}
          className={cn(
            "h-auto w-full object-cover",
            isObsidian ? "rounded-none" : "rounded-2xl"
          )}
          style={{
            aspectRatio: str(p.aspect, isObsidian ? "21/9" : "16/9"),
            border: isObsidian ? "none" : "1px solid var(--genui-border)",
            boxShadow: isObsidian
              ? "0 30px 80px rgba(0,0,0,0.45)"
              : undefined,
          }}
        />
      );
    case "divider":
      return (
        <hr
          className="border-0 border-t"
          style={{ borderColor: "var(--genui-border)" }}
        />
      );
    case "spacer":
      return <div className="h-6" />;
    case "nav": {
      const items = Array.isArray(p.items)
        ? p.items.map(String)
        : ["Home", "Product"];
      return (
        <nav
          className={cn(
            "flex flex-wrap text-sm font-medium",
            isFintech ? "flex-col gap-1" : "gap-3"
          )}
          style={{ color: "var(--genui-muted)" }}
        >
          {items.map((item, idx) => (
            <span
              key={item}
              className={cn(
                isFintech && "rounded-xl px-3 py-2",
                idx === 0 && isFintech && "font-semibold text-white"
              )}
              style={{
                color:
                  idx === 0
                    ? isFintech
                      ? "#FFFFFF"
                      : "var(--genui-accent)"
                    : "var(--genui-muted)",
                backgroundColor:
                  idx === 0 && isFintech ? "var(--genui-accent)" : undefined,
              }}
            >
              {item}
            </span>
          ))}
        </nav>
      );
    }
    case "list": {
      const items = Array.isArray(p.items)
        ? p.items.map(String)
        : ["Item one", "Item two"];
      return (
        <ul
          className="list-disc space-y-1 pl-5 text-sm"
          style={{ color: "var(--genui-text)" }}
        >
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    }
    case "chart": {
      const points = numArr(p.points);
      const data = points.map((v, i) => ({ name: `W${i + 1}`, value: v }));
      const chartType = str(p.chartType, isFintech ? "area" : "line");
      const stroke = str(p.accentColor) || accent;
      const gradId = `genui-fill-${node.id}`;
      return (
        <div
          className={cn(
            "rounded-2xl p-4",
            isFintech && "shadow-[0_10px_30px_rgba(124,58,237,0.06)]"
          )}
          style={{
            backgroundColor: "var(--genui-card)",
            border: "1px solid var(--genui-border)",
          }}
        >
          <p
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--genui-text)" }}
          >
            {str(p.title, "Chart")}
          </p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={data}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="value" fill={stroke} radius={6} />
                </BarChart>
              ) : chartType === "area" ? (
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={stroke}
                    strokeWidth={2.5}
                    fill={`url(#${gradId})`}
                  />
                </AreaChart>
              ) : (
                <LineChart data={data}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={stroke}
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      );
    }
    case "table": {
      const columns = Array.isArray(p.columns)
        ? p.columns.map(String)
        : ["Col A", "Col B"];
      const rows = Array.isArray(p.rows)
        ? (p.rows as unknown[]).map((r) =>
            Array.isArray(r) ? r.map(String) : []
          )
        : [];
      return (
        <div
          className="overflow-hidden rounded-xl"
          style={{
            backgroundColor: "var(--genui-table)",
            border: "1px solid var(--genui-border)",
          }}
        >
          <div
            className="border-b px-4 py-3 text-sm font-semibold"
            style={{
              borderColor: "var(--genui-border)",
              color: "var(--genui-text)",
            }}
          >
            {str(p.title, "Table")}
          </div>
          <div className="portal-table-scroll w-full overflow-x-auto">
            <table className="w-max min-w-full text-left text-sm">
              <thead>
                <tr
                  style={{
                    backgroundColor: isNight
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(15,23,42,0.04)",
                  }}
                >
                  {columns.map((c) => (
                    <th
                      key={c}
                      className="whitespace-nowrap px-4 py-2.5 font-semibold"
                      style={{ color: "var(--genui-muted)" }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-t"
                    style={{ borderColor: "var(--genui-border)" }}
                  >
                    {columns.map((_, j) => (
                      <td
                        key={`${i}-${j}`}
                        className="whitespace-nowrap px-4 py-2.5"
                        style={{ color: "var(--genui-text)" }}
                      >
                        {row[j] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    default:
      return (
        <div className="rounded-lg border border-dashed border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Unsupported node type (skipped): {String((node as UiNode).type)}
        </div>
      );
  }
}

function NodeView(props: {
  node: UiNode;
  style: GenuiStyle;
  accent: string;
  viewport: GenuiViewport;
}) {
  const annotate = useContext(GenuiAnnotateContext);
  const label = nodeLabel(props.node);
  const enabled = Boolean(annotate?.enabled);

  return (
    <div
      data-genui-id={props.node.id}
      data-genui-type={props.node.type}
      data-genui-label={label}
      className={cn(
        enabled
          ? "relative cursor-crosshair rounded-sm outline outline-1 outline-transparent transition hover:outline-cyan-400/90 hover:outline-offset-1"
          : "contents"
      )}
      onClick={
        enabled
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              annotate?.onPick({
                nodeId: props.node.id,
                nodeType: props.node.type,
                label,
              });
            }
          : undefined
      }
    >
      <NodeBody {...props} />
    </div>
  );
}

/** Whitelist renderer — never evals model code. Palette splits bg / card / table. */
export function UiSchemaRenderer({
  schema,
  palette,
  viewport = "desktop",
  annotateEnabled = false,
  onAnnotatePick,
}: {
  schema: UiSchema;
  /** Optional live overrides from Workspace color pickers */
  palette?: Partial<GenuiPalette>;
  /** Preview device density — drives layout, not browser CSS breakpoints */
  viewport?: GenuiViewport;
  /** Human-in-the-loop: click blocks to pin feedback */
  annotateEnabled?: boolean;
  onAnnotatePick?: (target: GenuiAnnotateTarget) => void;
}) {
  const style = schema.meta.style;
  const base = GENUI_PALETTE_DEFAULTS[style] || GENUI_PALETTE_DEFAULTS["modern-saas"];
  const merged: GenuiPalette = { ...base, ...palette };
  const annotateValue: AnnotateContextValue | null =
    annotateEnabled && onAnnotatePick
      ? { enabled: true, onPick: onAnnotatePick }
      : null;

  return (
    <GenuiAnnotateContext.Provider value={annotateValue}>
      <div
        className="flex min-h-full w-full flex-1 flex-col"
        style={{
          ...paletteVars(merged),
          backgroundColor: merged.background,
        }}
      >
        <div className="flex min-h-full w-full flex-1 flex-col [&>*]:min-h-full [&>*]:flex-1">
          <NodeView
            node={schema.root}
            style={style}
            accent={merged.accent}
            viewport={viewport}
          />
        </div>
      </div>
    </GenuiAnnotateContext.Provider>
  );
}
