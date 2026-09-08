"use client";

import { FormEvent, useState, type ReactNode } from "react";

interface PasswordGateProps {
  /** Passcode viewers must type when no private token is present */
  expected?: string;
  /** When true (`?token=` client access token), skip the gate entirely */
  bypassWithToken?: boolean;
  clientName?: string;
  confidentialLabel?: string;
  children: ReactNode;
}

/** Executive light passcode card for end readers (no account required). */
export function PasswordGate({
  expected,
  bypassWithToken = false,
  clientName = "Client",
  confidentialLabel = "Strictly Confidential",
  children,
}: PasswordGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  if (bypassWithToken || !expected || unlocked) {
    return <>{children}</>;
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() === expected) {
      setUnlocked(true);
      setError("");
      return;
    }
    setError("Incorrect passcode.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
            <span aria-hidden>🔒</span>
            {confidentialLabel} — {clientName}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_rgba(15,23,42,0.06)]">
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
            GlassPortal
          </p>
          <h1 className="mt-2 text-center text-[22px] font-semibold tracking-tight text-slate-900">
            Protected Report
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-slate-500">
            Enter the access passcode shared by your advisor to continue.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block space-y-2">
              <span className="sr-only">Enter Access Passcode</span>
              <input
                type="password"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter Access Passcode"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-center text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
                autoFocus
                autoComplete="current-password"
              />
            </label>
            {error ? (
              <p className="text-center text-xs text-red-600">{error}</p>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Continue
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          No account required · Read-only executive access
        </p>
      </div>
    </div>
  );
}
