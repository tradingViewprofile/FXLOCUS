import { NextResponse } from "next/server";

import { canConsultWith } from "@/lib/system/consult";
import { requireSystemUser } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { createSignedDownloadUrl } from "@/lib/storage/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSystemUser();
    const { searchParams } = new URL(req.url);
    const peerId = String(searchParams.get("peerId") || "").trim();
    const since = String(searchParams.get("since") || "").trim();
    const limitRaw = Number(searchParams.get("limit") || 100);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 100;
    if (!peerId || !isUuid(peerId)) return json({ ok: false, error: "INVALID_PEER" }, 400);

    const allowed = await canConsultWith(ctx, peerId);
    if (!allowed) return json({ ok: false, error: "FORBIDDEN" }, 403);

    const admin = supabaseAdmin();
    let query = admin
      .from("consult_messages")
      .select(
        "id,from_user_id,to_user_id,content_type,content_text,image_bucket,image_path,image_name,image_mime_type,image_size_bytes,created_at,read_at"
      )
      .or(
        `and(from_user_id.eq.${ctx.user.id},to_user_id.eq.${peerId}),and(from_user_id.eq.${peerId},to_user_id.eq.${ctx.user.id})`
      )
      .order("created_at", { ascending: true })
      .limit(limit);

    if (since) {
      query = query.gt("created_at", since);
    }

    const { data, error } = await query;

    if (error) return json({ ok: false, error: error.message }, 500);

    const items = await Promise.all(
      (data || []).map(async (row: any) => {
        let imageUrl: string | null = null;
        if (row.image_bucket && row.image_path) {
          imageUrl = await createSignedDownloadUrl(admin, row.image_bucket, row.image_path, 3600);
        }
        return {
          id: row.id,
          from_user_id: row.from_user_id,
          to_user_id: row.to_user_id,
          content_type: row.content_type,
          content_text: row.content_text,
          image_url: imageUrl,
          image_name: row.image_name,
          image_mime_type: row.image_mime_type,
          image_size_bytes: row.image_size_bytes,
          created_at: row.created_at,
          read_at: row.read_at
        };
      })
    );

    await admin
      .from("consult_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("to_user_id", ctx.user.id)
      .eq("from_user_id", peerId)
      .is("read_at", null);

    return json({ ok: true, items });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
