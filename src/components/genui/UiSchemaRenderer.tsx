"use client";

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
import type { GenuiStyle } from "@/config/genui";
import type { UiNode, UiSchema } from "@/lib/genui/types";
import { cn } from "@/lib/utils";

function themeShell(style: GenuiStyle) {
  if (style === "editorial") {
    return {
      page: "bg-[#FAF7F2] text-stone-900",
      card: "rounded-none border border-stone-200 bg-white",
      accent: "bg-stone-900 text-white",
      muted: "text-stone-500",
      heading: "font-serif tracking-tight",
      kpi: "border-stone-200",
    };
  }
  if (style === "minimal") {
    return {
      page: "bg-white text-slate-900",
      card: "rounded-xl border border-slate-200/80 bg-white",
      accent: "bg-slate-900 text-white",
      muted: "text-slate-500",
      heading: "font-semibold tracking-tight",
      kpi: "border-slate-200",
    };
  }
  return {
    page: "bg-slate-50 text-slate-900",
    card: "rounded-xl border border-slate-200 bg-white shadow-sm",
    accent: "bg-indigo-600 text-white",
    muted: "text-slate-500",
    heading: "font-semibold tracking-tight",
    kpi: "border-slate-200",
  };
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

function NodeView({
  node,
  style,
}: {
  node: UiNode;
  style: GenuiStyle;
}) {
  const t = themeShell(style);
  const p = node.props || {};

  switch (node.type) {
    case "page":
      return (
        <div className={cn("min-h-full p-5 sm:p-8", t.page)}>
          {(node.children || []).map((c) => (
            <NodeView key={c.id} node={c} style={style} />
          ))}
        </div>
      );
    case "stack":
      return (
        <div className={cn("flex flex-col", gapClass(p.gap))}>
          {(node.children || []).map((c) => (
            <NodeView key={c.id} node={c} style={style} />
          ))}
        </div>
      );
    case "row":
      return (
        <div className={cn("flex flex-wrap items-center", gapClass(p.gap))}>
          {(node.children || []).map((c) => (
            <NodeView key={c.id} node={c} style={style} />
          ))}
        </div>
      );
    case "grid": {
      const cols = Number(p.columns) || 3;
      return (
        <div
          className={cn("grid", gapClass(p.gap))}
          style={{
            gridTemplateColumns: `repeat(${Math.min(
              Math.max(cols, 1),
              4
            )}, minmax(0, 1fr))`,
          }}
        >
          {(node.children || []).map((c) => (
            <NodeView key={c.id} node={c} style={style} />
          ))}
        </div>
      );
    }
    case "sidebar-layout": {
      const [side, main] = node.children || [];
      return (
        <div className="grid min-h-[480px] grid-cols-1 md:grid-cols-[220px_1fr]">
          <aside className="border-b border-slate-200 bg-white p-4 md:border-b-0 md:border-r">
            {side ? <NodeView node={side} style={style} /> : null}
          </aside>
          <main className="p-4 sm:p-6">
            {main ? <NodeView node={main} style={style} /> : null}
          </main>
        </div>
      );
    }
    case "heading": {
      const level = Number(p.level) || 2;
      const text = str(p.text, "Heading");
      const cls = cn(t.heading, level === 1 && "text-3xl sm:text-4xl", level === 2 && "text-xl", level >= 3 && "text-base");
      if (level === 1) return <h1 className={cls}>{text}</h1>;
      if (level === 2) return <h2 className={cls}>{text}</h2>;
      return <h3 className={cls}>{text}</h3>;
    }
    case "text":
      return (
        <p
          className={cn(
            "text-[15px] leading-relaxed",
            p.muted ? t.muted : "text-slate-800"
          )}
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
            "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition",
            variant === "primary" && t.accent,
            variant === "secondary" &&
              "border border-slate-200 bg-white text-slate-800",
            variant === "ghost" && "text-slate-600 hover:bg-slate-100"
          )}
        >
          {str(p.label, "Button")}
        </button>
      );
    }
    case "card":
      return (
        <div className={cn("p-4", t.card)}>
          {(node.children || []).map((c) => (
            <NodeView key={c.id} node={c} style={style} />
          ))}
        </div>
      );
    case "kpi-card":
      return (
        <div className={cn("p-4", t.card, t.kpi)}>
          <p className={cn("text-xs font-medium uppercase tracking-wide", t.muted)}>
            {str(p.title, "Metric")}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight">
            {str(p.value, "—")}
          </p>
          {p.delta ? (
            <p className="mt-1 text-xs font-medium text-emerald-600">
              {str(p.delta)}
            </p>
          ) : null}
        </div>
      );
    case "badge":
      return (
        <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
          {str(p.text, "Badge")}
        </span>
      );
    case "input":
      return (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-600">
            {str(p.label, "Field")}
          </span>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
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
              "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80"
            )
          }
          alt={str(p.alt, "")}
          className="h-auto w-full rounded-xl object-cover"
          style={{ aspectRatio: str(p.aspect, "16/9") }}
        />
      );
    case "divider":
      return <hr className="border-0 border-t border-slate-200" />;
    case "spacer":
      return <div className="h-6" />;
    case "nav": {
      const items = Array.isArray(p.items)
        ? p.items.map(String)
        : ["Home", "Product"];
      return (
        <nav className="flex flex-wrap gap-3 text-sm font-medium text-slate-600">
          {items.map((item) => (
            <span key={item} className="hover:text-slate-900">
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
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
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
        <div className={cn("p-4", t.card)}>
          <p className="mb-3 text-sm font-semibold">
            {str(p.title, "Chart")}
          </p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={data}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4f46e5" radius={4} />
                </BarChart>
              ) : (
                <LineChart data={data}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#4f46e5"
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
        <div className={cn("overflow-hidden", t.card)}>
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">
            {str(p.title, "Table")}
          </div>
          <div className="portal-table-scroll w-full overflow-x-auto">
            <table className="w-max min-w-full text-left text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c}
                      className="whitespace-nowrap px-4 py-2.5 font-semibold text-slate-600"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    {columns.map((_, j) => (
                      <td
                        key={`${i}-${j}`}
                        className="whitespace-nowrap px-4 py-2.5 text-slate-700"
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
        <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Unsupported node type (skipped): {String((node as UiNode).type)}
        </div>
      );
  }
}

/** Whitelist renderer — never evals model code. */
export function UiSchemaRenderer({ schema }: { schema: UiSchema }) {
  return <NodeView node={schema.root} style={schema.meta.style} />;
}
