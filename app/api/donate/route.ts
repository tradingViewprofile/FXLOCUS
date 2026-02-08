const DONATE_ROUTE_VERSION = "donate_v2_2025-12-27_01";
console.log("DONATE_ROUTE_VERSION:", DONATE_ROUTE_VERSION);
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { notifySuperAdmins } from "@/lib/system/notify";
import { isPhoneValidByCountry } from "@/lib/phone/validatePhone";
import { insertDonationApplication, insertRecord, insertRecordReturning } from "@/lib/db/records";

export const runtime = "nodejs";

const NAME_REGEX = /^[A-Za-z\u4e00-\u9fff][A-Za-z\u4e00-\u9fff\s.'\-\u00b7]{1,39}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE_REGEX = /^[A-Za-z0-9_+@.\-]{3,32}$/;
const WECHAT_REGEX = /^[A-Za-z][-_A-Za-z0-9]{5,19}$/;
const WEEKLY_REGEX = /^[A-Za-z0-9\u4e00-\u9fff\s/,+.\-]{2,80}$/;
const TEXT_REGEX = /^[\s\S]{6,1600}$/;

function badRequest(code: string) {
  return NextResponse.json({ success: false, code }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("invalid_format");

    const localeRaw = typeof (body as any)?.locale === "string" ? String((body as any).locale) : "";
    const locale = localeRaw.toLowerCase().startsWith("zh") ? "zh" : localeRaw ? "en" : null;

    const name = String((body as any)?.name ?? "").trim();
    const email = String((body as any)?.email ?? "").trim();
    const telegramWhatsApp = String((body as any)?.telegramWhatsApp ?? "").trim();
    const wechat = String((body as any)?.wechat ?? "").trim();
    const weeklyFrequency = String((body as any)?.weeklyFrequency ?? "").trim();
    const whyJoin = String((body as any)?.whyJoin ?? "").trim();
    const goal90d = String((body as any)?.goal90d ?? "").trim();
    const thoughtsHtml = String((body as any)?.thoughtsHtml ?? "");
    const thoughtsPlain = thoughtsHtml.replace(/<[^>]*>/g, "").trim();
    const phoneE164 = String((body as any)?.phone?.e164 ?? "").replace(/\s+/g, "");

    if (!name || !email || !weeklyFrequency || !whyJoin || !goal90d || !thoughtsPlain || !phoneE164) {
      return badRequest("invalid_format");
    }
    if (!EMAIL_REGEX.test(email)) return badRequest("invalid_email");
    if (!NAME_REGEX.test(name)) return badRequest("invalid_format");
    if (telegramWhatsApp && !HANDLE_REGEX.test(telegramWhatsApp)) return badRequest("invalid_format");
    if (wechat && !WECHAT_REGEX.test(wechat)) return badRequest("invalid_format");
    if (!isPhoneValidByCountry((body as any)?.phone)) return badRequest("invalid_format");
    if (!WEEKLY_REGEX.test(weeklyFrequency)) return badRequest("invalid_format");
    if (!TEXT_REGEX.test(whyJoin) || !TEXT_REGEX.test(goal90d) || !TEXT_REGEX.test(thoughtsPlain)) {
      return badRequest("invalid_format");
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = req.headers.get("user-agent") ?? null;
    const applicationId = `ENR-${randomUUID().slice(0, 8).toUpperCase()}`;
    const submittedAt = new Date().toISOString();
    const safePrice = Number((body as any)?.price);
    const safeAmount = Number((body as any)?.amount);
    const price = Number.isFinite(safePrice) ? safePrice : undefined;
    const amount = Number.isFinite(safeAmount) ? safeAmount : price;

    const payload = {
      ...(body as Record<string, unknown>),
      name,
      email,
      telegramWhatsApp: telegramWhatsApp || undefined,
      wechat: wechat || undefined,
      weeklyFrequency,
      whyJoin,
      goal90d,
      thoughtsHtml,
      phone: (body as any)?.phone ?? undefined,
      price,
      amount,
      applicationId,
      submittedAt
    };

    await insertDonationApplication({
      email,
      name,
      wechat: wechat || null,
      locale,
      ip,
      userAgent,
      payload
    });

    const enroll = await insertRecordReturning({
      type: "enrollment",
      email,
      name,
      locale,
      payload,
      content: typeof (body as any)?.message === "string" ? (body as any).message : null
    });

    await insertRecord({
      type: "donate",
      email,
      name,
      locale,
      payload,
      content: typeof (body as any)?.message === "string" ? (body as any).message : null
    });

    await notifySuperAdmins({
      title: "新报�?/ New enrollment",
      content: `收到新的报名申请�?{name} (${email})\n\nNew enrollment received: ${name} (${email})`
    });

    return NextResponse.json({
      ok: true,
      success: true,
      id: enroll.id,
      createdAt: enroll.created_at,
      applicationId
    });
  } catch (e: any) {
    console.error("api/donate failed:", e);
    return NextResponse.json({ success: false, code: "server_error" }, { status: 500 });
  }
}
