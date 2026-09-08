import { NextRequest, NextResponse } from "next/server";
import { resolveNotionPageId } from "@/lib/notion";
import { loadBranding } from "@/lib/branding-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Serve saved client logo bytes for favicon / <img> on share links. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pageId = resolveNotionPageId(decodeURIComponent(params.id));
    const branding = await loadBranding(pageId);
    const dataUrl = branding?.logoDataUrl;
    if (!dataUrl?.startsWith("data:")) {
      return NextResponse.json({ error: "Logo not found" }, { status: 404 });
    }

    const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
    if (!match) {
      return NextResponse.json({ error: "Invalid logo data" }, { status: 400 });
    }

    const contentType = match[1] || "image/png";
    const buffer = Buffer.from(match[2], "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Allow short cache but always revalidate — favicon must survive refresh
        "Cache-Control": "public, max-age=60, must-revalidate",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to serve logo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
