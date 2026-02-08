import { NextRequest, NextResponse } from "next/server";
import path from "path";

import { requireSystemUser } from "@/lib/system/guard";
import { supabaseAdmin } from "@/lib/system/supabaseAdmin";
import { createSignedDownloadUrl } from "@/lib/storage/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
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

export async function GET(req: NextRequest, ctx: { params: { courseId: string } }) {
  const rawId = String(ctx.params.courseId || "").trim();
  const courseId = Number(rawId);
  if (!courseId || courseId < 1 || courseId > 21) {
    return noStoreJson({ ok: false, error: "INVALID_COURSE" }, 400);
  }

  const disposition =
    req.nextUrl.searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  try {
    const { user } = await requireSystemUser();
    const admin = supabaseAdmin();

    const { data: access, error: accessErr } = await admin
      .from("course_access")
      .select("status")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (accessErr) return noStoreJson({ ok: false, error: accessErr.message }, 500);
    const status = String(access?.status || "");
    if (status !== "approved" && status !== "completed") {
      return noStoreJson({ ok: false, error: "FORBIDDEN" }, 403);
    }

    const { data: course, error: courseErr } = await admin
      .from("courses")
      .select("content_bucket,content_path,content_mime_type,content_file_name,deleted_at,published")
      .eq("id", courseId)
      .maybeSingle();

    if (courseErr) return noStoreJson({ ok: false, error: courseErr.message }, 500);
    if (!course?.content_bucket || !course?.content_path) {
      return noStoreJson({ ok: false, error: "NOT_FOUND" }, 404);
    }
    if (course.deleted_at) {
      return noStoreJson({ ok: false, error: "NOT_FOUND" }, 404);
    }
    const signed = await createSignedDownloadUrl(admin, course.content_bucket, course.content_path, 3600);
    if (!signed) {
      return noStoreJson({ ok: false, error: "SIGN_FAILED" }, 500);
    }

    const upstream = await fetch(signed);
    if (!upstream.ok || !upstream.body) {
      return noStoreJson({ ok: false, error: "FETCH_FAILED" }, 502);
    }

    const fallbackName = path.posix.basename(String(course.content_path || "download"));
    const filename = String(course.content_file_name || fallbackName || "download");
    const headers = new Headers();
    headers.set("Cache-Control", "private, max-age=3600");
    headers.set("Content-Disposition", contentDispositionHeader(filename, disposition));
    headers.set(
      "Content-Type",
      String(course.content_mime_type || upstream.headers.get("content-type") || "application/octet-stream")
    );
    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (e: any) {
    const code = String(e?.code || "UNAUTHORIZED");
    const status = code === "FORBIDDEN" ? 403 : code === "FROZEN" ? 403 : 401;
    return noStoreJson({ ok: false, error: code }, status);
  }
}
