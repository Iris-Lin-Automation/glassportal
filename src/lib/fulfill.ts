import type { PlanId } from "@/config/plans";
import { setConsultantPlan } from "@/lib/plan-store";

export function planFromProductHint(hint?: string | null): PlanId {
  const h = (hint || "").toLowerCase();
  if (h.includes("agency")) return "agency";
  if (h.includes("pro") || h.includes("premium") || h.includes("white")) {
    return "pro";
  }
  const mapped = (process.env.GUMROAD_DEFAULT_PLAN || "pro").toLowerCase();
  if (mapped === "agency" || mapped === "pro" || mapped === "starter") {
    return mapped;
  }
  return "pro";
}

export async function fulfillPurchase(opts: {
  email: string;
  plan?: PlanId;
  source: "gumroad" | "lemon" | "manual" | "fulfill";
  purchaseId?: string;
  productHint?: string;
}) {
  const email = opts.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("Valid buyer email required");
  }
  const plan = opts.plan || planFromProductHint(opts.productHint);
  return setConsultantPlan(email, plan, {
    purchaseSource: opts.source,
    purchaseId: opts.purchaseId,
  });
}
