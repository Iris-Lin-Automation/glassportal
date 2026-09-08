"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Hash,
  Mail,
  MessageCircle,
  Share2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ShareChannel = "wechat" | "slack" | "email" | "whatsapp";

export interface VipShareConfig {
  cardTitle: string;
  cardSubtitle: string;
  confidentialLabel: string;
  domainHint: string;
}

interface VipShareCardProps {
  config: VipShareConfig;
  onChange: (next: Partial<VipShareConfig>) => void;
  clientName: string;
  logoDataUrl?: string;
  /** Fallback hero / thumbnail when logo is empty (e.g. sample cover) */
  coverUrl?: string;
  sharePath?: string;
}

const CHANNELS: {
  id: ShareChannel;
  label: string;
  hint: string;
}[] = [
  { id: "wechat", label: "WeChat", hint: "Link card in Moments / chat" },
  { id: "slack", label: "Slack", hint: "Unfurl preview in channels" },
  { id: "email", label: "Email", hint: "Rich link tile in inbox" },
  { id: "whatsapp", label: "WhatsApp", hint: "OG card before open" },
];

/** Refined mark when client logo is not uploaded yet. */
function LogoPlaceholder({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600",
        className
      )}
      aria-hidden
    >
      <Building2 className={cn("text-white/90", iconClassName || "h-6 w-6")} />
    </div>
  );
}

function ChannelPreview({
  channel,
  title,
  subtitle,
  logo,
  cover,
  domain,
  confidential,
}: {
  channel: ShareChannel;
  title: string;
  subtitle: string;
  logo?: string;
  cover?: string;
  domain: string;
  confidential: string;
}) {
  const thumb = logo || cover;

  if (channel === "wechat") {
    return (
      <div className="rounded-xl border border-[#E5E5E5] bg-[#EDEDED] p-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          WeChat · Link card
        </p>
        <div className="overflow-hidden rounded-lg border border-[#D9D9D9] bg-white shadow-sm">
          <div className="flex gap-3 p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-slate-100">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="h-full w-full object-cover" />
              ) : (
                <LogoPlaceholder />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#191919]">
                {title}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#888]">
                {subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#F0F0F0] px-3 py-1.5">
            <span className="text-[10px] text-[#B2B2B2]">{domain}</span>
            <span className="rounded bg-[#FFF3E8] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#C2410C]">
              {confidential}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (channel === "slack") {
    return (
      <div className="rounded-xl border border-[#E8E8E8] bg-[#F8F8F8] p-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Slack · Unfurl
        </p>
        <div className="overflow-hidden rounded-lg border border-[#DDDDDD] bg-white">
          <div className="flex">
            <div className="w-1 shrink-0 bg-[#4A154B]" />
            <div className="min-w-0 flex-1 p-3">
              <p className="text-[12px] font-bold text-[#1D1C1D]">{domain}</p>
              <p className="mt-1 text-[14px] font-semibold leading-snug text-[#1264A3]">
                {title}
              </p>
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#616061]">
                {subtitle}
              </p>
              <div className="mt-2 flex items-center gap-2">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt=""
                    className="h-8 w-8 rounded object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 overflow-hidden rounded">
                    <LogoPlaceholder iconClassName="h-4 w-4" />
                  </div>
                )}
                <span className="rounded bg-[#F4EDEA] px-1.5 py-0.5 text-[10px] font-medium text-[#3F0E40]">
                  {confidential}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (channel === "email") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Email · Rich preview
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="relative h-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-50"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <Building2 className="h-10 w-10 text-white" />
              </div>
            )}
            <div className="absolute inset-0 flex items-end p-3">
              <span className="rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-900">
                {confidential}
              </span>
            </div>
          </div>
          <div className="space-y-1 p-3">
            <p className="text-[13px] font-semibold text-slate-900">{title}</p>
            <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">
              {subtitle}
            </p>
            <p className="pt-1 text-[10px] text-slate-400">{domain}</p>
          </div>
        </div>
      </div>
    );
  }

  // WhatsApp
  return (
    <div className="rounded-xl border border-[#D1F4CC] bg-[#E7F8E9] p-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
        WhatsApp · Link preview
      </p>
      <div className="overflow-hidden rounded-lg border border-[#C6E8C0] bg-white">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-28 w-full object-cover" />
        ) : (
          <div className="h-28">
            <LogoPlaceholder iconClassName="h-8 w-8" />
          </div>
        )}
        <div className="space-y-1 bg-[#F5F6F6] px-3 py-2">
          <p className="line-clamp-2 text-[13px] font-semibold text-[#111B21]">
            {title}
          </p>
          <p className="line-clamp-2 text-[11px] text-[#667781]">{subtitle}</p>
          <p className="text-[10px] uppercase tracking-wide text-[#8696A0]">
            {domain} · {confidential}
          </p>
        </div>
      </div>
    </div>
  );
}

