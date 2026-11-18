import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";

/** App signing key material — never expose to the client. */
export function getAppSecret(): Buffer {
  const raw =
    process.env.PORTAL_SIGNING_SECRET ||
    process.env.FULFILLMENT_SECRET ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "";
  if (raw) return createHash("sha256").update(raw).digest();
  // Local-only fallback so Studio still works without secrets configured.
  return createHash("sha256").update("glassportal-dev-signing-key").digest();
}

export function hmacSign(payload: string): string {
  return createHmac("sha256", getAppSecret()).update(payload).digest("base64url");
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function encryptString(plain: string): string {
  const key = getAppSecret();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptString(blob: string): string | null {
  try {
    const [ver, ivB64, tagB64, dataB64] = blob.split(".");
    if (ver !== "v1" || !ivB64 || !tagB64 || !dataB64) return null;
    const key = getAppSecret();
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivB64, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const out = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ]);
    return out.toString("utf8");
  } catch {
    return null;
  }
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || randomBytes(16).toString("base64url");
  const hash = scryptSync(password, s, 32).toString("base64url");
  return { hash, salt: s };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const next = scryptSync(password, salt, 32).toString("base64url");
  return timingSafeEqualString(next, hash);
}

export function hashOpaque(value: string): string {
  return createHash("sha256").update(getAppSecret()).update(value).digest("base64url");
}

export function looksLikeNotionToken(value?: string | null): boolean {
  if (!value) return false;
  return /^(secret_|ntn_)/i.test(value.trim());
}
