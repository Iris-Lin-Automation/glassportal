import { isIP } from "net";

const BLOCKED_HOST_RE =
  /^(localhost|127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|::1|\[::1\])/i;

export function isNotionMediaHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h.endsWith("amazonaws.com") ||
    h.endsWith("notion-static.com") ||
    h === "www.notion.so" ||
    h === "notion.so" ||
    h.endsWith(".notion.so")
  );
}

export function isSafePublicHttpsUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  const host = u.hostname;
  if (BLOCKED_HOST_RE.test(host)) return false;
  if (isIP(host)) {
    // Block literal IPs (metadata / private ranges)
    if (
      host.startsWith("10.") ||
      host.startsWith("127.") ||
      host.startsWith("169.254.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      host === "::1"
    ) {
      return false;
    }
  }
  return isNotionMediaHost(host);
}

export function isNotionSignedUrl(url?: string | null) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return isNotionMediaHost(u.hostname) && isSafePublicHttpsUrl(url);
  } catch {
    return false;
  }
}
