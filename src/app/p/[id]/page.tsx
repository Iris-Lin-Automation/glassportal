import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
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
import { looksLikeNotionToken } from "@/lib/security/crypto";
import {
  resolvePortalNotionToken,
  verifyVipAccessToken,
} from "@/lib/security/portal-credential";
import {
  gateCookieName,
  verifyGateCookie,
} from "@/lib/security/gate-cookie";

export const dynamic = "force-dynamic";

async function loadPortal(id: string, token?: string) {
  const pageId = resolveNotionPageId(id);
  const client = createNotionClient(token);
  return fetchPortalData(client, pageId);
}

type SearchParams = {
  token?: string;
  nt?: string;
  ntoken?: string;
  t?: string;
  key?: string;
  gate?: string;
  atk?: string;
  s?: string;
  v?: string;
  ogTitle?: string;
  ogDesc?: string;
  ogBadge?: string;
  client?: string;
};

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
  const pageId = resolveNotionPageId(params.id);
  const branding = await loadBranding(pageId);
  const fallbackTitle =
    searchParams.ogTitle ||
    branding?.cardTitle ||
    branding?.clientName ||
    "Client Portal";
  const description =
    searchParams.ogDesc ||
    branding?.cardSubtitle ||
    "Confidential executive portal";
  const logoPath = branding?.logoDataUrl
    ? `/api/branding/${encodeURIComponent(pageId)}/logo?v=${encodeURIComponent(
        branding.updatedAt
      )}`
    : undefined;

  return {
    title: fallbackTitle,
    description,
    icons: logoPath
      ? {
          icon: [{ url: logoPath }],
          apple: [{ url: logoPath }],
          shortcut: [logoPath],
        }
      : undefined,
  };
}

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: SearchParams;
}) {
  const pageId = resolveNotionPageId(params.id);
  const shareTicket = searchParams.s?.trim();
  // Reject Notion secrets from query strings — only opaque tickets or studio headers.
  const headerLike =
    looksLikeNotionToken(searchParams.nt) ||
    looksLikeNotionToken(searchParams.ntoken) ||
    looksLikeNotionToken(searchParams.t)
      ? null
      : null;

  void headerLike;

  const notionToken = await resolvePortalNotionToken({
    pageId,
    headerToken: null,
    shareTicket,
  });

  let error: string | null = null;
  let data: PortalData | null = null;

  try {
    if (!notionToken) {
      throw new Error(
        "This portal link is missing a valid share ticket. Ask your advisor to re-publish the portal."
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

  const vipRaw =
    searchParams.v ||
    (searchParams.token && !looksLikeNotionToken(searchParams.token)
      ? searchParams.token
      : undefined) ||
    searchParams.atk ||
    (searchParams.key && !looksLikeNotionToken(searchParams.key)
      ? searchParams.key
      : undefined);
  const bypassWithToken = await verifyVipAccessToken(pageId, vipRaw);

  const cookieStore = cookies();
  const alreadyUnlocked = verifyGateCookie(
    pageId,
    cookieStore.get(gateCookieName(pageId))?.value
  );

  const passcodeEnabled = Boolean(
    branding?.passcodeEnabled && (branding.passcodeHash || branding.passcode)
  );

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
    <div
      className={`min-h-screen pb-[max(2rem,env(safe-area-inset-bottom,0px))] ${themePreset.pageBg} ${themePreset.pageText}`}
    >
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
          pageId={pageId}
          passcodeEnabled={passcodeEnabled}
          bypassWithToken={bypassWithToken}
          alreadyUnlocked={alreadyUnlocked}
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
            data={portalData}
            shareTicket={shareTicket}
            theme={theme}
            whiteLabel={whiteLabel}
            showWatermark={showWatermark}
          />
        </PasswordGate>
      )}
    </div>
  );
}
