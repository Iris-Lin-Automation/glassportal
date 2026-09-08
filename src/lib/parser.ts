import type { Client } from "@notionhq/client";
import { listAllBlockChildren } from "./notion";
import { isInternalSyncCallout } from "./sync-markers";
import type { NotionParsedBlock, PortalData } from "./types";

type RichText = Array<{ plain_text?: string }>;

function plain(rt?: RichText): string {
  if (!rt?.length) return "";
  return rt.map((t) => t.plain_text || "").join("").trim();
}

function fileUrl(
  file:
    | {
        type?: string;
        name?: string;
        file?: { url?: string };
        external?: { url?: string };
        file_upload?: { id?: string; url?: string };
      }
    | null
    | undefined
): string | undefined {
  if (!file) return undefined;
  if (file.type === "external") return file.external?.url;
  if (file.type === "file") return file.file?.url;
  // Some API responses expose a direct url on file_upload after attach
  if (file.type === "file_upload") {
    return file.file_upload?.url || file.file?.url || file.external?.url;
  }
  return file.external?.url || file.file?.url || file.file_upload?.url;
}

function iconEmojiOrUrl(icon: unknown): string | undefined {
  if (!icon || typeof icon !== "object") return undefined;
  const i = icon as {
    type?: string;
    emoji?: string;
    file?: { url?: string };
    external?: { url?: string };
  };
  if (i.type === "emoji") return i.emoji;
  return i.external?.url || i.file?.url;
}

function propPlain(prop: unknown): string | undefined {
  if (!prop || typeof prop !== "object") return undefined;
  const p = prop as Record<string, unknown>;
  switch (p.type) {
    case "title":
      return plain(p.title as RichText) || undefined;
    case "rich_text":
      return plain(p.rich_text as RichText) || undefined;
    case "select":
      return (p.select as { name?: string } | null)?.name;
    case "status":
      return (p.status as { name?: string } | null)?.name;
    case "multi_select":
      return ((p.multi_select as Array<{ name: string }>) || [])
        .map((x) => x.name)
        .join(", ");
    case "people":
      return ((p.people as Array<{ name?: string }>) || [])
        .map((x) => x.name || "Person")
        .join(", ");
    case "url":
      return (p.url as string) || undefined;
    case "email":
      return (p.email as string) || undefined;
    case "phone_number":
      return (p.phone_number as string) || undefined;
    case "number":
      return p.number != null ? String(p.number) : undefined;
    case "checkbox":
      return p.checkbox ? "Yes" : "No";
    default:
      return undefined;
  }
}

function findProp(
  properties: Record<string, unknown>,
  names: string[]
): string | undefined {
  const entries = Object.entries(properties);
  for (const name of names) {
    const hit = entries.find(([k]) => k.toLowerCase() === name.toLowerCase());
    if (hit) {
      const v = propPlain(hit[1]);
      if (v) return v;
    }
  }
  // fuzzy contains
  for (const name of names) {
    const hit = entries.find(([k]) =>
      k.toLowerCase().includes(name.toLowerCase())
    );
    if (hit) {
      const v = propPlain(hit[1]);
      if (v) return v;
    }
  }
  return undefined;
}

