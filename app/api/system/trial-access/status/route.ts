import { NextResponse } from "next/server";

import { requireSystemUser } from "@/lib/system/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" }
  });
}

const SOURCE_ELIGIBLE = new Set(["商业�?, "其他渠道", "其他"]);

export async function GET() {
  try {
    const { user, supabase } = await requireSystemUser();
    if (user.role !== "student") return json({ ok: true, eligible: false });

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("student_status,source")
      .eq("id", user.id)
      .maybeSingle();
    if (profileErr) return json({ ok: false, error: profileErr.message }, 500);

    const studentStatus = String(profile?.student_status || "");
    const source = String(profile?.source || "");
    if (studentStatus !== "普通学�? || !SOURCE_ELIGIBLE.has(source)) {
      return json({ ok: true, eligible: false });
    }

    const { count, error } = await supabase
      .from("course_access")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["approved", "completed"]);
    if (error) return json({ ok: false, error: error.message }, 500);

    return json({ ok: true, eligible: Number(count || 0) === 0 });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}
