"use client";

import Link from "next/link";
import { WATERMARK_HREF, WATERMARK_LABEL } from "@/config/plans";

/**
 * Starter PLG footer — centered under portal content (also captured in PDF).
 * Hidden for Pro / Agency white-label.
 */
export function PoweredByWatermark({
  show,
  /** When true, render inside #portal-export-root flow (PDF-safe). */
  inline = false,
}: {
  show: boolean;
  inline?: boolean;
}) {
  if (!show) return null;

  const body = (
    <Link
      href={WATERMARK_HREF}
      data-portal-watermark="1"
      className="inline-flex items-center justify-center text-center text-[11px] font-medium tracking-tight text-slate-400 transition hover:text-slate-700"
    >
      {WATERMARK_LABEL}
    </Link>
  );

  if (inline) {
    return (
      <div className="mt-10 border-t border-slate-100 px-6 pb-8 pt-6 text-center">
        {body}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pb-10 pt-2 text-center">{body}</div>
  );
}
