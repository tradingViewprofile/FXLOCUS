import { NextResponse } from "next/server";

import { requireSystemUser } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  try {
    const { user } = await requireSystemUser();
    const admin = supabaseAdmin();
    const { data: rows, error: listErr } = await admin
      .from("notifications")
      .select("id,from_user_id,title,content,created_at")
      .eq("to_user_id", user.id)
      .is("read_at", null)
      .limit(1000);
    if (listErr) return json({ ok: false, error: listErr.message }, 500);
    if (!rows || !rows.length) return json({ ok: true });

    const now = new Date().toISOString();
    const groups = new Map<string, { from_user_id: string | null; title: string; content: string; created_at: string }>();
    rows.forEach((row: any) => {
      const key = `${row.from_user_id || ""}::${row.title}::${row.content}::${row.created_at}`;
      if (!groups.has(key)) {
        groups.set(key, {
          from_user_id: row.from_user_id || null,
          title: row.title,
          content: row.content,
          created_at: row.created_at
        });
      }
    });

    const updates = Array.from(groups.values()).map((group) => {
      let query = admin
        .from("notifications")
        .update({ read_at: now } as any)
        .eq("title", group.title)
        .eq("content", group.content)
        .eq("created_at", group.created_at);
      query = group.from_user_id ? query.eq("from_user_id", group.from_user_id) : query.is("from_user_id", null);
      return query;
    });
    const results = await Promise.all(updates);
    const failed = results.find((res) => res.error);
    if (failed?.error) return json({ ok: false, error: failed.error.message }, 500);

    return json({ ok: true });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
