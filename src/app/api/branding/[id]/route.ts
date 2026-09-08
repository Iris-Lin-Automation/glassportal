import { NextRequest, NextResponse } from "next/server";
import { resolveNotionPageId } from "@/lib/notion";
import { loadBranding, saveBranding } from "@/lib/branding-store";
import {
  claimPortal,
  entitlementsFor,
  getOrCreatePlan,
} from "@/lib/plan-store";
import { getPlan, type PlanId } from "@/config/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    return NextResponse.json(branding);
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
    const pageId = resolveNotionPageId(decodeURIComponent(params.id));
    const body = (await req.json()) as {
      clientName?: string;
      logoDataUrl?: string;
      brandColor?: string;
      theme?: string;
      cardTitle?: string;
      cardSubtitle?: string;
      confidentialLabel?: string;
      passcodeEnabled?: boolean;
      passcode?: string;
      ownerEmail?: string;
      /** When true, claim a portal slot against the consultant plan quota. */
      publish?: boolean;
    };

    if (body.logoDataUrl && body.logoDataUrl.length > 2_500_000) {
      return NextResponse.json(
        { error: "Logo too large. Please use a smaller image." },
        { status: 413 }
      );
    }

    const ownerEmail =
      body.ownerEmail?.trim().toLowerCase() ||
      req.headers.get("x-consultant-email")?.trim().toLowerCase() ||
      undefined;

    let showWatermark = true;
    let whiteLabel = false;
    let planId: PlanId = "starter";

    if (ownerEmail && body.publish) {
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

      // Starter cannot use passcode lock (Pro+)
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
    } else if (ownerEmail) {
      const record = await getOrCreatePlan(ownerEmail);
      const ent = entitlementsFor(record.plan);
      showWatermark = ent.showWatermark;
      whiteLabel = ent.whiteLabel;
      planId = record.plan;
    } else {
      // Unpublished / guest sync — always show PLG watermark
      const starter = getPlan("starter");
      showWatermark = starter.watermark;
      whiteLabel = starter.whiteLabel;
    }

    const existing = await loadBranding(pageId);
    const saved = await saveBranding(pageId, {
      clientName: body.clientName ?? existing?.clientName,
      logoDataUrl: body.logoDataUrl ?? existing?.logoDataUrl,
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
      passcode:
        body.passcode !== undefined ? body.passcode : existing?.passcode,
      ownerEmail: ownerEmail || existing?.ownerEmail,
      showWatermark,
      whiteLabel,
    });

    return NextResponse.json({
      ok: true,
      branding: saved,
      plan: planId,
      entitlements: entitlementsFor(planId),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save branding";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
