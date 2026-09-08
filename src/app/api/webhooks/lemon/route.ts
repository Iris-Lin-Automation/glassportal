import { NextRequest, NextResponse } from "next/server";
import { fulfillPurchase } from "@/lib/fulfill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lemon Squeezy webhook (order_created).
 * Set webhook URL: https://glassportal.vercel.app/api/webhooks/lemon
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
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
