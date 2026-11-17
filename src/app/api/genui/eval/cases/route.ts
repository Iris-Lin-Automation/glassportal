import { NextResponse } from "next/server";
import { listEvalCases } from "@/lib/genui/eval-cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cases = listEvalCases();
  return NextResponse.json({
    count: cases.length,
    cases,
  });
}
