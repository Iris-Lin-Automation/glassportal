"use client";

import type { CSSProperties } from "react";
import {
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
  type GenuiPalette,
  type GenuiStyle,
  type GenuiViewport,
} from "@/config/genui";
import type { UiNode, UiSchema } from "@/lib/genui/types";
import { cn } from "@/lib/utils";

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

function nightSkyBackground(style: GenuiStyle): CSSProperties | undefined {
  if (style !== "night-sky") return undefined;
  return {
    backgroundImage: `
      radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.55), transparent),
      radial-gradient(1px 1px at 70% 18%, rgba(255,255,255,0.4), transparent),
      radial-gradient(1.5px 1.5px at 40% 70%, rgba(165,243,252,0.55), transparent),
      radial-gradient(1px 1px at 85% 55%, rgba(255,255,255,0.35), transparent),
      radial-gradient(900px 420px at 15% -10%, rgba(56,189,248,0.18), transparent),
      radial-gradient(700px 380px at 90% 0%, rgba(99,102,241,0.16), transparent),
      linear-gradient(180deg, var(--genui-bg), #04060f 100%)
    `,
  };
}

function NodeView({
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
  const isNight = style === "night-sky";
  const isEditorial = style === "editorial";
  const isMobile = viewport === "mobile";
  const isTablet = viewport === "tablet";
  const isDesktop = viewport === "desktop";

  switch (node.type) {
    case "page":
      return (
        <div
          className={cn(
            "h-full min-h-full",
            // Desktop immersive: no outer padding — theme fills edge to edge
            isDesktop ? "p-0" : isMobile ? "p-0" : "p-0"
          )}
          style={{
            backgroundColor: "var(--genui-bg)",
            ...nightSkyBackground(style),
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
        isEditorial ? "font-serif tracking-tight" : "font-semibold tracking-tight",
        level === 1 && (isMobile ? "text-2xl" : "text-3xl"),
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
          className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition"
          style={
            variant === "primary"
              ? {
                  backgroundColor: "var(--genui-accent)",
                  color: isNight ? "#041016" : "#FFFFFF",
                }
              : variant === "secondary"
                ? {
                    backgroundColor: "var(--genui-card)",
                    color: "var(--genui-text)",
                    border: "1px solid var(--genui-border)",
                  }
                : {
                    backgroundColor: "transparent",
                    color: "var(--genui-muted)",
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
            isEditorial ? "rounded-none" : "rounded-xl",
            isNight && "shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_12px_40px_rgba(0,0,0,0.35)]"
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
    case "kpi-card":
      return (
        <div
          className={cn(
            "rounded-xl p-4",
            isNight && "shadow-[0_0_24px_rgba(34,211,238,0.06)]"
          )}
          style={{
            backgroundColor: "var(--genui-card)",
            border: "1px solid var(--genui-border)",
          }}
        >
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--genui-muted)" }}
          >
            {str(p.title, "Metric")}
          </p>
          <p
            className="mt-2 text-2xl font-bold tracking-tight"
            style={{ color: "var(--genui-text)" }}
          >
            {str(p.value, "—")}
          </p>
          {p.delta ? (
            <p
              className="mt-1 text-xs font-medium"
              style={{ color: isNight ? "#34D399" : "#059669" }}
            >
              {str(p.delta)}
            </p>
          ) : null}
        </div>
      );
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
              isNight
                ? "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&q=80"
                : "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80"
            )
          }
          alt={str(p.alt, "")}
          className="h-auto w-full rounded-xl object-cover"
          style={{
            aspectRatio: str(p.aspect, "16/9"),
            border: "1px solid var(--genui-border)",
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
          className="flex flex-wrap gap-3 text-sm font-medium"
          style={{ color: "var(--genui-muted)" }}
        >
          {items.map((item) => (
            <span key={item} style={{ color: "var(--genui-muted)" }}>
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
      const chartType = str(p.chartType, "line");
      return (
        <div
          className="rounded-xl p-4"
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
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={data}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="value" fill={accent} radius={4} />
                </BarChart>
              ) : (
                <LineChart data={data}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={accent}
                    strokeWidth={2}
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

/** Whitelist renderer — never evals model code. Palette splits bg / card / table. */
export function UiSchemaRenderer({
  schema,
  palette,
  viewport = "desktop",
}: {
  schema: UiSchema;
  /** Optional live overrides from Workspace color pickers */
  palette?: Partial<GenuiPalette>;
  /** Preview device density — drives layout, not browser CSS breakpoints */
  viewport?: GenuiViewport;
}) {
  const style = schema.meta.style;
  const base = GENUI_PALETTE_DEFAULTS[style] || GENUI_PALETTE_DEFAULTS["modern-saas"];
  const merged: GenuiPalette = { ...base, ...palette };
  return (
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
  );
}
