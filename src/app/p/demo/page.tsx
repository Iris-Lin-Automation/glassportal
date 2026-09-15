import Link from "next/link";
import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/PortalShell";
import { PasswordGate } from "@/components/portal/PasswordGate";
import { createSamplePortalData } from "@/lib/sample-portal";
import {
  getThemePreset,
  normalizeThemeId,
  themeBrandColor,
} from "@/lib/theme-presets";

export const dynamic = "force-dynamic";

type SearchParams = {
  gate?: string;
  theme?: string;
  client?: string;
};

function decodeGate(raw?: string, fallback?: string) {
  if (!raw) return fallback;
  if (raw.startsWith("b64.")) {
    try {
      return Buffer.from(raw.slice(4), "base64").toString("utf8");
    } catch {
      return raw;
    }
  }
  return raw;
}

export const metadata: Metadata = {
  title: "Demo · GlassPortal Client View",
  description:
    "Experience the executive client portal as your buyer would — sample report with passcode gate.",
};

/**
 * Client-view demo without a live Notion page.
 * Lets creators test the passcode gate + reading experience immediately.
 */
export default function DemoClientPortalPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const theme = normalizeThemeId(searchParams.theme);
  const themePreset = getThemePreset(theme);
  const data = {
    ...createSamplePortalData(),
    brandColor: themeBrandColor(theme),
    clientName: searchParams.client?.trim() || "Acme Corporation",
  };
  const gatePasscode = decodeGate(searchParams.gate, "Acme2026");
  const clientName = data.clientName || "Acme Corporation";
  const confidentialLabel = data.badge || "Strictly Confidential";

  return (
    <div
      className={`min-h-screen pb-[max(2rem,env(safe-area-inset-bottom,0px))] ${themePreset.pageBg} ${themePreset.pageText}`}
    >
      <PasswordGate
        expected={gatePasscode}
        bypassWithToken={false}
        clientName={clientName}
        confidentialLabel={confidentialLabel}
      >
        <div className="fixed right-4 top-[max(3.5rem,calc(env(safe-area-inset-top,0px)+2.75rem))] z-[195] hidden md:block">
          <Link
            href="/"
            className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur hover:text-slate-900"
          >
            Back to Studio
          </Link>
        </div>
        <PortalShell
          data={data}
          theme={theme}
          liveSync={false}
          showWatermark
          whiteLabel={false}
        />
      </PasswordGate>
    </div>
  );
}
