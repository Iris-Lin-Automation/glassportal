import { NextRequest, NextResponse } from "next/server";
import { fulfillPurchase } from "@/lib/fulfill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Gumroad Ping (new sale).
 * Dashboard → Settings → Advanced → Ping URL:
 *   https://glassportal.vercel.app/api/webhooks/gumroad
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.GUMROAD_WEBHOOK_SECRET || "";
    const ctype = req.headers.get("content-type") || "";
    let email = "";
    let product = "";
    let saleId = "";
    let pingSecret = "";
    let refunded = false;

    if (ctype.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;
      email = String(body.email || body.purchaser_email || "");
      product = String(body.product_name || body.permalink || body.product_id || "");
      saleId = String(body.sale_id || body.order_number || "");
      pingSecret = String(body.secret || body.webhook_secret || "");
      refunded = body.refunded === true || body.refunded === "true";
    } else {
      const form = await req.formData();
      email = String(form.get("email") || "");
      product = String(
        form.get("product_name") ||
          form.get("permalink") ||
          form.get("product_permalink") ||
          ""
      );
      saleId = String(form.get("sale_id") || form.get("order_number") || "");
      pingSecret = String(form.get("secret") || "");
      refunded =
        String(form.get("refunded") || "") === "true" ||
        String(form.get("chargebacked") || "") === "true";
    }

    if (secret && pingSecret && pingSecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (refunded) {
      return NextResponse.json({ ok: true, skipped: "refunded" });
    }

    const record = await fulfillPurchase({
      email,
      source: "gumroad",
      purchaseId: saleId || undefined,
      productHint: product,
    });

    return NextResponse.json({ ok: true, email: record.email, plan: record.plan });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Webhook failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
