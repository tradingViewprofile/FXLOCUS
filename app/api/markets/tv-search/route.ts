import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const lang = searchParams.get("lang") === "zh" ? "zh" : "en";

  if (!q || q.length < 2) {
    return NextResponse.json(
      { items: [] },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  }

  const url = `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(
    q
  )}&hl=1&lang=${lang}`;

  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "application/json"
    },
    cache: "no-store"
  });

  if (!res.ok) {
    return NextResponse.json(
      { items: [] },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  }

  const arr = await res.json();

  const items = (Array.isArray(arr) ? arr : []).slice(0, 30).map((item: any) => ({
    id: `${item?.exchange || "TV"}:${item?.symbol || item?.ticker || Math.random()}`,
    category: "all",
    symbolCode: String(item?.symbol || item?.ticker || "").toUpperCase(),
    nameZh: String(item?.description || item?.name || ""),
    nameEn: String(item?.description || item?.name || ""),
    tvSymbol: String(item?.full_name || `${item?.exchange}:${item?.symbol}`)
  }));

  return NextResponse.json(
    { items },
    { status: 200, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
