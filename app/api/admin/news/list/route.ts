import { NextRequest, NextResponse } from "next/server";

import { dbAll, dbFirst } from "@/lib/db/d1";

export const runtime = "nodejs";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-secret") === process.env.NEWS_CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const { searchParams } = new URL(req.url);

  const status = String(searchParams.get("status") || "pending").trim();
  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(50, Math.max(10, Number(searchParams.get("pageSize") || 20)));
  const from = (page - 1) * pageSize;

  const whereParts: string[] = ["a.status = ?"];
  const bind: any[] = [status];
  if (q.length >= 2) {
    whereParts.push("(lower(a.title_en) like lower(?) or lower(a.title_zh) like lower(?))");
    const pat = `%${q}%`;
    bind.push(pat, pat);
  }
  const whereSql = `where ${whereParts.join(" and ")}`;

  const countRow = await dbFirst<{ c: number }>(
    `select count(*) as c from news_articles a ${whereSql}`,
    bind
  );
  const total = Number(countRow?.c || 0);

  const rows = await dbAll<any>(
    `select
       a.id,
       a.slug,
       a.url,
       a.title_en,
       a.title_zh,
       a.summary_en,
       a.summary_zh,
       a.author,
       a.published_at,
       a.category,
       a.importance,
       a.sentiment,
       a.symbols_json,
       a.status,
       a.scheduled_at,
       s.name as source_name,
       s.logo_url as source_logo_url,
       m.views as views,
       m.clicks as clicks,
       m.avg_dwell_seconds as avg_dwell_seconds
     from news_articles a
     left join news_sources s on s.id = a.source_id
     left join news_metrics m on m.article_id = a.id
     ${whereSql}
     order by a.created_at desc
     limit ? offset ?`,
    [...bind, pageSize, from]
  );

  const items = (rows || []).map((item: any) => ({
    id: item.id,
    slug: item.slug,
    url: item.url,
    title_en: item.title_en,
    title_zh: item.title_zh,
    summary_en: item.summary_en,
    summary_zh: item.summary_zh,
    author: item.author,
    published_at: item.published_at,
    category: item.category,
    importance: item.importance,
    sentiment: item.sentiment,
    symbols: parseJsonArray(item.symbols_json),
    status: item.status,
    scheduled_at: item.scheduled_at,
    news_sources: { name: item.source_name, logo_url: item.source_logo_url },
    news_metrics: {
      views: Number(item.views || 0),
      clicks: Number(item.clicks || 0),
      avg_dwell_seconds: Number(item.avg_dwell_seconds || 0)
    }
  }));

  return NextResponse.json({ items, total }, { status: 200 });
}

function parseJsonArray(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}


