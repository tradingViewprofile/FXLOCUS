import { NextResponse } from "next/server";

import { requireSystemUser } from "@/lib/system/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" }
  });
}

export async function GET() {
  try {
    const { user, supabase } = await requireSystemUser();
    const { data: unreadData, error } = await supabase
      .from("consult_messages")
      .select("from_user_id,created_at")
      .eq("to_user_id", user.id)
      .is("read_at", null)
      .limit(2000);

    if (error) return json({ ok: false, error: error.message }, 500);

    const counts: Record<string, number> = {};
    (unreadData || []).forEach((row: any) => {
      const id = String(row.from_user_id || "");
      if (!id) return;
      counts[id] = (counts[id] || 0) + 1;
    });

    const { data: latestData, error: latestError } = await supabase
      .from("consult_messages")
      .select("from_user_id,to_user_id,created_at")
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (latestError) return json({ ok: false, error: latestError.message }, 500);

    const latest: Record<string, string> = {};
    (latestData || []).forEach((row: any) => {
      const fromId = String(row.from_user_id || "");
      const toId = String(row.to_user_id || "");
      const peerId = fromId === user.id ? toId : fromId;
      if (!peerId || latest[peerId]) return;
      const created = String(row.created_at || "");
      if (created) latest[peerId] = created;
    });

    return json({ ok: true, counts, latest });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
