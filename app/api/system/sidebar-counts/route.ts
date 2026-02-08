import { NextRequest, NextResponse } from "next/server";

import { requireSystemUser } from "@/lib/system/guard";
import { getPendingCounts } from "@/lib/system/pendingCounts";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { isAdminRole } from "@/lib/system/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function GET(_req: NextRequest) {
  try {
    const { user, supabase } = await requireSystemUser();
    const notificationQuery = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("to_user_id", user.id)
      .is("read_at", null);

    const consultQuery = await supabase
      .from("consult_messages")
      .select("id", { count: "exact", head: true })
      .eq("to_user_id", user.id)
      .is("read_at", null);

    let pending = {};
    if (isAdminRole(user.role) || user.role === "coach" || user.role === "assistant") {
      const admin = supabaseAdmin();
      const pendingRes = await getPendingCounts({ user, admin });
      pending = pendingRes.counts;
    }

    if (notificationQuery.error || consultQuery.error) {
      return json(
        {
          ok: false,
          error: notificationQuery.error?.message || consultQuery.error?.message || "query_failed"
        },
        500
      );
    }

    return json({
      ok: true,
      unread: notificationQuery.count ?? 0,
      consultUnread: consultQuery.count ?? 0,
      pending
    });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
