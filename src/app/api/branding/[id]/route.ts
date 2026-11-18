import { NextRequest, NextResponse } from "next/server";
import { createNotionClient, resolveNotionPageId } from "@/lib/notion";
import { loadBranding, saveBranding } from "@/lib/branding-store";
import {
  claimPortal,
  entitlementsFor,
  getOrCreatePlan,
} from "@/lib/plan-store";
import type { PlanId } from "@/config/plans";
import { hashOpaque, looksLikeNotionToken } from "@/lib/security/crypto";
import { savePortalCredential } from "@/lib/security/portal-credential";
import { toPublicBranding } from "@/lib/security/public-branding";
import { requireSessionEmail } from "@/lib/security/studio-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOGO_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

function assertSafeLogoDataUrl(dataUrl: string): string | null {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return "Logo must be a base64 data URL.";
  const mime = match[1].toLowerCase().trim();
  if (!LOGO_MIME.has(mime) || mime.includes("svg")) {
    return "Logo must be PNG, JPEG, WebP, or GIF (SVG is not allowed).";
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pageId = resolveNotionPageId(decodeURIComponent(params.id));
    const branding = await loadBranding(pageId);
    if (!branding) {
      return NextResponse.json({ error: "No branding saved" }, { status: 404 });
    }
    return NextResponse.json(toPublicBranding(branding));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load branding";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionEmail = requireSessionEmail(req);
    if (!sessionEmail) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const pageId = resolveNotionPageId(decodeURIComponent(params.id));
    const body = (await req.json()) as {
      clientName?: string;
      logoDataUrl?: string;
      coverDataUrl?: string;
      clearCover?: boolean;
      hideCover?: boolean;
      brandColor?: string;
      theme?: string;
      cardTitle?: string;
      cardSubtitle?: string;
      confidentialLabel?: string;
      passcodeEnabled?: boolean;
      passcode?: string;
      ownerEmail?: string;
      publish?: boolean;
      notionToken?: string;
      accessToken?: string;
    };

    if (body.logoDataUrl) {
      if (body.logoDataUrl.length > 2_500_000) {
        return NextResponse.json(
          { error: "Logo too large. Please use a smaller image." },
          { status: 413 }
        );
      }
      const logoErr = assertSafeLogoDataUrl(body.logoDataUrl);
      if (logoErr) {
        return NextResponse.json({ error: logoErr }, { status: 400 });
      }
    }

    if (body.coverDataUrl) {
      if (body.coverDataUrl.length > 3_500_000) {
        return NextResponse.json(
          { error: "Cover too large. Please use a smaller poster image." },
          { status: 413 }
        );
      }
      const coverErr = assertSafeLogoDataUrl(body.coverDataUrl);
      if (coverErr) {
        return NextResponse.json(
          { error: coverErr.replace(/^Logo/, "Cover") },
          { status: 400 }
        );
      }
    }

    // Owner is always the signed-in consultant — never trust body.ownerEmail alone.
    const ownerEmail = sessionEmail;

    const existing = await loadBranding(pageId);
    // First claim / publish must prove Notion page access with a real Integration token.
    const isFirstOwner = !existing?.ownerEmail;
    if (isFirstOwner || body.publish) {
      if (!looksLikeNotionToken(body.notionToken)) {
        return NextResponse.json(
          {
            error:
              "A valid Notion Integration Token is required to claim or publish this page.",
          },
          { status: 401 }
        );
      }
      try {
        const client = createNotionClient(body.notionToken);
        await client.pages.retrieve({ page_id: pageId });
      } catch {
        return NextResponse.json(
          {
            error:
              "Notion token cannot access this page. Share the page with your Integration first.",
          },
          { status: 403 }
        );
      }
    }

    let showWatermark = true;
    let whiteLabel = false;
    let planId: PlanId = "starter";

    if (body.publish) {
      const claim = await claimPortal(ownerEmail, pageId);
      if (!claim.ok) {
        return NextResponse.json(
          {
            error: claim.message,
            code: claim.code,
            portalLimit: claim.limit,
            portalCount: claim.record.portalIds.length,
            entitlements: entitlementsFor(claim.record.plan),
          },
          { status: 402 }
        );
      }
      const ent = entitlementsFor(claim.record.plan);
      showWatermark = ent.showWatermark;
      whiteLabel = ent.whiteLabel;
      planId = claim.record.plan;

      if (body.passcodeEnabled && !ent.passwordProtection) {
        return NextResponse.json(
          {
            error:
              "Passcode protection requires Pro or Agency. Upgrade to lock this portal.",
            code: "feature_locked",
            entitlements: ent,
          },
          { status: 402 }
        );
      }
    } else {
      const record = await getOrCreatePlan(ownerEmail);
      const ent = entitlementsFor(record.plan);
      showWatermark = ent.showWatermark;
      whiteLabel = ent.whiteLabel;
      planId = record.plan;
    }

    // Only the existing owner (or first publisher) may overwrite this page.
    if (
      existing?.ownerEmail &&
      existing.ownerEmail.toLowerCase() !== ownerEmail
    ) {
      return NextResponse.json(
        { error: "You do not own this portal branding record." },
        { status: 403 }
      );
    }

    let passcodeHash = existing?.passcodeHash;
    let passcodePlain: string | undefined = undefined;
    if (typeof body.passcode === "string") {
      const trimmed = body.passcode.trim();
      if (trimmed) {
        passcodeHash = hashOpaque(trimmed);
        passcodePlain = undefined; // drop plaintext going forward
      } else {
        passcodeHash = undefined;
      }
    }

    let nextCover = existing?.coverDataUrl;
    let nextHideCover = existing?.hideCover;
    if (body.clearCover) {
      nextCover = undefined;
    } else if (typeof body.coverDataUrl === "string" && body.coverDataUrl) {
      nextCover = body.coverDataUrl;
      nextHideCover = false;
    }
    if (typeof body.hideCover === "boolean") {
      nextHideCover = body.hideCover;
    }

    const saved = await saveBranding(pageId, {
      clientName: body.clientName ?? existing?.clientName,
      logoDataUrl: body.logoDataUrl ?? existing?.logoDataUrl,
      coverDataUrl: nextCover,
      hideCover: nextHideCover,
      brandColor: body.brandColor ?? existing?.brandColor,
      theme: body.theme ?? existing?.theme,
      cardTitle: body.cardTitle ?? existing?.cardTitle,
      cardSubtitle: body.cardSubtitle ?? existing?.cardSubtitle,
      confidentialLabel:
        body.confidentialLabel ?? existing?.confidentialLabel,
      passcodeEnabled:
        typeof body.passcodeEnabled === "boolean"
          ? body.passcodeEnabled
          : existing?.passcodeEnabled,
      passcode: passcodePlain,
      passcodeHash,
      ownerEmail,
      showWatermark,
      whiteLabel,
    });

    let shareTicket: string | undefined;
    if (body.notionToken && looksLikeNotionToken(body.notionToken)) {
      const cred = await savePortalCredential({
        pageId,
        notionToken: body.notionToken,
        ownerEmail,
        accessToken: body.accessToken,
      });
      shareTicket = cred.ticket;
    }

    return NextResponse.json({
      ok: true,
      branding: toPublicBranding(saved),
      plan: planId,
      entitlements: entitlementsFor(planId),
      shareTicket,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save branding";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