function parseBlock(block: Record<string, unknown>): NotionParsedBlock | null {
  const id = String(block.id);
  const type = String(block.type);
  const payload = block[type] as Record<string, unknown> | undefined;

  switch (type) {
    case "heading_1":
    case "heading_2":
    case "heading_3":
      return {
        id,
        type: "heading",
        content: plain(payload?.rich_text as RichText),
        metadata: {
          level: type === "heading_1" ? 1 : type === "heading_2" ? 2 : 3,
        },
      };
    case "paragraph": {
      const content = plain(payload?.rich_text as RichText);
      if (!content) return null;
      return { id, type: "paragraph", content };
    }
    case "bulleted_list_item":
    case "numbered_list_item":
      return {
        id,
        type: "list",
        content: plain(payload?.rich_text as RichText),
        metadata: {
          style: type === "numbered_list_item" ? "numbered" : "bulleted",
        },
      };
    case "to_do":
      return {
        id,
        type: "list",
        content: plain(payload?.rich_text as RichText),
        metadata: {
          style: "todo",
          checked: Boolean(payload?.checked),
        },
      };
    case "callout": {
      const content = plain(payload?.rich_text as RichText);
      // Hide backend audit logs from the client-facing portal
      if (isInternalSyncCallout(content)) return null;
      return {
        id,
        type: "callout",
        content,
        metadata: {
          icon: iconEmojiOrUrl(payload?.icon) || "💡",
          color: payload?.color,
        },
      };
    }
    case "toggle":
      return {
        id,
        type: "toggle",
        content: plain(payload?.rich_text as RichText),
        metadata: { open: false },
      };
    case "quote":
      return {
        id,
        type: "quote",
        content: plain(payload?.rich_text as RichText),
      };
    case "code":
      return {
        id,
        type: "code",
        content: plain(payload?.rich_text as RichText),
        metadata: { language: payload?.language || "plain text" },
      };
    case "divider":
      return { id, type: "divider", content: "" };
    case "image": {
      const rawUrl = fileUrl(
        payload as {
          type?: string;
          file?: { url?: string };
          external?: { url?: string };
          file_upload?: { id?: string; url?: string };
        }
      );
      const caption = plain(payload?.caption as RichText);
      const source = (payload as { type?: string })?.type || "file";
      // External URLs load directly. Notion file URLs expire (~1h) — frontend
      // always prefers /api/media/notion?blockId=… and only uses rawUrl as fallback.
      return {
        id,
        type: "image",
        content: caption || "Image",
        url: rawUrl,
        metadata: {
          source,
          caption,
          proxied: source !== "external",
        },
      };
    }
    case "file":
    case "pdf":
    case "video":
    case "audio": {
      const url = fileUrl(
        payload as {
          type?: string;
          name?: string;
          file?: { url?: string };
          external?: { url?: string };
          file_upload?: { id?: string; url?: string };
        }
      );
      const caption = plain(payload?.caption as RichText);
      const name =
        (typeof payload?.name === "string" && payload.name) ||
        caption ||
        (type === "pdf" ? "PDF attachment" : "Attachment");
      if (!url) {
        // Still show a label so pasted files aren't silently dropped
        return {
          id,
          type: "bookmark",
          content: name,
          metadata: { source: type, caption: name, title: name },
        };
      }
      if (
        type === "file" &&
        /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(url + name)
      ) {
        return {
          id,
          type: "image",
          content: caption || name,
          url,
          metadata: { source: type, caption: caption || name, proxied: true },
        };
      }
      return {
        id,
        type: type === "video" ? "embed" : "bookmark",
        content: caption || name,
        url,
        metadata: {
          source: type,
          caption: caption || name,
          title: name,
        },
      };
    }
    case "bookmark":
    case "embed":
    case "link_preview": {
      const url =
        (payload?.url as string | undefined) ||
        fileUrl(
          payload as {
            type?: string;
            file?: { url?: string };
            external?: { url?: string };
            file_upload?: { id?: string; url?: string };
          }
        );
      const caption = plain(
        (payload?.caption as RichText) || (payload?.rich_text as RichText)
      );
      if (!url) return null;

      // Image-looking bookmarks still go through image pipeline when possible
      if (/\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(url)) {
        return {
          id,
          type: "image",
          content: caption || "Image",
          url,
          metadata: { source: type, caption },
        };
      }

      // Premium Stripe-style external resource card
      return {
        id,
        type: type === "embed" ? "embed" : "bookmark",
        content: caption || url,
        url,
        metadata: {
          source: type,
          caption,
          title: caption || undefined,
        },
      };
    }
    case "table":
      return {
        id,
        type: "table",
        content: "Table",
        metadata: {
          table_width: payload?.table_width,
          has_column_header: Boolean(payload?.has_column_header),
          has_row_header: Boolean(payload?.has_row_header),
        },
      };
    case "table_row": {
      const cellsRaw =
        (payload?.cells as Array<Array<{ plain_text?: string }>> | undefined) ||
        [];
      const cells = cellsRaw.map((cell) => plain(cell));
      return {
        id,
        type: "table_row",
        content: cells.join(" | "),
        cells,
      };
    }
    case "child_page":
      return {
        id,
        type: "card_grid",
        content: String((payload as { title?: string })?.title || "Sub-page"),
        metadata: { kind: "child_page" },
      };
    default:
      return null;
  }
}

