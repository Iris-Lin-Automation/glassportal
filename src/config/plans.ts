export type PlanId = "starter" | "pro" | "agency";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceMonthly: number;
  portalLimit: number;
  watermark: boolean;
  whiteLabel: boolean;
  passwordProtection: boolean;
  customDomain: boolean;
  blurb: string;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthly: 0,
    portalLimit: 1,
    watermark: true,
    whiteLabel: false,
    passwordProtection: true,
    customDomain: false,
    blurb: "1 portal · GlassPortal mark on reports & PDFs",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 19,
    portalLimit: 3,
    watermark: false,
    whiteLabel: true,
    passwordProtection: true,
    customDomain: false,
    blurb: "3 portals · Remove mark · Passcode protection",
  },
  agency: {
    id: "agency",
    name: "Agency",
    priceMonthly: 49,
    portalLimit: 15,
    watermark: false,
    whiteLabel: true,
    passwordProtection: true,
    customDomain: true,
    blurb: "15 portals · Custom domain · Clean white-label",
  },
};

export const PLAN_ORDER: PlanId[] = ["starter", "pro", "agency"];

export function getPlan(id?: string | null): PlanDefinition {
  if (id && id in PLANS) return PLANS[id as PlanId];
  return PLANS.starter;
}

/** Marketing site / signup CTA for the PLG watermark. */
export const WATERMARK_HREF = "/";
export const WATERMARK_LABEL =
  "⚡ Delivered via GlassPortal · Create your executive portal";
/** jsPDF Helvetica cannot draw emoji / special dots — use ASCII only in PDFs. */
export const WATERMARK_LABEL_PDF =
  "Delivered via GlassPortal | Create your executive portal";

export function planShowsWatermark(plan?: string | null): boolean {
  const id = (plan || "starter").toLowerCase();
  return id !== "pro" && id !== "agency";
}
