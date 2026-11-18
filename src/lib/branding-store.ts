import { readJson, writeJson } from "@/lib/kv-json";

export interface PortalBranding {
  pageId: string;
  clientName?: string;
  logoDataUrl?: string;
  /** Optional commercial poster / hero cover (overrides Notion page cover). */
  coverDataUrl?: string;
  /** When true, never show Notion or uploaded cover in the portal header. */
  hideCover?: boolean;
  brandColor?: string;
  theme?: string;
  cardTitle?: string;
  cardSubtitle?: string;
  confidentialLabel?: string;
  passcodeEnabled?: boolean;
  /** @deprecated plaintext — migrate to passcodeHash; never return to clients */
  passcode?: string;
  /** Opaque hash of passcode (preferred) */
  passcodeHash?: string;
  ownerEmail?: string;
  showWatermark?: boolean;
  whiteLabel?: boolean;
  updatedAt: string;
}

const LOGO_MAX_KV = 700_000;
const COVER_MAX_KV = 900_000;

function brandKey(pageId: string) {
  return `branding:${pageId}`;
}

export async function saveBranding(
  pageId: string,
  payload: Omit<PortalBranding, "pageId" | "updatedAt">
): Promise<PortalBranding> {
  const record: PortalBranding = {
    pageId,
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  const forKv: PortalBranding = { ...record };
  if ((forKv.logoDataUrl?.length || 0) > LOGO_MAX_KV) {
    delete forKv.logoDataUrl;
  }
  if ((forKv.coverDataUrl?.length || 0) > COVER_MAX_KV) {
    delete forKv.coverDataUrl;
  }
  await writeJson(brandKey(pageId), forKv);
  return record;
}

export async function loadBranding(
  pageId: string
): Promise<PortalBranding | null> {
  return readJson<PortalBranding>(brandKey(pageId));
}
