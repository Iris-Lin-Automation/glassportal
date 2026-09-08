import Link from "next/link";
import type { Metadata } from "next";
import { createNotionClient, resolveNotionPageId } from "@/lib/notion";
import { fetchPortalData } from "@/lib/parser";
import { loadBranding } from "@/lib/branding-store";
import { getThemePreset, normalizeThemeId, themeBrandColor } from "@/lib/theme-presets";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBrandFavicon } from "@/components/portal/PortalBrandFavicon";
import { PasswordGate } from "@/components/portal/PasswordGate";
import type { PortalData } from "@/lib/types";
import {
  entitlementsFor,
  findOwnerEmailByPortal,
  loadPlan,
} from "@/lib/plan-store";
import { planShowsWatermark } from "@/config/plans";

export const dynamic = "force-dynamic";

async function loadPortal(id: string, token?: string) {
  const pageId = resolveNotionPageId(id);
  const client = createNotionClient(token);
  return fetchPortalData(client, pageId);
}

function looksLikeNotionToken(value?: string | null) {
  if (!value) return false;
  return /^(secret_|ntn_)/i.test(value);
}

function resolveNotionToken(sp: SearchParams): string | undefined {
  return (
    sp.nt ||
    sp.ntoken ||
    sp.t ||
    (looksLikeNotionToken(sp.token) ? sp.token : undefined) ||
    process.env.NOTION_API_TOKEN ||
    undefined
  );
}

function resolveClientAccessToken(sp: SearchParams): string | undefined {
  if (sp.token && !looksLikeNotionToken(sp.token)) return sp.token;
  if (sp.atk) return sp.atk;
  if (sp.key && !looksLikeNotionToken(sp.key)) return sp.key;
  return undefined;
}

