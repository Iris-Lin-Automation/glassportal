import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { fulfillPurchase } from "@/lib/fulfill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lemon Squeezy webhook (order_created).
 * Set webhook URL: https://glassportal.vercel.app/api/webhooks/lemon
 * Verify X-Signature with LEMONSQUEEZY_WEBHOOK_SECRET (HMAC-SHA256 of raw body).
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";
    if (!secret) {
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 401 }
      );
    }

    const raw = await req.text();
    const signature = req.headers.get("x-signature") || "";
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const digest = createHmac("sha256", secret).update(raw).digest("hex");
    const a = Buffer.from(digest);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(raw) as {
      meta?: { event_name?: string };
      data?: {
        id?: string;
        attributes?: {
          user_email?: string;
          status?: string;
          first_order_item?: { product_name?: string; variant_name?: string };
        };
      };
    };

    const event = body.meta?.event_name || "";
    if (event && event !== "order_created" && event !== "subscription_created") {
      return NextResponse.json({ ok: true, skipped: event });
    }

    const email = body.data?.attributes?.user_email || "";
    const product =
      body.data?.attributes?.first_order_item?.variant_name ||
      body.data?.attributes?.first_order_item?.product_name ||
      "";
    const status = body.data?.attributes?.status || "";
    if (status && status !== "paid") {
      return NextResponse.json({ ok: true, skipped: status });
    }

    const record = await fulfillPurchase({
      email,
      source: "lemon",
      purchaseId: body.data?.id,
      productHint: product,
    });

    return NextResponse.json({ ok: true, email: record.email, plan: record.plan });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Webhook failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
