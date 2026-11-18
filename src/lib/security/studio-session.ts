import { NextRequest, NextResponse } from "next/server";
import { hmacSign, timingSafeEqualString } from "@/lib/security/crypto";

export const SESSION_COOKIE = "gp_session";
const TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

/**
 * Pack as base64url(email|exp).sig so emails with dots never break parsing.
 * Legacy `email.exp.sig` (broken for dotted emails) is no longer accepted.
 */
function pack(email: string, exp: number): string {
  const body = Buffer.from(
    `${email.trim().toLowerCase()}|${exp}`,
    "utf8"
  ).toString("base64url");
  return `${body}.${hmacSign(body)}`;
}

export function createSessionValue(email: string): string {
  return pack(email.trim().toLowerCase(), Date.now() + TTL_MS);
}

export function readSessionEmail(raw?: string | null): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0 || dot === raw.length - 1) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!body || !sig) return null;
  const expected = hmacSign(body);
  if (!timingSafeEqualString(sig, expected)) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(body, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const sep = decoded.lastIndexOf("|");
  if (sep <= 0) return null;
  const email = decoded.slice(0, sep).trim().toLowerCase();
  const exp = Number(decoded.slice(sep + 1));
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  if (!email.includes("@") || email.includes("|")) return null;
  return email;
}

export function getSessionEmail(req: NextRequest): string | null {
  return readSessionEmail(req.cookies.get(SESSION_COOKIE)?.value);
}

export function requireSessionEmail(req: NextRequest): string | null {
  return getSessionEmail(req);
}

export function attachSessionCookie(res: NextResponse, email: string) {
  res.cookies.set(SESSION_COOKIE, createSessionValue(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
