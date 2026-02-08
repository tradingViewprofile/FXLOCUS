import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-secret") === process.env.NEWS_CRON_SECRET;
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = supabaseAdmin();

  const body = await req.json().catch(() => ({}));
  const articleId = body.articleId as string | undefined;
  const status = body.status as string | undefined;
  const updates = body.updates as Record<string, unknown> | undefined;
  const scheduledAt = body.scheduledAt as string | null | undefined;

  if (!articleId) return NextResponse.json({ ok: false }, { status: 400 });

  const payload: Record<string, unknown> = { ...(updates || {}) };
  if (status) payload.status = status;
  if (scheduledAt !== undefined) payload.scheduled_at = scheduledAt;

  await sb.from("news_articles").update(payload).eq("id", articleId);
  return NextResponse.json({ ok: true }, { status: 200 });
}

