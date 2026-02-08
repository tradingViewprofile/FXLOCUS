import { NextResponse } from "next/server";
import { fetchRssItems } from "@/lib/news/rss";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const items = await fetchRssItems({
    category,
    from: fromParam,
    to: toParam
  });

  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
