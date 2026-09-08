"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, LayoutDashboard } from "lucide-react";
import { getConsultantSession } from "@/components/studio/AuthModal";

/**
 * Post-purchase landing — buyer signs in with Gumroad email, then refreshes plan.
 */
export default function ThanksPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    const session = getConsultantSession();
    if (session) setEmail(session);
  }, []);

  const checkPlan = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const mail = email.trim().toLowerCase();
      if (!mail.includes("@")) {
        throw new Error("Enter the email used at checkout.");
      }
      const res = await fetch(`/api/plan?email=${encodeURIComponent(mail)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load plan");
      setPlan(json.plan);
      if (json.plan === "pro" || json.plan === "agency") {
        setMsg(
          `${json.entitlements?.name || json.plan} is active. Open Studio and publish without the watermark.`
        );
      } else {
        setMsg(
          "Still on Free. If you just paid, wait 1–2 minutes and try again — or email us your Gumroad receipt."
        );
      }
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Check failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">
              GlassPortal
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Thanks for your purchase
            </h1>
          </div>
        </div>

        <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
          <li>
            Sign in to Studio with the <strong>same email</strong> you used on
            Gumroad.
          </li>
          <li>Check your plan below (or click Refresh plan in Studio).</li>
          <li>Publish a portal — Pro removes the GlassPortal mark.</li>
        </ol>

        <form onSubmit={checkPlan} className="mt-6 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">
              Purchase email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@advisoryfirm.com"
              className="mech-input"
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? "Checking…" : "Check my plan"}
          </button>
        </form>

        {plan ? (
          <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">
            Current plan: {plan}
          </p>
        ) : null}
        {msg ? (
          <p className="mt-3 text-sm leading-relaxed text-emerald-700">{msg}</p>
        ) : null}
        {err ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {err}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <LayoutDashboard className="h-4 w-4" />
            Open Studio
          </Link>
          <a
            href="/GlassPortal-Pro-Quickstart.pdf"
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Download Quickstart PDF
          </a>
        </div>
      </div>
    </main>
  );
}
