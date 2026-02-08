import { NextResponse } from "next/server";

import { dbFirst } from "@/lib/db/d1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const sources = await dbFirst<{ c: number }>(`select count(*) as c from news_sources`);
  const articles = await dbFirst<{ c: number }>(`select count(*) as c from news_articles`);
  const published = await dbFirst<{ c: number }>(
    `select count(*) as c from news_articles where status = ?`,
    ["published"]
  );

  return NextResponse.json({
    ok: true,
    sourcesCount: Number(sources?.c || 0),
    articlesCount: Number(articles?.c || 0),
    publishedCount: Number(published?.c || 0),
    env: {
      hasOpenAI
    }
  });
}

