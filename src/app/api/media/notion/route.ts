import { NextRequest, NextResponse } from "next/server";
import { createNotionClient, normalizeId } from "@/lib/notion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractToken(req: NextRequest): string | undefined {
  const queryToken = req.nextUrl.searchParams.get("token");
  const candidates = [
    req.headers.get("x-notion-token"),
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, ""),
    req.nextUrl.searchParams.get("nt"),
    req.nextUrl.searchParams.get("ntoken"),
    // `token` is often the client access key — only accept Notion-shaped values
    queryToken && /^(secret_|ntn_)/i.test(queryToken) ? queryToken : null,
    process.env.NOTION_API_TOKEN,
  ];
  for (const c of candidates) {
    const v = c?.trim();
    if (v) return v;
  }
  return undefined;
}

function isNotionSignedUrl(url?: string | null) {
  if (!url) return false;
  return (
    /amazonaws\.com/i.test(url) ||
    /secure\.notion-static\.com/i.test(url) ||
    /prod-files-secure/i.test(url) ||
    /notion\.so\/image/i.test(url) ||
    /notion-static\.com/i.test(url)
  );
}

function isTrashed(block: Record<string, unknown>) {
  return Boolean(block.in_trash || block.archived);
}

function extractImageUrl(block: Record<string, unknown>): string | null {
  const type = String(block.type || "");
  const payload = block[type] as
    | {
        type?: string;
        file?: { url?: string };
        external?: { url?: string };
        file_upload?: { id?: string; url?: string };
        url?: string;
      }
    | undefined;

  if (!payload) return null;

  if (
    type === "image" ||
    type === "video" ||
    type === "pdf" ||
    type === "file" ||
    type === "audio"
  ) {
    if (payload.type === "external") return payload.external?.url || null;
    if (payload.type === "file") return payload.file?.url || null;
    if (payload.type === "file_upload") {
      return payload.file_upload?.url || payload.file?.url || null;
    }
    return (
      payload.external?.url ||
      payload.file?.url ||
      payload.file_upload?.url ||
      null
    );
  }

  return (
    payload.url ||
    payload.external?.url ||
    payload.file?.url ||
    payload.file_upload?.url ||
    null
  );
}

async function fetchUpstream(imageUrl: string) {
  return fetch(imageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; GlassPortalMediaProxy/1.1; +https://glassportal.app)",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
    cache: "no-store",
    redirect: "follow",
  });
}

/**
 * Proxy Notion images: re-issue a fresh signed URL via blocks.retrieve, then
 * stream bytes. Prefer x-notion-token header (not only query string).
 */
export async function GET(req: NextRequest) {
  try {
    const blockIdRaw = req.nextUrl.searchParams.get("blockId");
    const fallbackUrl = req.nextUrl.searchParams.get("url");
    const token = extractToken(req);

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Notion Integration Token required for media proxy. Re-open from Studio or ensure the share link includes nt=.",
        },
        { status: 401 }
      );
    }

    let imageUrl = "";
    let retrieveError = "";

    if (blockIdRaw) {
      try {
        const client = createNotionClient(token);
        const block = (await client.blocks.retrieve({
          block_id: normalizeId(blockIdRaw),
        })) as unknown as Record<string, unknown>;

        if (isTrashed(block)) {
          retrieveError = "Image block is archived/trashed";
        } else {
          const fresh = extractImageUrl(block);
          if (fresh) imageUrl = fresh;
          else
            retrieveError = `Block type "${String(block.type || "unknown")}" has no image URL`;
        }
      } catch (e) {
        retrieveError =
          e instanceof Error ? e.message : "blocks.retrieve failed";
      }
    }

    // Only allow non-Notion-S3 fallbacks (true external https images)
    if (!imageUrl && fallbackUrl && !isNotionSignedUrl(fallbackUrl)) {
      imageUrl = fallbackUrl;
    }

    // Last resort: allow a still-fresh signed URL if retrieve failed (e.g. race)
    if (!imageUrl && fallbackUrl && isNotionSignedUrl(fallbackUrl)) {
      imageUrl = fallbackUrl;
    }

    if (!imageUrl) {
      return NextResponse.json(
        {
          error:
            retrieveError ||
            "Image URL not found. Block may be archived or Integration lacks access.",
        },
        { status: 404 }
      );
    }

    let upstream = await fetchUpstream(imageUrl);

    // Signed URL may expire mid-flight — re-retrieve once
    if (!upstream.ok && blockIdRaw && token) {
      try {
        const client = createNotionClient(token);
        const block = (await client.blocks.retrieve({
          block_id: normalizeId(blockIdRaw),
        })) as unknown as Record<string, unknown>;
        const fresh = !isTrashed(block) ? extractImageUrl(block) : null;
        if (fresh && fresh !== imageUrl) {
          imageUrl = fresh;
          upstream = await fetchUpstream(imageUrl);
        }
      } catch {
        /* keep original upstream failure */
      }
    }

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: `Upstream image fetch failed (${upstream.status})`,
        },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/png";
    // Guard: Notion sometimes returns XML/HTML error bodies with 200
    if (/text\/html|application\/json|text\/xml|application\/xml/i.test(contentType)) {
      return NextResponse.json(
        { error: `Upstream returned non-image content-type (${contentType})` },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (!buffer.length) {
      return NextResponse.json({ error: "Empty image payload" }, { status: 502 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType.startsWith("image/")
          ? contentType
          : "image/png",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Media proxy failed",
      },
      { status: 500 }
    );
  }
}
