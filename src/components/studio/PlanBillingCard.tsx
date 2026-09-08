"use client";

import { useEffect, useState } from "react";
import { Check, Crown, Sparkles } from "lucide-react";
import { PLAN_ORDER, getPlan, type PlanId } from "@/config/plans";
import { GlassCard } from "@/components/ui/GlassCard";

export interface PlanSnapshot {
  plan: PlanId;
  portalCount: number;
  portalLimit: number;
  customDomain?: string | null;
}

interface PlanBillingCardProps {
  email: string | null;
  onPlanChange?: (plan: PlanId) => void;
  pageId?: string | null;
}

export function PlanBillingCard({
  email,
  onPlanChange,
  pageId,
}: PlanBillingCardProps) {
  const [snap, setSnap] = useState<PlanSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const lemonPro = process.env.NEXT_PUBLIC_LEMON_CHECKOUT_PRO || "";
  const lemonAgency = process.env.NEXT_PUBLIC_LEMON_CHECKOUT_AGENCY || "";
  const gumroadPro = process.env.NEXT_PUBLIC_GUMROAD_CHECKOUT_PRO || "";
  const gumroadAgency = process.env.NEXT_PUBLIC_GUMROAD_CHECKOUT_AGENCY || "";

  const refresh = async (mail: string) => {
    const res = await fetch(
      `/api/plan?email=${encodeURIComponent(mail)}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to load plan");
    setSnap({
      plan: json.plan,
      portalCount: json.portalCount,
      portalLimit: json.portalLimit,
      customDomain: json.customDomain,
    });
    if (json.customDomain) setDomainInput(json.customDomain);
    onPlanChange?.(json.plan);
  };

  useEffect(() => {
    if (!email) {
      setSnap(null);
      return;
    }
    void refresh(email).catch((e) =>
      setErr(e instanceof Error ? e.message : "Plan load failed")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const checkoutUrl = (plan: PlanId) => {
    if (plan === "pro") return gumroadPro || lemonPro;
    if (plan === "agency") return gumroadAgency || lemonAgency;
    return "";
  };

  const upgrade = async (plan: PlanId) => {
    if (!email) return;
    setErr("");
    setMsg("");

    if (plan !== "starter") {
      const url = checkoutUrl(plan);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        setMsg(
          `Checkout opened. Pay with this same email (${email}), then click Refresh plan.`
        );
        return;
      }
    }

    setBusy(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-plan", email, plan }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upgrade failed");
      await refresh(email);
      setMsg(
        plan === "starter"
          ? "You’re on Free — client links stay available; exports keep the GlassPortal mark."
          : `${getPlan(plan).name} is active. Watermark removed from portals & PDFs.`
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upgrade failed");
    } finally {
      setBusy(false);
    }
  };

  const bindDomain = async () => {
    if (!email || !pageId || !domainInput.trim()) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bind-domain",
          email,
          pageId,
          hostname: domainInput.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Domain bind failed");
      await refresh(email);
      setMsg(
        `Bound ${json.binding.hostname}. Add a CNAME to your host, then attach the domain for HTTPS.`
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Domain bind failed");
    } finally {
      setBusy(false);
    }
  };

  if (!email) {
    return (
      <GlassCard hover={false} className="space-y-2 p-5">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">Plan</h2>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          Preview anytime. Sign in to publish links. Free includes the
          GlassPortal mark — Pro removes it after Gumroad checkout with this
          email.
        </p>
        {process.env.NEXT_PUBLIC_GUMROAD_CHECKOUT_PRO ? (
          <a
            href={process.env.NEXT_PUBLIC_GUMROAD_CHECKOUT_PRO}
            target="_blank"
            rel="noreferrer"
            className="inline-flex text-xs font-semibold text-slate-800 underline-offset-2 hover:underline"
          >
            Get Pro on Gumroad →
          </a>
        ) : null}
      </GlassCard>
    );
  }

  const current = snap ? getPlan(snap.plan) : getPlan("starter");

  return (
    <GlassCard hover={false} className="space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">Plan</h2>
        </div>
        {snap ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
            {snap.portalCount}/{snap.portalLimit} portals
          </span>
        ) : null}
      </div>

      <p className="text-xs text-slate-500">
        <span className="font-semibold text-slate-800">{current.name}</span>
        {current.priceMonthly > 0
          ? ` · $${current.priceMonthly}/mo`
          : " · Free"}
        {current.watermark
          ? " · Mark on PDFs & portals"
          : " · Clean white-label"}
      </p>

      <p className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
        Clients open your shared link for free. You pay to publish more portals
        and remove the GlassPortal mark. Use the same email at checkout as this
        Studio login ({email}).
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!email) return;
          setBusy(true);
          void refresh(email)
            .then(() => setMsg("Plan refreshed."))
            .catch((e) =>
              setErr(e instanceof Error ? e.message : "Refresh failed")
            )
            .finally(() => setBusy(false));
        }}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
      >
        Refresh plan after purchase
      </button>

      <div className="space-y-2">
        {PLAN_ORDER.map((id) => {
          const p = getPlan(id);
          const active = snap?.plan === id;
          return (
            <button
              key={id}
              type="button"
              disabled={busy || active}
              onClick={() => void upgrade(id)}
              className={`flex w-full items-start justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition ${
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  {id === "agency" ? (
                    <Sparkles className="h-3.5 w-3.5" />
                  ) : null}
                  {p.name}
                  <span className={active ? "opacity-80" : "text-slate-400"}>
                    {p.priceMonthly === 0 ? "$0" : `$${p.priceMonthly}/mo`}
                  </span>
                </span>
                <span
                  className={`mt-0.5 block text-[10px] leading-relaxed ${
                    active ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {p.blurb}
                </span>
              </span>
              {active ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
            </button>
          );
        })}
      </div>

      {snap?.plan === "agency" ? (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-600">
              Custom domain
            </span>
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="portal.youragency.com"
              className="mech-input"
            />
          </label>
          <button
            type="button"
            disabled={busy || !pageId || !domainInput.trim()}
            onClick={() => void bindDomain()}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            Bind domain to this portal
          </button>
        </div>
      ) : null}

      {msg ? (
        <p className="text-[11px] font-medium text-emerald-700">{msg}</p>
      ) : null}
      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {err}
        </p>
      ) : null}
    </GlassCard>
  );
}
