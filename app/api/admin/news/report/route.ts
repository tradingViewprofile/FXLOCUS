import { NextRequest, NextResponse } from "next/server";

import { dbAll } from "@/lib/db/d1";

export const runtime = "nodejs";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-secret") === process.env.NEWS_CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const metrics = await dbAll<{
    views: number | null;
    clicks: number | null;
    avg_dwell_seconds: number | null;
    article_id: string;
    category: string | null;
    slug: string | null;
    title_en: string | null;
    title_zh: string | null;
  }>(
    `select
       m.views,
       m.clicks,
       m.avg_dwell_seconds,
       m.article_id,
       a.category,
       a.slug,
       a.title_en,
       a.title_zh
     from news_metrics m
     left join news_articles a on a.id = m.article_id
     limit 5000`
  );

  const totals = { views: 0, clicks: 0, avgDwell: 0, ctr: 0 };

  const categoryMap = new Map<
    string,
    { category: string; views: number; clicks: number; avgDwell: number; ctr: number }
  >();

  const articles = metrics.map((row) => {
    const views = Number(row.views || 0);
    const clicks = Number(row.clicks || 0);
    const avg = Number(row.avg_dwell_seconds || 0);
    const category = row.category || "unknown";
    const title = row.title_zh || row.title_en || "Untitled";

    totals.views += views;
    totals.clicks += clicks;
    totals.avgDwell += avg * views;

    const current = categoryMap.get(category) || {
      category,
      views: 0,
      clicks: 0,
      avgDwell: 0,
      ctr: 0
    };
    current.views += views;
    current.clicks += clicks;
    current.avgDwell += avg * views;
    categoryMap.set(category, current);

    return {
      articleId: row.article_id,
      slug: row.slug,
      title,
      views,
      clicks,
      avgDwellSeconds: avg,
      ctr: views > 0 ? clicks / views : 0
    };
  });

  totals.ctr = totals.views > 0 ? totals.clicks / totals.views : 0;
  totals.avgDwell = totals.views > 0 ? totals.avgDwell / totals.views : 0;

  const categories = Array.from(categoryMap.values()).map((item) => ({
    ...item,
    avgDwell: item.views > 0 ? item.avgDwell / item.views : 0,
    ctr: item.views > 0 ? item.clicks / item.views : 0
  }));

  articles.sort((a, b) => b.views - a.views);
  categories.sort((a, b) => b.views - a.views);

  return NextResponse.json(
    {
      totals,
      topArticles: articles.slice(0, 10),
      categories
    },
    { status: 200 }
  );
}


