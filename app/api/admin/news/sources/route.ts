import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-secret") === process.env.NEWS_CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = supabaseAdmin();
  const { data } = await sb.from("news_sources").select("*").order("created_at", { ascending: false });
  return NextResponse.json({ items: data || [] }, { status: 200 });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = supabaseAdmin();
  const body = await req.json().catch(() => ({}));
  const { data, error } = await sb.from("news_sources").insert(body).select("*").maybeSingle();
  if (error) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true, item: data }, { status: 200 });
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = supabaseAdmin();
  const body = await req.json().catch(() => ({}));
  const id = body.id as string | undefined;
  const updates = body.updates as Record<string, unknown> | undefined;
  if (!id || !updates) return NextResponse.json({ ok: false }, { status: 400 });

  const { data, error } = await sb.from("news_sources").update(updates).eq("id", id).select("*").maybeSingle();
  if (error) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true, item: data }, { status: 200 });
}

