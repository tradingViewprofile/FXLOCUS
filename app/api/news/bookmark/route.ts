import { NextRequest, NextResponse } from "next/server";

import { requireSystemUser } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireSystemUser();
    const { searchParams } = new URL(req.url);
    const articleId = String(searchParams.get("articleId") || "").trim();
    if (!articleId) return NextResponse.json({ ok: false }, { status: 400 });

    const db = supabaseAdmin();
    const { data } = await db
      .from("news_bookmarks")
      .select("article_id")
      .eq("user_id", user.id)
      .eq("article_id", articleId)
      .maybeSingle();
    return NextResponse.json({ ok: true, bookmarked: Boolean(data?.article_id) }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: true, bookmarked: false }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as any;
  const articleId = String(body.articleId || "").trim();
  const action = String(body.action || "").trim();
  if (!articleId) return NextResponse.json({ ok: false }, { status: 400 });

  const { user } = await requireSystemUser();
  const db = supabaseAdmin();

  if (action === "remove") {
    await db.from("news_bookmarks").delete().eq("user_id", user.id).eq("article_id", articleId);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  await db
    .from("news_bookmarks")
    .upsert({ user_id: user.id, article_id: articleId }, { onConflict: "user_id,article_id" });
  return NextResponse.json({ ok: true }, { status: 200 });
}

