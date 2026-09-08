import { Client, extractNotionId, extractPageId } from "@notionhq/client";

/** Create a Notion client from explicit token or env fallback. */
export function createNotionClient(token?: string): Client {
  const auth = (token || process.env.NOTION_API_TOKEN || "").trim();
  if (!auth) {
    throw new Error(
      "Missing Notion token. Provide an Integration Token or set NOTION_API_TOKEN."
    );
  }
  return new Client({ auth });
}

/**
 * Pull a 32-char Notion page id from any common link shape:
 * - raw UUID / 32-hex
 * - notion.so/Title-32hex
 * - notion.so/p/32hex or notion.so/p/Title-32hex
 * - workspace URLs with ?v= / ?p= query params
 */
export function extractPageIdFromInput(urlOrId: string): string | null {
  const raw = urlOrId.trim();
  if (!raw) return null;

  // Pure id (dashed or compact)
  const compactOnly = raw.replace(/-/g, "");
  if (/^[0-9a-fA-F]{32}$/.test(compactOnly) && !/[/?#]/.test(raw)) {
    return compactOnly.toLowerCase();
  }

  // Prefer explicit query page refs (?p= / ?page_id=)
  try {
    const href = raw.includes("://")
      ? raw
      : raw.startsWith("www.")
        ? `https://${raw}`
        : null;
    if (href) {
      const u = new URL(href);
      for (const key of ["p", "page_id", "pageId"]) {
        const q = u.searchParams.get(key);
        if (q) {
          const hex = q.replace(/-/g, "");
          if (/^[0-9a-fA-F]{32}$/i.test(hex)) return hex.toLowerCase();
        }
      }
    }
  } catch {
    /* not a URL — continue */
  }

  // Strip query + hash so ?v= never breaks path parsing
  const pathOnly = raw.split(/[?#]/)[0];

  // Standard dashed UUID anywhere
  const dashed = pathOnly.match(
    /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/
  );
  if (dashed?.[1]) return dashed[1].replace(/-/g, "").toLowerCase();

  // Last 32 consecutive hex digits in the path (covers Title-32hex and /p/32hex)
  const compactRe = /([0-9a-fA-F]{32})/gi;
  let compactLast: string | null = null;
  let compactHit: RegExpExecArray | null;
  while ((compactHit = compactRe.exec(pathOnly)) !== null) {
    compactLast = compactHit[1];
  }
  if (compactLast) return compactLast.toLowerCase();

  // Last path segment may be Title-with-dashes + trailing 32 hex (hyphens inside id)
  const segment = pathOnly.split("/").filter(Boolean).pop() || "";
  const segHex = segment.replace(/[^0-9a-fA-F]/gi, "");
  if (segHex.length >= 32) {
    return segHex.slice(-32).toLowerCase();
  }

  return null;
}

/** Normalize Notion page/database URL or raw id into dashed UUID. */
export function resolveNotionPageId(urlOrId: string): string {
  const raw = urlOrId.trim();
  if (!raw) throw new Error("Notion Page ID / URL is required.");

  // Custom extractor first — covers /p/ and ?v= links the SDK often misses
  const extracted = extractPageIdFromInput(raw);
  if (extracted) return normalizeId(extracted);

  try {
    const fromPage = extractPageId(raw);
    if (fromPage) return normalizeId(fromPage);
  } catch {
    /* ignore */
  }

  try {
    const fromAny = extractNotionId(raw);
    if (fromAny) return normalizeId(fromAny);
  } catch {
    /* ignore */
  }

  throw new Error("Could not parse a valid Notion page id from the input.");
}

export function normalizeId(id: string): string {
  const hex = id.replace(/-/g, "").toLowerCase();
  if (hex.length !== 32) return id;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function listAllBlockChildren(client: Client, blockId: string) {
  const results: Awaited<
    ReturnType<typeof client.blocks.children.list>
  >["results"] = [];
  let cursor: string | undefined;

  do {
    const page = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    results.push(...page.results);
    cursor = page.has_more && page.next_cursor ? page.next_cursor : undefined;
  } while (cursor);

  return results;
}
