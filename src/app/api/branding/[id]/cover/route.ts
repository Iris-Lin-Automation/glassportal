import { NextRequest, NextResponse } from "next/server";
import { resolveNotionPageId } from "@/lib/notion";
import { loadBranding } from "@/lib/branding-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Raster covers only — never SVG. */
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pageId = resolveNotionPageId(decodeURIComponent(params.id));
    const branding = await loadBranding(pageId);
    if (branding?.hideCover) {
      return NextResponse.json({ error: "Cover hidden" }, { status: 404 });
    }
    const dataUrl = branding?.coverDataUrl;
    if (!dataUrl?.startsWith("data:")) {
      return NextResponse.json({ error: "Cover not found" }, { status: 404 });
    }

    const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
    if (!match) {
      return NextResponse.json({ error: "Invalid cover data" }, { status: 400 });
    }

    const rawType = (match[1] || "image/jpeg").toLowerCase().trim();
    if (!ALLOWED.has(rawType) || rawType.includes("svg")) {
      return NextResponse.json(
        { error: "Unsupported cover type" },
        { status: 400 }
      );
    }
    const contentType = rawType === "image/jpg" ? "image/jpeg" : rawType;
    const buffer = Buffer.from(match[2], "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": "public, max-age=60, must-revalidate",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to serve cover";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