type SearchParams = {
  token?: string;
  nt?: string;
  ntoken?: string;
  t?: string;
  key?: string;
  gate?: string;
  atk?: string;
  ogTitle?: string;
  ogDesc?: string;
  ogBadge?: string;
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

async function applyBranding(
  data: PortalData,
  pageId: string,
  searchParams: SearchParams
): Promise<PortalData> {
  const branding = await loadBranding(pageId);
  const logoPath = branding?.logoDataUrl
    ? `/api/branding/${encodeURIComponent(pageId)}/logo?v=${encodeURIComponent(
        branding.updatedAt
      )}`
    : undefined;

  return {
    ...data,
    // Keep Notion page title on the portal; OG/share overrides only via explicit query
    title: searchParams.ogTitle || data.title,
    description:
      searchParams.ogDesc ||
      branding?.cardSubtitle ||
      data.description,
    clientName:
      searchParams.client ||
      branding?.clientName ||
      data.clientName,
    badge:
      searchParams.ogBadge ||
      branding?.confidentialLabel ||
      data.badge,
    // Prefer saved client logo (tab favicon + header); Notion emoji is last resort
    icon: logoPath || data.icon,
    brandColor: branding?.brandColor || data.brandColor || "#0F172A",
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: SearchParams;
}): Promise<Metadata> {
  const notionToken = resolveNotionToken(searchParams);
  const pageId = resolveNotionPageId(params.id);
  const branding = await loadBranding(pageId);
  const fallbackTitle =
    searchParams.ogTitle ||
    branding?.cardTitle ||
    "Confidential Executive Delivery · GlassPortal";
  const fallbackDesc =
    searchParams.ogDesc ||
    branding?.cardSubtitle ||
    "Private strategic briefing prepared for executive review.";
  const logoIcon = branding?.logoDataUrl
    ? `/api/branding/${encodeURIComponent(pageId)}/logo?v=${encodeURIComponent(
        branding.updatedAt
      )}`
    : undefined;

  // Prefer branding logo for tab icon — Notion emoji/file icons are unreliable
  const tabIcon = logoIcon
    ? {
        icon: [{ url: logoIcon }],
        apple: [{ url: logoIcon }],
        shortcut: logoIcon,
      }
    : undefined;

  try {
    if (!notionToken) {
      return {
        title: fallbackTitle,
        description: fallbackDesc,
        icons: tabIcon,
        openGraph: {
          title: fallbackTitle,
          description: fallbackDesc,
          type: "website",
          images: logoIcon ? [logoIcon] : undefined,
        },
        robots: { index: false, follow: false },
      };
    }
    const data = await applyBranding(
      await loadPortal(params.id, notionToken),
      pageId,
      searchParams
    );
    const title = data.title || fallbackTitle;
    const description =
      data.description ||
      `Prepared for ${data.preparedFor || data.clientName || "executive leadership"} · ${
        data.badge || "Strictly Confidential"
      }`;
    const images = data.coverUrl
      ? [data.coverUrl]
      : logoIcon || (data.icon?.startsWith("/") || data.icon?.startsWith("http")
          ? data.icon
          : undefined)
        ? [data.coverUrl || logoIcon || data.icon!]
        : undefined;

    return {
      title,
      description,
      icons: tabIcon,
      openGraph: { title, description, type: "website", images },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images,
      },
      robots: { index: false, follow: false },
    };
  } catch {
    return {
      title: fallbackTitle,
      description: fallbackDesc,
      icons: tabIcon,
      robots: { index: false, follow: false },
    };
  }
}

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: SearchParams;
}) {
  const notionToken = resolveNotionToken(searchParams);
  const clientAccessToken = resolveClientAccessToken(searchParams);
  const pageId = resolveNotionPageId(params.id);

  let error: string | null = null;
  let data: PortalData | null = null;

  try {
    if (!notionToken) {
      throw new Error(
        "No Notion credential available. Open the builder, or set NOTION_API_TOKEN."
      );
    }
    data = await applyBranding(
      await loadPortal(params.id, notionToken),
      pageId,
      searchParams
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load portal";
  }

  const branding = await loadBranding(pageId);
  const ownerEmail =
    branding?.ownerEmail || (await findOwnerEmailByPortal(pageId)) || "";
  let showWatermark = branding?.showWatermark !== false;
  let whiteLabel = Boolean(branding?.whiteLabel);
  if (ownerEmail) {
    const planRec = await loadPlan(ownerEmail);
    const ent = entitlementsFor(planRec?.plan || "starter");
    showWatermark = planShowsWatermark(ent.plan);
    whiteLabel = ent.whiteLabel;
  } else {
    showWatermark = true;
    whiteLabel = false;
  }
  // Prefer ?gate=, then saved Studio branding, then Notion Password property
  const gatePasscode =
    decodeGate(searchParams.gate) ||
    (branding?.passcodeEnabled && branding.passcode?.trim()
      ? branding.passcode.trim()
      : undefined) ||
    data?.password ||
    undefined;
  const clientName =
    searchParams.client ||
    branding?.clientName ||
    data?.clientName ||
    "Acme Corporation";
  const confidentialLabel =
    searchParams.ogBadge ||
    branding?.confidentialLabel ||
    data?.badge ||
    "Strictly Confidential";
  // Only explicit client access tokens skip the gate — never Notion `nt=`
  const bypassWithToken = Boolean(clientAccessToken);
  const theme = normalizeThemeId(branding?.theme);
  const themePreset = getThemePreset(theme);
  const portalData = data
    ? {
        ...data,
        brandColor:
          data.brandColor ||
          branding?.brandColor ||
          themeBrandColor(theme),
      }
    : null;

  return (
    <div className={`min-h-screen pb-8 ${themePreset.pageBg} ${themePreset.pageText}`}>
      {/* Tab favicon = uploaded brand logo (outside gate so it always applies) */}
      <PortalBrandFavicon pageId={pageId} />
      {error || !portalData ? (
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <div className="mb-8 flex justify-end">
            <Link
              href="/"
              className={`text-xs font-medium portal-transition ${themePreset.mutedText} hover:opacity-100`}
            >
              Back to Studio
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Portal Unavailable
          </h1>
          <p className={`mt-3 text-base leading-relaxed ${themePreset.mutedText}`}>
            {error}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Studio
          </Link>
        </div>
      ) : (
        <PasswordGate
          expected={gatePasscode}
          bypassWithToken={bypassWithToken}
          clientName={clientName}
          confidentialLabel={confidentialLabel}
        >
          <div className="fixed right-4 top-14 z-[195]">
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur hover:text-slate-900"
            >
              Back to Studio
            </Link>
          </div>
          <PortalShell
            data={portalData}
            token={notionToken}
            theme={theme}
            whiteLabel={whiteLabel}
            showWatermark={showWatermark}
          />
        </PasswordGate>
      )}
    </div>
  );
}
