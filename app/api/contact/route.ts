import { NextRequest, NextResponse } from "next/server";
import { notifySuperAdmins } from "@/lib/system/notify";
import { isPhoneValidByCountry } from "@/lib/phone/validatePhone";
import { insertContactSubmission, insertRecord } from "@/lib/db/records";

export const runtime = "nodejs";

function isValidEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function hasPhoneDigits(value: { e164?: string; nationalNumber?: string } | null) {
  if (!value) return false;
  const digits = (value.e164 || value.nationalNumber || "").replace(/\D/g, "");
  return digits.length > 0;
}

function resolveLocale(body: any, req: NextRequest) {
  if (typeof body?.locale === "string") {
    const normalized = body.locale.toLowerCase();
    if (normalized.startsWith("zh")) return "zh";
    if (normalized.startsWith("en")) return "en";
  }
  const lang = req.headers.get("accept-language")?.toLowerCase() ?? "";
  return lang.includes("zh") ? "zh" : "en";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as any;
    if (!body || !isValidEmail(body.email)) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }

    const locale = resolveLocale(body, req);

    // 兼容 phone 对象
    const phone =
      body?.phone && typeof body.phone === "object"
        ? {
            country: typeof body.phone.country === "string" ? body.phone.country : "",
            dialCode: typeof body.phone.dialCode === "string" ? body.phone.dialCode : "",
            e164: typeof body.phone.e164 === "string" ? body.phone.e164 : "",
            nationalNumber:
              typeof body.phone.nationalNumber === "string" ? body.phone.nationalNumber : "",
          }
        : null;

    if (hasPhoneDigits(phone) && !isPhoneValidByCountry(phone)) {
      const message =
        locale === "zh"
          ? "手机号格式不正确，请根据所选国家填写�?
          : "Invalid phone number for selected country.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // 你原来把 phone 拼到 message 里，这里保留
    const baseMessage = typeof body.message === "string" ? body.message : "";
    const phoneNote = phone?.e164
      ? `\n\n[Phone]\nE.164: ${phone.e164}\nCountry: ${phone.country || "-"}\nDial: ${phone.dialCode || "-"}\nNational: ${phone.nationalNumber || "-"}`
      : "";

    const message = (baseMessage + phoneNote).trim() || null;

    // 你原来的 payload 结构保留（以后方便追溯）
    const payload = {
      type: "contact",
      name: typeof body.name === "string" ? body.name : null,
      email: body.email,
      wechat: typeof body.wechat === "string" ? body.wechat : null,
      intent: typeof body.intent === "string" ? body.intent : null,
      message,
      instruments: Array.isArray(body.instruments) ? body.instruments : [],
      bottleneck: typeof body.bottleneck === "string" ? body.bottleneck : null,
      phone,
      raw: body,
      receivedAt: new Date().toISOString(),
    };

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = req.headers.get("user-agent") ?? null;

    await insertContactSubmission({
      name: payload.name,
      email: payload.email,
      wechat: payload.wechat,
      intent: payload.intent,
      bottleneck: payload.bottleneck,
      instruments: payload.instruments,
      message: payload.message,
      locale,
      ip,
      userAgent,
      payload
    });

    await insertRecord({
      type: "contact",
      email: payload.email,
      name: payload.name,
      locale,
      payload,
      content: payload.message
    });

    await notifySuperAdmins({
      title: "新联�?/ New contact",
      content: `收到新的联系咨询�?{payload.name || "-"} (${payload.email})\n\nNew contact received: ${payload.name || "-"} (${payload.email})`
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("api/contact failed:", error);
    return NextResponse.json(
      { error: error?.message ?? "Service unavailable." },
      { status: 500 }
    );
  }
}
