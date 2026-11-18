import { NextRequest, NextResponse } from "next/server";
import { hmacSign, timingSafeEqualString } from "@/lib/security/crypto";

export const SESSION_COOKIE = "gp_session";
const TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function pack(email: string, exp: number): string {
  const payload = `${email.toLowerCase()}.${exp}`;
  return `${payload}.${hmacSign(payload)}`;
}

export function createSessionValue(email: string): string {
  return pack(email.trim().toLowerCase(), Date.now() + TTL_MS);
}

export function readSessionEmail(raw?: string | null): string | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [email, expStr, sig] = parts;
  const payload = `${email}.${expStr}`;
  const expected = hmacSign(payload);
  if (!timingSafeEqualString(sig, expected)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  if (!email.includes("@")) return null;
  return email.toLowerCase();
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
