import type { PortalBranding } from "@/lib/branding-store";
import { hashOpaque } from "@/lib/security/crypto";

/** Safe branding payload for unauthenticated clients (no secrets). */
export function toPublicBranding(branding: PortalBranding) {
  return {
    pageId: branding.pageId,
    clientName: branding.clientName,
    brandColor: branding.brandColor,
    theme: branding.theme,
    cardTitle: branding.cardTitle,
    cardSubtitle: branding.cardSubtitle,
    confidentialLabel: branding.confidentialLabel,
    passcodeEnabled: Boolean(branding.passcodeEnabled),
    hasPasscode: Boolean(branding.passcodeHash || branding.passcode),
    hasLogo: Boolean(branding.logoDataUrl),
    showWatermark: branding.showWatermark,
    whiteLabel: branding.whiteLabel,
    updatedAt: branding.updatedAt,
  };
}

export function passcodeMatches(
  branding: PortalBranding | null | undefined,
  attempt: string
): boolean {
  if (!branding?.passcodeEnabled) return false;
  const clean = attempt.trim();
  if (!clean) return false;
  if (branding.passcodeHash) {
    return branding.passcodeHash === hashOpaque(clean);
  }
  // Legacy plaintext (migrate on next save)
  return Boolean(branding.passcode && branding.passcode.trim() === clean);
}
