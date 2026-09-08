"use client";

import {
  ExternalLink,
  FileText,
  Globe,
  Link2,
  Paperclip,
  PlayCircle,
  PenTool,
} from "lucide-react";

interface ResourceCardProps {
  url: string;
  title?: string;
  caption?: string;
  kind?: "bookmark" | "embed" | "link_preview";
}

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "external link";
  }
}

function labelFor(url: string, caption?: string, title?: string) {
  if (caption?.trim()) return caption.trim();
  if (title?.trim()) return title.trim();
  const host = hostnameOf(url);
  if (/figma\.com/i.test(host)) return "Click to View Figma Prototype";
  if (/notion\.(so|site)/i.test(host)) return "Open Notion Page";
  if (/docs\.google\.com/i.test(host)) return "Open Google Doc";
  if (/drive\.google\.com/i.test(host)) return "Open Google Drive File";
  if (/youtube\.com|youtu\.be/i.test(host)) return "Watch on YouTube";
  if (/miro\.com/i.test(host)) return "Open Miro Board";
  if (/loom\.com/i.test(host)) return "Watch Loom Recording";
  if (/canva\.com/i.test(host)) return "Open Canva Design";
  return `Open ${host}`;
}

function IconFor({ url }: { url: string }) {
  const host = hostnameOf(url);
  const cls = "h-4 w-4";
  if (/figma\.com|canva\.com|miro\.com/i.test(host))
    return <PenTool className={cls} />;
  if (/youtube\.com|youtu\.be|loom\.com/i.test(host))
    return <PlayCircle className={cls} />;
  if (/docs\.google|drive\.google|pdf/i.test(host + url))
    return <FileText className={cls} />;
  if (/http/i.test(url)) return <Globe className={cls} />;
  return <Paperclip className={cls} />;
}

/** Stripe-style external resource card for Notion bookmark / embed / link_preview. */
export function ResourceCard({
  url,
  title,
  caption,
  kind = "bookmark",
}: ResourceCardProps) {
  if (!url) return null;
  const label = labelFor(url, caption, title);
  const host = hostnameOf(url);
  const kindLabel =
    kind === "embed"
      ? "Embedded resource"
      : kind === "link_preview"
        ? "Link preview"
        : "External resource";

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group my-6 flex items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex w-1.5 shrink-0 bg-slate-900 transition group-hover:bg-slate-800" />
      <div className="flex min-w-0 flex-1 items-center gap-4 px-4 py-4 md:px-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition group-hover:border-slate-300 group-hover:bg-white">
          <IconFor url={url} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {kindLabel}
          </p>
          <p className="mt-1 truncate text-[15px] font-semibold tracking-tight text-slate-900">
            📎 {label}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
            <Link2 className="h-3 w-3 shrink-0" />
            {host}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-slate-800">
          Open
          <ExternalLink className="h-3.5 w-3.5" />
        </span>
      </div>
    </a>
  );
}
