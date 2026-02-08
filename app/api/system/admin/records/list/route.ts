import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/system/guard";
import { getPagination } from "@/lib/system/pagination";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TypeParam = z.enum(["donate", "contact", "enrollment"]);

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" }
  });
}

export async function GET(req: NextRequest) {
  try {
    const { supabase } = await requireSuperAdmin();
    const type = TypeParam.safeParse(req.nextUrl.searchParams.get("type"));
    if (!type.success) return json({ ok: false, error: "INVALID_TYPE" }, 400);
    const { page, pageSize, from, to } = getPagination(req, { defaultPageSize: 20, maxPageSize: 200 });

    let q: { data: any; error: any; count?: number | null } = await supabase
      .from("records")
      .select("id,type,created_at,email,name,payload,content,read_at", { count: "exact" })
      .eq("type", type.data)
      .order("created_at", { ascending: false })
      .range(from, to);
    let hasReadAt = true;

    if (q.error?.code === "42703") {
      q = await supabase
        .from("records")
        .select("id,type,created_at,email,name,payload,content", { count: "exact" })
        .eq("type", type.data)
        .order("created_at", { ascending: false })
        .range(from, to);
      hasReadAt = false;
    }

    if (q.error) return json({ ok: false, error: q.error.message }, 500);
    const items = Array.isArray(q.data) ? q.data : [];
    if (!hasReadAt) {
      const mapped = items.map((row: any) => {
        if (row?.read_at) return row;
        let readAt: string | null = null;
        if (row?.payload && typeof row.payload === "object") {
          readAt =
            (row.payload as any).read_at ||
            (row.payload as any).readAt ||
            (row.payload as any).readAtAt ||
            null;
        } else if (typeof row?.content === "string") {
          try {
            const parsed = JSON.parse(row.content);
            readAt = parsed?.read_at || parsed?.readAt || null;
          } catch {
            readAt = null;
          }
        }
        return { ...row, read_at: readAt };
      });
      return json({ ok: true, items: mapped, page, pageSize, total: q.count ?? mapped.length });
    }
    return json({ ok: true, items, page, pageSize, total: q.count ?? items.length });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}

