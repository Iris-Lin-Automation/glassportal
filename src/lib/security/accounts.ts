import { readJson, writeJson } from "@/lib/kv-json";
import {
  hasConfiguredSigningSecret,
  hashPassword,
  registrationInviteFor,
  timingSafeEqualString,
  verifyPassword,
} from "@/lib/security/crypto";

export interface ConsultantAccountRecord {
  email: string;
  name: string;
  salt: string;
  passwordHash: string;
  /** True after invite-verified registration or open-reg mode */
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

function key(email: string) {
  return `account:${email.trim().toLowerCase()}`;
}

export async function getAccount(email: string) {
  return readJson<ConsultantAccountRecord>(key(email));
}

/**
 * Open registration only when explicitly enabled, or when no durable signing
 * secret exists (sample/demo deploys). With a configured secret, require invite.
 */
export function openRegistrationAllowed() {
  if (process.env.ALLOW_OPEN_REGISTRATION === "1") return true;
  if (process.env.ALLOW_OPEN_REGISTRATION === "0") return false;
  if (!hasConfiguredSigningSecret()) return true;
  return false;
}

export async function registerAccount(input: {
  email: string;
  name: string;
  password: string;
  inviteCode?: string;
}): Promise<{ ok: true; account: ConsultantAccountRecord } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@") || input.password.trim().length < 8) {
    return {
      ok: false,
      error: "Valid email and password (8+ chars) required.",
    };
  }
  const existing = await getAccount(email);
  if (existing) {
    return {
      ok: false,
      error: "An account with this email already exists. Sign in instead.",
    };
  }

  const open = openRegistrationAllowed();
  const expectedInvite = registrationInviteFor(email);
  const provided = (input.inviteCode || "").trim();
  const inviteOk =
    Boolean(provided) &&
    provided.length === expectedInvite.length &&
    timingSafeEqualString(provided, expectedInvite);

  if (!open && !inviteOk) {
    return {
      ok: false,
      error:
        "Registration requires a valid invite code for this email.",
    };
  }

  const { hash, salt } = hashPassword(input.password.trim());
  const account: ConsultantAccountRecord = {
    email,
    name: input.name.trim() || email.split("@")[0],
    salt,
    passwordHash: hash,
    emailVerified: true,
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
  if (
    !account ||
    !verifyPassword(password.trim(), account.salt, account.passwordHash)
  ) {
    return { ok: false, error: "Invalid email or password." };
  }
  if (account.emailVerified === false) {
    return {
      ok: false,
      error: "Email not verified. Complete invite registration first.",
    };
  }
  return { ok: true, account };
}
