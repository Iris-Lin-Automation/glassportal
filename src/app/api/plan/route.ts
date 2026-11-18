import { NextRequest, NextResponse } from "next/server";
import { PLAN_ORDER, getPlan, type PlanId } from "@/config/plans";
import {
  claimPortal,
  entitlementsFor,
  getOrCreatePlan,
  savePlan,
  setConsultantPlan,
} from "@/lib/plan-store";
import { bindDomain } from "@/lib/domain-store";
import { fulfillPurchase } from "@/lib/fulfill";
import { timingSafeEqualString } from "@/lib/security/crypto";
import { requireSessionEmail } from "@/lib/security/studio-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — current plan for the signed-in consultant only */
export async function GET(req: NextRequest) {
  try {
    const email = requireSessionEmail(req);
    if (!email) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const record = await getOrCreatePlan(email);
    const def = getPlan(record.plan);
    return NextResponse.json({
      email: record.email,
      plan: record.plan,
      portalIds: record.portalIds,
      portalCount: record.portalIds.length,
      portalLimit: def.portalLimit,
      entitlements: entitlementsFor(record.plan),
      plans: PLAN_ORDER.map((id) => getPlan(id)),
      customDomain: record.customDomain || null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST actions (session required except fulfill with FULFILLMENT_SECRET):
 * - { action: "set-plan", plan }
 * - { action: "claim", pageId }
 * - { action: "bind-domain", hostname, pageId }
 * - { action: "fulfill", email, plan, secret }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action?: string;
      email?: string;
      plan?: PlanId;
      pageId?: string;
      hostname?: string;
      secret?: string;
    };

    const action = body.action || "set-plan";

    if (action === "fulfill") {
      const expected = process.env.FULFILLMENT_SECRET || "";
      if (
        !expected ||
        !body.secret ||
        !timingSafeEqualString(body.secret, expected)
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const email = (body.email || "").trim().toLowerCase();
      if (!email) {
        return NextResponse.json({ error: "email required" }, { status: 400 });
      }
      const record = await fulfillPurchase({
        email,
        plan: body.plan || "pro",
        source: "fulfill",
      });
      return NextResponse.json({
        ok: true,
        record,
        entitlements: entitlementsFor(record.plan),
      });
    }

    const email = requireSessionEmail(req);
    if (!email) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    if (action === "set-plan") {
      const plan = body.plan;
      if (!plan || !["starter", "pro", "agency"].includes(plan)) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      }
      const openSwitch = process.env.ALLOW_OPEN_PLAN_SWITCH === "1";
      if (!openSwitch && plan !== "starter") {
        return NextResponse.json(
          {
            error:
              "Paid plans unlock after Gumroad / Lemon checkout. Sign in with the same email you used to purchase.",
            code: "checkout_required",
          },
          { status: 402 }
        );
      }
      const record = await setConsultantPlan(email, plan);
      return NextResponse.json({
        ok: true,
        record,
        entitlements: entitlementsFor(record.plan),
      });
    }

    if (action === "claim") {
      if (!body.pageId) {
        return NextResponse.json({ error: "pageId required" }, { status: 400 });
      }
      const result = await claimPortal(email, body.pageId);
      if (!result.ok) {
        return NextResponse.json(
          {
            error: result.message,
            code: result.code,
            portalLimit: result.limit,
            portalCount: result.record.portalIds.length,
            entitlements: entitlementsFor(result.record.plan),
          },
          { status: 402 }
        );
      }
      return NextResponse.json({
        ok: true,
        record: result.record,
        entitlements: entitlementsFor(result.record.plan),
      });
    }

    if (action === "bind-domain") {
      const record = await getOrCreatePlan(email);
      const ent = entitlementsFor(record.plan);
      if (!ent.customDomain) {
        return NextResponse.json(
          {
            error: "Custom domains require the Agency plan.",
            code: "feature_locked",
            entitlements: ent,
          },
          { status: 402 }
        );
      }
      if (!body.hostname || !body.pageId) {
        return NextResponse.json(
          { error: "hostname and pageId required" },
          { status: 400 }
        );
      }
      const binding = await bindDomain(body.hostname, body.pageId, email);
      await savePlan({ ...record, customDomain: binding.hostname });
      return NextResponse.json({ ok: true, binding });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Plan update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
