import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { dbAll } from "@/lib/db/d1";
import { requireAdmin } from "@/lib/system/guard";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { createSignedDownloadUrl } from "@/lib/storage/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TypeParam = z.enum(["all", "trade_log", "trade_strategy"]);

function json(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function like(value: string) {
  return `%${String(value || "").trim().toLowerCase()}%`;
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAdmin();
    const admin = supabaseAdmin();

    const typeRaw = req.nextUrl.searchParams.get("type") || "all";
    const parsedType = TypeParam.safeParse(typeRaw);
    if (!parsedType.success) return json({ ok: false, error: "INVALID_TYPE" }, 400);
    const type = parsedType.data;
    const keyword = (req.nextUrl.searchParams.get("q") || "").trim();

    let scopeIds: string[] = [];
    if (user.role === "leader") {
      scopeIds = await fetchLeaderTreeIds(admin, user.id);
      if (!scopeIds.length) return json({ ok: true, items: [] });
    }

    let filterIds: string[] | null = null;
    if (keyword) {
      const where: string[] = [`role in ('student','trader','coach')`];
      const params: any[] = [];
      if (scopeIds.length) {
        where.push(`id in (${scopeIds.map(() => "?").join(",")})`);
        params.push(...scopeIds);
      }
      where.push(`(lower(full_name) like ? or lower(email) like ? or lower(phone) like ?)`);
      const q = like(keyword);
      params.push(q, q, q);

      const rows = await dbAll<{ id: string }>(
        `select id from profiles where ${where.join(" and ")} limit 200`,
        params
      );
      filterIds = rows.map((r) => String(r.id)).filter(Boolean);
      if (!filterIds.length) return json({ ok: true, items: [] });
    }

    const where: string[] = ["s.archived_at is not null"];
    const params: any[] = [];
    if (type !== "all") {
      where.push("s.type = ?");
      params.push(type);
    }
    if (scopeIds.length) {
      where.push(`s.user_id in (${scopeIds.map(() => "?").join(",")})`);
      params.push(...scopeIds);
    }
    if (filterIds && filterIds.length) {
      where.push(`s.user_id in (${filterIds.map(() => "?").join(",")})`);
      params.push(...filterIds);
    }

    const submissions = await dbAll<any>(
      `select
         s.id,
         s.user_id,
         s.type,
         s.status,
         s.review_note,
         s.created_at,
         s.archived_at,
         p.full_name as user_full_name,
         p.email as user_email,
         p.phone as user_phone
       from trade_submissions s
       left join profiles p on p.id = s.user_id
       where ${where.join(" and ")}
       order by s.archived_at desc
       limit 200`,
      params
    );

    const ids = submissions.map((s: any) => String(s.id || "")).filter(Boolean);
    const files = ids.length
      ? await dbAll<any>(
          `select * from trade_submission_files where submission_id in (${ids.map(() => "?").join(",")})`,
          ids
        )
      : [];

    const filesBySubmission = new Map<string, any[]>();
    files.forEach((f: any) => {
      const sid = String(f.submission_id || "");
      if (!sid) return;
      const list = filesBySubmission.get(sid) || [];
      list.push(f);
      filesBySubmission.set(sid, list);
    });

    const items = await Promise.all(
      submissions.map(async (s: any) => {
        const list = filesBySubmission.get(String(s.id || "")) || [];
        const nextFiles = await Promise.all(
          list.map(async (f: any) => {
            const signed = await createSignedDownloadUrl(admin, f.storage_bucket, f.storage_path, 3600);
            return {
              id: f.id,
              file_name: f.file_name,
              mime_type: f.mime_type || null,
              size_bytes: f.size_bytes || 0,
              url: signed || null
            };
          })
        );

        return {
          id: s.id,
          user_id: s.user_id,
          type: s.type,
          status: s.status,
          review_note: s.review_note,
          created_at: s.created_at,
          archived_at: s.archived_at,
          user: s.user_id
            ? { full_name: s.user_full_name ?? null, email: s.user_email ?? null, phone: s.user_phone ?? null }
            : null,
          files: nextFiles
        };
      })
    );

    return json({ ok: true, items });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return json({ ok: false, error: code }, status);
  }
}


