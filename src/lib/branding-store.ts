import { readJson, writeJson } from "@/lib/kv-json";

export interface PortalBranding {
  pageId: string;
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
  showWatermark?: boolean;
  whiteLabel?: boolean;
  updatedAt: string;
}

const LOGO_MAX_KV = 700_000;

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
  await writeJson(brandKey(pageId), forKv);
  return record;
}

export async function loadBranding(
  pageId: string
): Promise<PortalBranding | null> {
  return readJson<PortalBranding>(brandKey(pageId));
}
