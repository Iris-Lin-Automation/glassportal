/**
 * Tiny JSON persistence: Upstash Redis REST when configured, else local files.
 * Plans stay durable on Vercel once KV env vars are set.
 */
import { promises as fs } from "fs";
import path from "path";

function kvUrl() {
  return (
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    ""
  ).replace(/\/$/, "");
}

function kvToken() {
  return (
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    ""
  );
}

export function hasRemoteKv() {
  return Boolean(kvUrl() && kvToken());
}

function fsPath(key: string) {
  const safe = key.replace(/[^a-zA-Z0-9._:-]/g, "_");
  const root = process.env.VERCEL
    ? path.join("/tmp", "glassportal-data")
    : path.join(process.cwd(), ".data");
  return path.join(root, `${safe}.json`);
}

async function kvCommand(cmd: string[]): Promise<unknown> {
  const url = kvUrl();
  const token = kvToken();
  if (!url || !token) return null;
  const res = await fetch(`${url}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`KV error ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { result?: unknown };
  return json.result ?? null;
}

export async function readJson<T>(key: string): Promise<T | null> {
  if (hasRemoteKv()) {
    try {
      const result = await kvCommand(["GET", key]);
      if (result == null) return null;
      if (typeof result === "string") {
        try {
          return JSON.parse(result) as T;
        } catch {
          return null;
        }
      }
      return result as T;
    } catch {
      /* fall through to fs */
    }
  }

  try {
    const raw = await fs.readFile(fsPath(key), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  const payload = JSON.stringify(value);

  if (hasRemoteKv()) {
    try {
      await kvCommand(["SET", key, payload]);
      return;
    } catch {
      /* fall through */
    }
  }

  const file = fsPath(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, payload, "utf8");
}
