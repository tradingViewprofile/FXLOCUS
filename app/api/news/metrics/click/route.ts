import { NextRequest, NextResponse } from "next/server";

import { dbFirst, dbRun } from "@/lib/db/d1";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as any;
  const articleId = String(body.articleId || "").trim();
  if (!articleId) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const row = await dbFirst<{ views: number; clicks: number; avg_dwell_seconds: number }>(
      `select views, clicks, avg_dwell_seconds from news_metrics where article_id = ? limit 1`,
      [articleId]
    );
    const now = new Date().toISOString();

    if (!row) {
      await dbRun(
        `insert into news_metrics (article_id, views, clicks, avg_dwell_seconds, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?)`,
        [articleId, 0, 1, 0, now, now]
      );
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const clicks = Number(row.clicks || 0) + 1;
    await dbRun(
      `update news_metrics set clicks = ?, updated_at = ? where article_id = ?`,
      [clicks, now, articleId]
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}