/** VIP share business-card generator with live WeChat / Slack / Email / WhatsApp previews. */
export function VipShareCard({
  config,
  onChange,
  clientName,
  logoDataUrl,
  coverUrl,
  sharePath,
}: VipShareCardProps) {
  const [channel, setChannel] = useState<ShareChannel>("wechat");

  const domain = useMemo(() => {
    const configured = (config.domainHint || "").trim();
    if (configured && !/^localhost(:\d+)?$/i.test(configured)) {
      return configured.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    }
    // Never show localhost in VIP share previews — use production-style domain
    const envHost =
      typeof process !== "undefined"
        ? (process.env.NEXT_PUBLIC_PORTAL_DOMAIN || "").trim()
        : "";
    if (envHost) {
      return envHost.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    }
    return "glassportal.app";
  }, [config.domainHint]);

  const previewTitle =
    config.cardTitle.trim() ||
    `${clientName || "Client"} 2026 Strategic Advisory Report`;
  const previewSubtitle =
    config.cardSubtitle.trim() ||
    "Confidential executive briefing — prepared exclusively for leadership review.";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 text-slate-700" />
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            VIP Share Card Generator
          </h2>
          <p className="text-[11px] text-slate-500">
            WeChat / Slack / Email / WhatsApp cover preview
          </p>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-slate-600">Card Title</span>
        <input
          type="text"
          value={config.cardTitle}
          onChange={(e) => onChange({ cardTitle: e.target.value })}
          placeholder={`${clientName || "Acme Group"} 2026 Strategic Advisory Report`}
          className="mech-input"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-slate-600">
          Supporting Line
        </span>
        <textarea
          value={config.cardSubtitle}
          onChange={(e) => onChange({ cardSubtitle: e.target.value })}
          rows={2}
          placeholder="Confidential executive briefing for the CEO & CFO."
          className="mech-input resize-none"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-slate-600">
          Confidentiality Badge
        </span>
        <input
          type="text"
          value={config.confidentialLabel}
          onChange={(e) => onChange({ confidentialLabel: e.target.value })}
          placeholder="Strictly Confidential"
          className="mech-input"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-slate-600">
          Preview Domain
        </span>
        <input
          type="text"
          value={config.domainHint}
          onChange={(e) => onChange({ domainHint: e.target.value })}
          placeholder="glassportal.app"
          className="mech-input"
        />
        <span className="block text-[10px] leading-relaxed text-slate-400">
          Shown on WeChat / Slack / Email / WhatsApp cards. Defaults to
          glassportal.app (never localhost).
        </span>
      </label>

      <div className="flex flex-wrap gap-1.5">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChannel(c.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
              channel === c.id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            {c.id === "wechat" ? (
              <MessageCircle className="h-3 w-3" />
            ) : c.id === "slack" ? (
              <Hash className="h-3 w-3" />
            ) : c.id === "email" ? (
              <Mail className="h-3 w-3" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {c.label}
          </button>
        ))}
      </div>

      <ChannelPreview
        channel={channel}
        title={previewTitle}
        subtitle={previewSubtitle}
        logo={logoDataUrl}
        cover={coverUrl}
        domain={domain}
        confidential={config.confidentialLabel || "Strictly Confidential"}
      />

      <p className="text-[11px] leading-relaxed text-slate-500">
        {CHANNELS.find((c) => c.id === channel)?.hint}. Clients sense premium
        delivery before they open the link.
        {sharePath ? " Share link is ready below after you generate." : ""}
      </p>
    </div>
  );
}
