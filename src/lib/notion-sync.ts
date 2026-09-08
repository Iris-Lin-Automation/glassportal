import type { Client } from "@notionhq/client";

type PropMap = Record<string, { type?: string; [key: string]: unknown }>;

function findPropKey(properties: PropMap, names: string[]): string | null {
  const entries = Object.entries(properties);
  for (const name of names) {
    const hit = entries.find(([k]) => k.toLowerCase() === name.toLowerCase());
    if (hit) return hit[0];
  }
  for (const name of names) {
    const hit = entries.find(([k]) =>
      k.toLowerCase().includes(name.toLowerCase())
    );
    if (hit) return hit[0];
  }
  return null;
}

function buildPropertyUpdate(
  prop: { type?: string },
  value: string,
  checkboxValue = true
): Record<string, unknown> | null {
  switch (prop.type) {
    case "status":
      return { status: { name: value } };
    case "select":
      return { select: { name: value } };
    case "rich_text":
      return {
        rich_text: [{ type: "text", text: { content: value.slice(0, 1900) } }],
      };
    case "number": {
      const n = Number(value);
      return Number.isFinite(n) ? { number: n } : null;
    }
    case "date":
      return { date: { start: new Date().toISOString() } };
    case "checkbox":
      return { checkbox: checkboxValue };
    default:
      return null;
  }
}

export interface SyncPayload {
  action: "confirm" | "unconfirm" | "progress" | "view";
  progress?: number;
  note?: string;
}

/**
 * Write portal engagement back into Notion (status + timeline callout).
 * Read path remains fetchPortalData — this is the write half of bidirectional sync.
 */
export async function syncPortalToNotion(
  client: Client,
  pageId: string,
  payload: SyncPayload
): Promise<{ updated: string[]; appended: boolean }> {
  const page = (await client.pages.retrieve({
    page_id: pageId,
  })) as unknown as { properties?: PropMap };

  const properties = page.properties || {};
  const updates: Record<string, unknown> = {};
  const updated: string[] = [];

  if (payload.action === "confirm" || payload.action === "unconfirm") {
    const confirming = payload.action === "confirm";
    const statusKey = findPropKey(properties, [
      "Status",
      "Stage",
      "Portal Status",
      "Delivery Status",
    ]);
    if (statusKey && properties[statusKey]) {
      const patch = buildPropertyUpdate(
        properties[statusKey],
        confirming ? "Confirmed" : "Proposal Ready"
      );
      if (patch) {
        updates[statusKey] = patch;
        updated.push(statusKey);
      }
    }

    const signedKey = findPropKey(properties, [
      "Signed",
      "Confirmed",
      "Client Confirmed",
    ]);
    if (signedKey && properties[signedKey]?.type === "checkbox") {
      updates[signedKey] = { checkbox: confirming };
      updated.push(signedKey);
    }
  }

  if (payload.action === "progress" && typeof payload.progress === "number") {
    const progressKey = findPropKey(properties, [
      "Read Progress",
      "Progress",
      "View Progress",
      "Reading",
    ]);
    if (progressKey && properties[progressKey]) {
      const prop = properties[progressKey];
      const value =
        prop.type === "number"
          ? String(Math.round(payload.progress))
          : `${Math.round(payload.progress)}%`;
      const patch = buildPropertyUpdate(prop, value);
      if (patch) {
        updates[progressKey] = patch;
        updated.push(progressKey);
      }
    }

    const viewedKey = findPropKey(properties, [
      "Last Viewed",
      "Last Opened",
      "Viewed At",
    ]);
    if (viewedKey && properties[viewedKey]?.type === "date") {
      updates[viewedKey] = { date: { start: new Date().toISOString() } };
      updated.push(viewedKey);
    }
  }

  if (Object.keys(updates).length > 0) {
    await client.pages.update({
      page_id: pageId,
      properties: updates as Parameters<Client["pages"]["update"]>[0]["properties"],
    });
  }

  // Do NOT append audit callouts into the page body — they would show up in the
  // client portal when content is re-fetched. Engagement is written to properties
  // only (Status / Signed / Read Progress / Last Viewed) for consultant Notion view.
  return { updated, appended: false };
}
