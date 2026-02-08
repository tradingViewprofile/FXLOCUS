import { NextRequest, NextResponse } from "next/server";

import { getUniverse } from "@/lib/markets/universe";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get("category") || "all") as any;
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(200, Math.max(20, Number(searchParams.get("pageSize") || 80)));

  const all = getUniverse(category);
  const total = all.length;
  const start = (page - 1) * pageSize;
  const items = all.slice(start, start + pageSize);

  return NextResponse.json(
    { items, total, page, pageSize },
    { status: 200, headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
