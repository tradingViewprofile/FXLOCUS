import { NextResponse } from "next/server";

import { requireSystemUser } from "@/lib/system/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" }
  });
}

export async function GET() {
  try {
    const { user, supabase } = await requireSystemUser();

    const q = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("to_user_id", user.id)
      .is("read_at", null);

    if (q.error) return json({ ok: false, error: q.error.message }, 500);
    return json({ ok: true, count: q.count ?? 0 });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}

