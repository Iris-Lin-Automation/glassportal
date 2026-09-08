"use client";

import {
  CheckCircle2,
  ChevronRight,
  FileDown,
  Link2,
  MoreHorizontal,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { exportNodeAsPdf } from "@/lib/export-pdf";
import { WATERMARK_LABEL_PDF } from "@/config/plans";

interface ExportToolbarProps {
  targetId?: string;
  shareUrl?: string;
  brandColor?: string;
  /** Starter: stamp GlassPortal line on every PDF page */
  showWatermark?: boolean;
  onConfirm?: () => void | Promise<void>;
  onUnconfirm?: () => void | Promise<void>;
  onExport?: () => void;
  onCopyLink?: () => void;
  className?: string;
}

function brandFg(hex: string): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return "#FFFFFF";
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
  return lum > 0.62 ? "#0F172A" : "#FFFFFF";
}

const COLLAPSE_KEY = "glassportal_actions_collapsed";

/** Right-side floating action dock — expandable / hideable. */
export function ExportToolbar({
  targetId = "portal-export-root",
  shareUrl,
  brandColor = "#0F172A",
  showWatermark = false,
  onConfirm,
  onUnconfirm,
  onExport,
  onCopyLink,
  className,
}: ExportToolbarProps) {
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setCollapsed(sessionStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const setCollapsedPersist = (next: boolean) => {
    setCollapsed(next);
    try {
      sessionStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2800);
  };

  const copyLink = async () => {
    const url = shareUrl
      ? shareUrl.startsWith("http")
        ? shareUrl
        : `${window.location.origin}${shareUrl}`
      : window.location.href;
    await navigator.clipboard.writeText(url);
    onCopyLink?.();
    flash("Share link copied");
  };

  const exportHd = async () => {
    const node = document.getElementById(targetId);
    if (!node) {
      flash("Export target not found");
      return;
    }
    try {
      setBusy(true);
      await exportNodeAsPdf(node, "glassportal-delivery.pdf", {
        watermarkText: showWatermark ? WATERMARK_LABEL_PDF : undefined,
      });
      onExport?.();
      flash("PDF downloaded");
    } catch (e) {
      console.error("[GlassPortal] PDF export failed", e);
      const detail =
        e instanceof Error && e.message
          ? e.message.slice(0, 80)
          : "Unknown error";
      flash(`PDF export failed · ${detail}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleConfirm = async () => {
    try {
      setSyncing(true);
      if (confirmed) {
        await onUnconfirm?.();
        setConfirmed(false);
        flash("Confirmation withdrawn");
      } else {
        await onConfirm?.();
        setConfirmed(true);
        flash("Proposal confirmed");
      }
    } catch {
      if (confirmed) {
        setConfirmed(false);
        flash("Withdrawn locally");
      } else {
        setConfirmed(true);
        flash("Saved locally");
      }
    } finally {
      setSyncing(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed bottom-6 right-4 z-[210] flex flex-col items-end gap-2 sm:bottom-8 sm:right-6",
        className
      )}
      data-export-ignore="1"
    >
      {toast ? (
        <p className="max-w-[260px] rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur">
          {toast}
        </p>
      ) : null}

      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsedPersist(false)}
          className="group flex h-12 w-12 items-center justify-center rounded-full border bg-white shadow-[0_8px_28px_rgba(15,23,42,0.12)] transition hover:scale-[1.03]"
          style={{ borderColor: `${brandColor}40` }}
          aria-label="Show actions"
          title="Show actions"
        >
          <MoreHorizontal
            className="h-5 w-5 transition group-hover:scale-110"
            style={{ color: brandColor }}
          />
        </button>
      ) : (
        <div
          className="w-[220px] overflow-hidden rounded-2xl border bg-white/95 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-md"
          style={{ borderColor: `${brandColor}28` }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Actions
            </p>
            <button
              type="button"
              onClick={() => setCollapsedPersist(true)}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Hide actions"
              title="Hide"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-1 p-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void exportHd()}
              className="inline-flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${brandColor}14`,
                  color: brandColor,
                }}
              >
                <FileDown className="h-4 w-4" />
              </span>
              {busy ? "Exporting…" : "Export HD PDF"}
            </button>

            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${brandColor}14`,
                  color: brandColor,
                }}
              >
                <Link2 className="h-4 w-4" />
              </span>
              Copy Share Link
            </button>

            <button
              type="button"
              disabled={syncing}
              onClick={() => void toggleConfirm()}
              className="mt-0.5 inline-flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition disabled:opacity-60"
              style={
                confirmed
                  ? {
                      backgroundColor: `${brandColor}14`,
                      color: brandColor,
                    }
                  : {
                      backgroundColor: brandColor,
                      color: brandFg(brandColor),
                    }
              }
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                {confirmed ? (
                  <RotateCcw className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0 leading-snug">
                {syncing
                  ? "Syncing…"
                  : confirmed
                    ? "Confirmed · Cancel"
                    : "Confirm / Sign"}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCollapsedPersist(true)}
            className="flex w-full items-center justify-center gap-1 border-t border-slate-100 px-3 py-2 text-[10px] font-medium text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
          >
            Hide
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