async function walkBlocks(
  client: Client,
  blockId: string,
  depth = 0
): Promise<NotionParsedBlock[]> {
  if (depth > 4) return [];
  const raw = await listAllBlockChildren(client, blockId);
  const out: NotionParsedBlock[] = [];

  for (const item of raw) {
    if (!("type" in item)) continue;
    const parsed = parseBlock(item as unknown as Record<string, unknown>);
    if (!parsed) {
      // column_list / column / synced_block etc. → flatten children into the stream
      if ("has_children" in item && item.has_children) {
        const nested = await walkBlocks(client, item.id, depth + 1);
        out.push(...nested);
      }
      continue;
    }

    if (
      "has_children" in item &&
      item.has_children &&
      (parsed.type === "toggle" ||
        parsed.type === "callout" ||
        parsed.type === "list" ||
        parsed.type === "table")
    ) {
      parsed.children = await walkBlocks(client, item.id, depth + 1);
    }

    // Skip orphan table_row at top level (should only nest under table)
    if (parsed.type === "table_row" && depth === 0) continue;

    out.push(parsed);
  }

  return out;
}

function extractPageTitle(page: Record<string, unknown>): string {
  const props = (page.properties || {}) as Record<string, unknown>;
  for (const value of Object.values(props)) {
    if (
      value &&
      typeof value === "object" &&
      (value as { type?: string }).type === "title"
    ) {
      const t = propPlain(value);
      if (t) return t;
    }
  }
  // Some page payloads expose a top-level plain title string
  if (typeof page.title === "string" && page.title.trim()) {
    return page.title.trim();
  }
  return "";
}

/**
 * Fetch a Notion page and normalize into GlassPortal JSON.
 */
export async function fetchPortalData(
  client: Client,
  pageId: string
): Promise<PortalData> {
  const page = (await client.pages.retrieve({
    page_id: pageId,
  })) as unknown as Record<string, unknown>;

  if (page.object !== "page") {
    throw new Error("The provided id is not a Notion page.");
  }

  const properties = (page.properties || {}) as Record<string, unknown>;
  const title = extractPageTitle(page);
  const badge =
    findProp(properties, ["Badge", "Tag", "Label", "Type", "Category"]) ||
    "Executive Strategy Brief";
  const clientName =
    findProp(properties, [
      "Client",
      "Client Name",
      "Company",
      "Account",
      "Agency",
    ]) || "Acme Corporation";
  const preparedFor =
    findProp(properties, [
      "Prepared for",
      "Prepared For",
      "Recipient",
      "Contact",
      "Stakeholder",
    ]) || "Acme Corporation Executive Committee";
  const description =
    findProp(properties, [
      "Description",
      "Summary",
      "Subtitle",
      "Overview",
    ]) ||
    "Prepared for: Acme Corporation Executive Committee — a board-ready GTM and revenue expansion plan for Q3 2026.";
  const password = findProp(properties, [
    "Password",
    "Access Key",
    "Portal Password",
    "Key",
  ]);
  const statusRaw = findProp(properties, ["Status", "Stage"]);
  const status =
    statusRaw?.toLowerCase().includes("encrypt") || password
      ? "encrypted"
      : statusRaw?.toLowerCase().includes("draft")
        ? "draft"
        : "active";
  const statusLabel =
    status === "encrypted"
      ? "Confidential Delivery"
      : status === "draft"
        ? "Draft in Review"
        : statusRaw || "Proposal Ready";

  // Prefer real Notion title; only fall back to executive template when empty
  const resolvedTitle =
    title.trim() ||
    "2026 Q3 B2B Go-To-Market & Revenue Expansion Strategy";

  const stats = [
    {
      label: "Target ARR Impact",
      value:
        findProp(properties, [
          "ARR",
          "Target ARR",
          "ARR Impact",
          "MRR",
          "Revenue",
        ]) || "$5.2M",
      status:
        findProp(properties, ["ARR Status", "Metric Status", "Status"]) ||
        "On track",
    },
    {
      label: "Payback Period",
      value:
        findProp(properties, [
          "Payback",
          "Payback Period",
          "ROI Payback",
        ]) || "4.2 Months",
      status: findProp(properties, ["Payback Status"]) || undefined,
    },
    {
      label: "Focus Channel",
      value:
        findProp(properties, [
          "Channel",
          "Focus Channel",
          "Acquisition",
          "GTM",
          "Primary Channel",
        ]) || "Enterprise ABM & Outbound",
      status: findProp(properties, ["Channel Status"]) || undefined,
    },
  ];

  const blocks = await walkBlocks(client, pageId);

  return {
    id: String(page.id),
    title: resolvedTitle,
    icon: iconEmojiOrUrl(page.icon),
    coverUrl: fileUrl(
      page.cover as {
        type?: string;
        file?: { url?: string };
        external?: { url?: string };
      } | null
    ),
    badge,
    clientName,
    preparedFor,
    description,
    status,
    statusLabel,
    password,
    updatedAt: String(
      page.last_edited_time || page.created_time || new Date().toISOString()
    ),
    stats,
    blocks,
  };
}
