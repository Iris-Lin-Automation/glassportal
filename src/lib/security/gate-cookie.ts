import { hmacSign, timingSafeEqualString } from "@/lib/security/crypto";

export function gateCookieName(pageId: string) {
  return `gp_gate_${pageId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 48)}`;
}

export function mintGateCookie(pageId: string): string {
  return hmacSign(`gate:${pageId}`);
}

export function verifyGateCookie(pageId: string, value?: string | null): boolean {
  if (!value) return false;
  return timingSafeEqualString(value, mintGateCookie(pageId));
}
