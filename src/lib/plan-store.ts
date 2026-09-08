import { getPlan, type PlanId } from "@/config/plans";
import { readJson, writeJson } from "@/lib/kv-json";

export interface ConsultantPlanRecord {
  email: string;
  plan: PlanId;
  portalIds: string[];
  customDomain?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  purchaseSource?: "gumroad" | "lemon" | "manual" | "fulfill";
  purchaseId?: string;
  updatedAt: string;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function planKey(email: string) {
  return `plan:${normalizeEmail(email)}`;
}

function ownerKey(pageId: string) {
  return `portal-owner:${pageId}`;
}

export async function loadPlan(
  email: string
): Promise<ConsultantPlanRecord | null> {
  return readJson<ConsultantPlanRecord>(planKey(email));
}

export async function getOrCreatePlan(
  email: string
): Promise<ConsultantPlanRecord> {
  const existing = await loadPlan(email);
  if (existing) return existing;
  return {
    email: normalizeEmail(email),
    plan: "starter",
    portalIds: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function savePlan(
  record: ConsultantPlanRecord
): Promise<ConsultantPlanRecord> {
  const next: ConsultantPlanRecord = {
    ...record,
    email: normalizeEmail(record.email),
    updatedAt: new Date().toISOString(),
  };
  await writeJson(planKey(next.email), next);
  for (const id of next.portalIds) {
    await writeJson(ownerKey(id), next.email);
  }
  return next;
}

export async function setConsultantPlan(
  email: string,
  plan: PlanId,
  extra?: Partial<
    Pick<ConsultantPlanRecord, "purchaseSource" | "purchaseId">
  >
): Promise<ConsultantPlanRecord> {
  const current = await getOrCreatePlan(email);
  return savePlan({ ...current, plan, ...extra });
}

export async function findOwnerEmailByPortal(
  pageId: string
): Promise<string | null> {
  const email = await readJson<string>(ownerKey(pageId));
  return typeof email === "string" && email.includes("@") ? email : null;
}

export type ClaimResult =
  | { ok: true; record: ConsultantPlanRecord }
  | {
      ok: false;
      code: "quota_exceeded" | "feature_locked";
      message: string;
      record: ConsultantPlanRecord;
      limit: number;
    };

export async function claimPortal(
  email: string,
  pageId: string
): Promise<ClaimResult> {
  const record = await getOrCreatePlan(email);
  const def = getPlan(record.plan);
  const ids = record.portalIds.includes(pageId)
    ? record.portalIds
    : [...record.portalIds, pageId];

  if (!record.portalIds.includes(pageId) && ids.length > def.portalLimit) {
    return {
      ok: false,
      code: "quota_exceeded",
      message: `${def.name} allows ${def.portalLimit} portal${
        def.portalLimit === 1 ? "" : "s"
      }. Upgrade to publish more.`,
      record,
      limit: def.portalLimit,
    };
  }

  const saved = await savePlan({ ...record, portalIds: ids });
  return { ok: true, record: saved };
}

export function entitlementsFor(plan: PlanId | string | null | undefined) {
  const def = getPlan(plan);
  return {
    plan: def.id,
    name: def.name,
    portalLimit: def.portalLimit,
    showWatermark: def.watermark,
    whiteLabel: def.whiteLabel,
    passwordProtection: def.passwordProtection,
    customDomain: def.customDomain,
  };
}
