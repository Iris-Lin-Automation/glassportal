import { readJson, writeJson } from "@/lib/kv-json";
import {
  decryptString,
  encryptString,
  hashOpaque,
  hmacSign,
  timingSafeEqualString,
} from "@/lib/security/crypto";

interface PortalCredentialRecord {
  pageId: string;
  tokenEnc: string;
  ticket: string;
  ownerEmail?: string;
  accessTokenHash?: string;
  updatedAt: string;
}

function credKey(pageId: string) {
  return `portal-cred:${pageId}`;
}

export function mintShareTicket(pageId: string): string {
  return hmacSign(`share:${pageId}`);
}

export function verifyShareTicket(pageId: string, ticket?: string | null): boolean {
  if (!ticket) return false;
  const expected = mintShareTicket(pageId);
  return timingSafeEqualString(ticket, expected);
}

export async function savePortalCredential(input: {
  pageId: string;
  notionToken: string;
  ownerEmail?: string;
  accessToken?: string;
}): Promise<{ ticket: string }> {
  const ticket = mintShareTicket(input.pageId);
  const record: PortalCredentialRecord = {
    pageId: input.pageId,
    tokenEnc: encryptString(input.notionToken.trim()),
    ticket,
    ownerEmail: input.ownerEmail?.trim().toLowerCase(),
    accessTokenHash: input.accessToken?.trim()
      ? hashOpaque(input.accessToken.trim())
      : undefined,
    updatedAt: new Date().toISOString(),
  };
  await writeJson(credKey(input.pageId), record);
  return { ticket };
}

export async function loadPortalNotionToken(pageId: string): Promise<string | null> {
  const record = await readJson<PortalCredentialRecord>(credKey(pageId));
  if (!record?.tokenEnc) return null;
  return decryptString(record.tokenEnc);
}

export async function loadPortalCredentialMeta(pageId: string) {
  return readJson<PortalCredentialRecord>(credKey(pageId));
}

export async function verifyVipAccessToken(
  pageId: string,
  token?: string | null
): Promise<boolean> {
  if (!token) return false;
  const meta = await loadPortalCredentialMeta(pageId);
  if (!meta?.accessTokenHash) return false;
  return timingSafeEqualString(meta.accessTokenHash, hashOpaque(token.trim()));
}

/** Resolve Notion Integration token for a portal request without env fallback. */
export async function resolvePortalNotionToken(opts: {
  pageId: string;
  headerToken?: string | null;
  shareTicket?: string | null;
}): Promise<string | null> {
  const header = opts.headerToken?.trim();
  if (header && /^(secret_|ntn_)/i.test(header)) {
    return header;
  }
  if (opts.shareTicket && verifyShareTicket(opts.pageId, opts.shareTicket)) {
    return loadPortalNotionToken(opts.pageId);
  }
  return null;
}
