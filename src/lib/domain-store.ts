import { readJson, writeJson } from "@/lib/kv-json";

export interface DomainBinding {
  hostname: string;
  pageId: string;
  ownerEmail: string;
  updatedAt: string;
}

const KEY = "domains";

async function readAll(): Promise<DomainBinding[]> {
  const parsed = await readJson<DomainBinding[]>(KEY);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeAll(list: DomainBinding[]) {
  await writeJson(KEY, list);
}

function normHost(host: string) {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

export async function findDomain(
  hostname: string
): Promise<DomainBinding | null> {
  const host = normHost(hostname);
  const all = await readAll();
  return all.find((d) => d.hostname === host) || null;
}

export async function bindDomain(
  hostname: string,
  pageId: string,
  ownerEmail: string
): Promise<DomainBinding> {
  const host = normHost(hostname);
  if (!host || host.includes("/") || /\s/.test(host)) {
    throw new Error("Enter a valid hostname like portal.youragency.com");
  }
  const email = ownerEmail.trim().toLowerCase();
  const next: DomainBinding = {
    hostname: host,
    pageId,
    ownerEmail: email,
    updatedAt: new Date().toISOString(),
  };
  const all = await readAll();
  const filtered = all.filter(
    (d) => d.hostname !== host && d.ownerEmail !== email
  );
  filtered.push(next);
  await writeAll(filtered);
  return next;
}
