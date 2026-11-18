"use client";

import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useRef, type ReactNode } from "react";

export const STUDIO_MOBILE_STEPS = [
  { id: 0, label: "Connect", short: "1" },
  { id: 1, label: "Brand", short: "2" },
  { id: 2, label: "Share", short: "3" },
  { id: 3, label: "Preview", short: "4" },
] as const;

export type StudioMobileStep = (typeof STUDIO_MOBILE_STEPS)[number]["id"];

interface StudioMobileWizardProps {
  step: StudioMobileStep;
  onStepChange: (step: StudioMobileStep) => void;
  /** When false, Next from Connect is disabled (unless Sample already loaded). */
  canAdvanceFromConnect: boolean;
  header: ReactNode;
  connect: ReactNode;
  brand: ReactNode;
  share: ReactNode;
  preview: ReactNode;
}

/**
 * Phone-only Studio shell: one job per screen + fixed Back/Next.
 * Desktop layout stays in page.tsx (lg+).
 */
export function StudioMobileWizard({
  step,
  onStepChange,
  canAdvanceFromConnect,
  header,
  connect,
  brand,
  share,
  preview,
}: StudioMobileWizardProps) {
  const touchX = useRef<number | null>(null);
  const panels = [connect, brand, share, preview];
  const maxStep = (STUDIO_MOBILE_STEPS.length - 1) as StudioMobileStep;

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(maxStep, next)) as StudioMobileStep;
    if (step === 0 && clamped > 0 && !canAdvanceFromConnect) return;
    onStepChange(clamped);
  };

  const nextDisabled = step === 0 && !canAdvanceFromConnect;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#F9FAFB] lg:hidden">
      <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#F9FAFB]/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
        <div className="px-4 pb-3 pt-4">{header}</div>
        <div className="flex items-center justify-between gap-2 px-4 pb-3">
          <div className="flex flex-1 items-center gap-1.5">
            {STUDIO_MOBILE_STEPS.map((s) => {
              const active = s.id === step;
              const done = s.id < step;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (s.id > 0 && !canAdvanceFromConnect && step === 0) return;
                    if (s.id > step && step === 0 && !canAdvanceFromConnect)
                      return;
                    onStepChange(s.id);
                  }}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1"
                  aria-current={active ? "step" : undefined}
                >
                  <span
                    className={`h-1 w-full rounded-full transition ${
                      active
                        ? "bg-slate-900"
                        : done
                          ? "bg-slate-400"
                          : "bg-slate-200"
                    }`}
                  />
                  <span
                    className={`truncate text-[10px] font-semibold tracking-wide ${
                      active ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className="relative flex-1 overflow-hidden"
        onTouchStart={(e) => {
          touchX.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          touchX.current = null;
          if (start == null) return;
          const end = e.changedTouches[0]?.clientX ?? start;
          const delta = end - start;
          if (Math.abs(delta) < 56) return;
          if (delta < 0) go(step + 1);
          else go(step - 1);
        }}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${step * 100}%)` }}
        >
          {panels.map((panel, idx) => (
            <div
              key={STUDIO_MOBILE_STEPS[idx].id}
              className="h-full w-full shrink-0 overflow-y-auto overscroll-y-contain px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-4"
              aria-hidden={step !== idx}
            >
              {panel}
            </div>
          ))}
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md"
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => go(step - 1)}
            disabled={step === 0}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition enabled:hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          {step < maxStep ? (
            <button
              type="button"
              onClick={() => go(step + 1)}
              disabled={nextDisabled}
              className="inline-flex h-11 flex-[1.4] items-center justify-center gap-1 rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
            >
              {step === 2 ? (
                <>
                  <Eye className="h-4 w-4" />
                  Preview
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStepChange(2)}
              className="inline-flex h-11 flex-[1.4] items-center justify-center gap-1 rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Back to Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
