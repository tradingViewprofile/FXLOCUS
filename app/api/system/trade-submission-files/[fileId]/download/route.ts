import { NextRequest, NextResponse } from "next/server";

import { requireSystemUser } from "@/lib/system/guard";
import { fetchCoachAssignedUserIds } from "@/lib/system/coachAssignments";
import { fetchLeaderTreeIds } from "@/lib/system/leaderTree";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { createSignedDownloadUrl } from "@/lib/storage/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asciiFallbackFilename(value: string) {
  const cleaned = String(value || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/["\\]/g, "_")
    .trim();
  const ascii = cleaned.replace(/[^\x20-\x7E]/g, "_").trim();
  return ascii || "download";
}

function contentDispositionHeader(filename: string, disposition: "inline" | "attachment") {
  const fallback = asciiFallbackFilename(filename);
  const encoded = encodeURIComponent(filename || fallback);
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(req: NextRequest, ctx: { params: { fileId: string } }) {
  const fileId = String(ctx.params.fileId || "").trim();
  if (!fileId || !isUuid(fileId)) return noStoreJson({ ok: false, error: "INVALID_FILE" }, 400);

  const disposition = req.nextUrl.searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  try {
    const { user, supabase } = await requireSystemUser();
    const admin = supabaseAdmin();

    const { data: file, error: fileErr } = await admin
      .from("trade_submission_files")
      .select("id,submission_id,file_name,mime_type,size_bytes,storage_bucket,storage_path")
      .eq("id", fileId)
      .maybeSingle();

    if (fileErr) return noStoreJson({ ok: false, error: fileErr.message }, 500);
    if (!file?.id) return noStoreJson({ ok: false, error: "NOT_FOUND" }, 404);

    const { data: submission, error: subErr } = await admin
      .from("trade_submissions")
      .select("id,user_id,leader_id")
      .eq("id", file.submission_id)
      .maybeSingle();

    if (subErr) return noStoreJson({ ok: false, error: subErr.message }, 500);
    if (!submission?.id) return noStoreJson({ ok: false, error: "NOT_FOUND" }, 404);

    let allowed = user.role === "super_admin";
    if (!allowed) {
      if (user.role === "leader") {
        if (submission.leader_id === user.id) allowed = true;
        if (!allowed) {
          const treeIds = await fetchLeaderTreeIds(supabase, user.id);
          allowed = treeIds.includes(String(submission.user_id));
        }
      } else if (user.role === "coach") {
        if (submission.user_id === user.id) allowed = true;
        if (!allowed) {
          const assigned = await fetchCoachAssignedUserIds(supabase, user.id);
          allowed = assigned.includes(String(submission.user_id));
        }
      } else {
        allowed = submission.user_id === user.id;
      }
    }

    if (!allowed) return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);

    const signed = await createSignedDownloadUrl(admin, file.storage_bucket, file.storage_path, 3600);
    if (!signed) {
      return noStoreJson({ ok: false, error: "SIGN_FAILED" }, 500);
    }

    const upstream = await fetch(signed);
    if (!upstream.ok || !upstream.body) {
      return noStoreJson({ ok: false, error: "FETCH_FAILED" }, 502);
    }

    const filename = String(file.file_name || "download");
    const headers = new Headers();
    headers.set("Cache-Control", "private, max-age=3600");
    headers.set("Content-Disposition", contentDispositionHeader(filename, disposition));
    headers.set("Content-Type", String(file.mime_type || upstream.headers.get("content-type") || "application/octet-stream"));
    const length = upstream.headers.get("content-length") || (file.size_bytes ? String(file.size_bytes) : "");
    if (length) headers.set("Content-Length", length);

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return noStoreJson({ ok: false, error: code }, status);
  }
}

