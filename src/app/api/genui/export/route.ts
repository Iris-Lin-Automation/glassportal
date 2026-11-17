import { NextRequest, NextResponse } from "next/server";
import {
  buildExportRecords,
  recordsToCsv,
} from "@/lib/genui/dashboard-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ownerKey = req.nextUrl.searchParams.get("ownerKey") || "*";
    const format = (req.nextUrl.searchParams.get("format") || "json").toLowerCase();
    const limit = Number(req.nextUrl.searchParams.get("limit") || "100");
    const rows = await buildExportRecords({
      ownerKey,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 300) : 100,
    });

    if (format === "csv") {
      const csv = recordsToCsv(rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="genui-eval-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      count: rows.length,
      rows,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Export failed" },
      { status: 500 }
    );
  }
}
