import { readJson, writeJson } from "@/lib/kv-json";
import { hashPassword, verifyPassword } from "@/lib/security/crypto";

export interface ConsultantAccountRecord {
  email: string;
  name: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

function key(email: string) {
  return `account:${email.trim().toLowerCase()}`;
}

export async function getAccount(email: string) {
  return readJson<ConsultantAccountRecord>(key(email));
}

export async function registerAccount(input: {
  email: string;
  name: string;
  password: string;
}): Promise<{ ok: true; account: ConsultantAccountRecord } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@") || input.password.trim().length < 6) {
    return { ok: false, error: "Valid email and password (6+ chars) required." };
  }
  const existing = await getAccount(email);
  if (existing) {
    return { ok: false, error: "An account with this email already exists. Sign in instead." };
  }
  const { hash, salt } = hashPassword(input.password.trim());
  const account: ConsultantAccountRecord = {
    email,
    name: input.name.trim() || email.split("@")[0],
    salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await writeJson(key(email), account);
  return { ok: true, account };
}

export async function authenticateAccount(
  emailRaw: string,
  password: string
): Promise<{ ok: true; account: ConsultantAccountRecord } | { ok: false; error: string }> {
  const email = emailRaw.trim().toLowerCase();
  const account = await getAccount(email);
  if (!account || !verifyPassword(password.trim(), account.salt, account.passwordHash)) {
    return { ok: false, error: "Invalid email or password." };
  }
  return { ok: true, account };
}
