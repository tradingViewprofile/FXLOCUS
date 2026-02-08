"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";

import { PhoneField, type PhoneFieldValue } from "@/components/forms/PhoneField";
import { isPhoneValidByCountry } from "@/lib/phone/validatePhone";
import { Button } from "@/components/ui/Button";

const RichTextEditor = dynamic(
  () => import("./RichTextEditor").then((mod) => mod.RichTextEditor),
  { ssr: false }
);

type Locale = "zh" | "en";

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

function toBeijingDateKey(date: Date) {
  const shifted = new Date(date.getTime() + BEIJING_OFFSET_MS);
  const yyyy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function beijingMidnightUtcMsFromKey(key: string) {
  const [y, m, d] = key.split("-").map((part) => Number(part));
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d, 0, 0, 0, 0) - BEIJING_OFFSET_MS;
}

function nextPriceTick(d: Date) {
  const key = toBeijingDateKey(d);
  const midnightUtcMs = beijingMidnightUtcMsFromKey(key);
  if (!midnightUtcMs) return new Date(d.getTime() + 86_400_000);
  return new Date(midnightUtcMs + 86_400_000);
}

function formatHms(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

const NAME_REGEX = /^[A-Za-z\u4e00-\u9fff][A-Za-z\u4e00-\u9fff\s.'\-\u00b7]{1,39}$/;
const HANDLE_REGEX = /^[A-Za-z0-9_+@.\-]{3,32}$/;
const WECHAT_REGEX = /^[A-Za-z][-_A-Za-z0-9]{5,19}$/;
const WEEKLY_REGEX = /^[A-Za-z0-9\u4e00-\u9fff\s/,+.\-]{2,80}$/;
const TEXT_REGEX = /^[\s\S]{6,1600}$/;

export function DonateClient({
  initialPrice,
  initialNextUpdateAt
}: {
  initialPrice?: number;
  initialNextUpdateAt?: string;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("donate");
  const tCommon = useTranslations("common");

  const baseAmount = 999;
  const dailyIncrease = 5;

  const [now, setNow] = useState(() => new Date());
  const [priceInfo, setPriceInfo] = useState<null | { price: number; nextUpdateAt: string }>(() => {
    if (!Number.isFinite(initialPrice)) return null;
    return {
      price: Number(initialPrice),
      nextUpdateAt: initialNextUpdateAt || ""
    };
  });
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState<null | { id: string; createdAt: string }>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [walletCopied, setWalletCopied] = useState(false);

  const [form, setForm] = useState(() => ({
    name: "",
    email: "",
    telegramWhatsApp: "",
    wechat: "",
    phone: null as PhoneFieldValue | null,
    tradingYears: "",
    instruments: [] as string[],
    bottlenecks: [] as string[],
    weeklyFrequency: "",
    whyJoin: "",
    goal90d: "",
    challenge: "no" as "yes" | "no",
    thoughtsHtml: ""
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const loadPrice = useCallback(async () => {
    try {
      const res = await fetch(`/api/donate/price?ts=${Date.now()}`, {
        cache: "no-store",
        headers: { "cache-control": "no-store" }
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "price_failed");
      setPriceInfo({ price: Number(json.price || 0), nextUpdateAt: String(json.nextUpdateAt || "") });
    } catch {
      // ignore and keep fallback price
    }
  }, []);

  useEffect(() => {
    loadPrice();
  }, [loadPrice]);

  useEffect(() => {
    if (!priceInfo?.nextUpdateAt) return;
    const nextTs = new Date(priceInfo.nextUpdateAt).getTime();
    const delay = Math.max(1000, nextTs - Date.now() + 1000);
    const id = window.setTimeout(() => {
      void loadPrice();
    }, delay);
    return () => window.clearTimeout(id);
  }, [priceInfo?.nextUpdateAt, loadPrice]);

  const { price, countdown } = useMemo(() => {
    const nextUpdate = priceInfo?.nextUpdateAt ? new Date(priceInfo.nextUpdateAt) : null;
    const nextTick = nextUpdate ? nextUpdate.getTime() : nextPriceTick(now).getTime();
    const diffSeconds = Math.max(0, Math.floor((nextTick - now.getTime()) / 1000));
    const resolvedPrice = Number.isFinite(priceInfo?.price) ? Number(priceInfo?.price) : null;
    return { price: resolvedPrice, countdown: formatHms(diffSeconds) };
  }, [now, priceInfo]);

  const instrumentsOptions = useMemo(
    () => [
      { value: "fx", label: t("form.options.instruments.fx") },
      { value: "gold", label: t("form.options.instruments.gold") },
      { value: "crypto", label: t("form.options.instruments.crypto") },
      { value: "index", label: t("form.options.instruments.index") },
      { value: "stocks", label: t("form.options.instruments.stocks") },
      { value: "other", label: t("form.options.instruments.other") }
    ],
    [t]
  );

  const bottleneckOptions = useMemo(
    () => [
      { value: "impulse", label: t("form.options.bottlenecks.impulse") },
      { value: "fomo", label: t("form.options.bottlenecks.fomo") },
      { value: "overtrading", label: t("form.options.bottlenecks.overtrading") },
      { value: "no_discipline", label: t("form.options.bottlenecks.noDiscipline") },
      { value: "structure", label: t("form.options.bottlenecks.structure") },
      { value: "review", label: t("form.options.bottlenecks.review") },
      { value: "other", label: t("form.options.bottlenecks.other") }
    ],
    [t]
  );

  const toggleMulti = (key: "instruments" | "bottlenecks", value: string) => {
    setForm((prev) => {
      const list = prev[key];
      const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
      return { ...prev, [key]: next };
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    const required = (field: string, value: string | string[]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) nextErrors[field] = t("validation.required");
      } else if (!value.trim()) {
        nextErrors[field] = t("validation.required");
      }
    };

    required("name", form.name);
    required("email", form.email);
    required("tradingYears", form.tradingYears);
    required("weeklyFrequency", form.weeklyFrequency);
    required("whyJoin", form.whyJoin);
    required("goal90d", form.goal90d);
    required("thoughtsHtml", form.thoughtsHtml.replace(/<[^>]*>/g, "").trim());

    if (!form.phone?.e164) {
      nextErrors.phone = t("validation.required");
    } else if (!isPhoneValidByCountry(form.phone)) {
      nextErrors.phone = t("validation.invalidPhone");
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    if (form.email.trim() && !emailOk) nextErrors.email = t("validation.invalidEmail");
    if (form.name.trim() && !NAME_REGEX.test(form.name.trim())) {
      nextErrors.name = t("validation.invalidName");
    }
    if (form.telegramWhatsApp.trim() && !HANDLE_REGEX.test(form.telegramWhatsApp.trim())) {
      nextErrors.telegramWhatsApp = t("validation.invalidHandle");
    }
    if (form.wechat.trim() && !WECHAT_REGEX.test(form.wechat.trim())) {
      nextErrors.wechat = t("validation.invalidWechat");
    }
    if (form.weeklyFrequency.trim() && !WEEKLY_REGEX.test(form.weeklyFrequency.trim())) {
      nextErrors.weeklyFrequency = t("validation.invalidWeekly");
    }
    if (form.whyJoin.trim() && !TEXT_REGEX.test(form.whyJoin.trim())) {
      nextErrors.whyJoin = t("validation.invalidText");
    }
    if (form.goal90d.trim() && !TEXT_REGEX.test(form.goal90d.trim())) {
      nextErrors.goal90d = t("validation.invalidText");
    }
    const thoughtsPlain = form.thoughtsHtml.replace(/<[^>]*>/g, "").trim();
    if (thoughtsPlain && !TEXT_REGEX.test(thoughtsPlain)) {
      nextErrors.thoughtsHtml = t("validation.invalidText");
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    setGlobalError(null);
    setSubmitted(null);

    if (website.trim()) {
      setGlobalError(t("validation.botDetected"));
      return;
    }

    if (!validate()) return;

    const programLabel = t("form.programLabel");
    const submittedAt = new Date().toISOString();
    const finalPrice = Number.isFinite(price) ? price : baseAmount;
    const payload = {
      locale,
      name: form.name.trim(),
      email: form.email.trim(),
      telegramWhatsApp: form.telegramWhatsApp.trim() || undefined,
      wechat: form.wechat.trim() || undefined,
      phone: form.phone ?? undefined,
      tradingYears: form.tradingYears,
      instruments: form.instruments,
      bottlenecks: form.bottlenecks,
      weeklyFrequency: form.weeklyFrequency.trim(),
      whyJoin: form.whyJoin.trim(),
      goal90d: form.goal90d.trim(),
      challenge: form.challenge,
      thoughtsHtml: form.thoughtsHtml,
      price: finalPrice,
      amount: finalPrice,
      program: programLabel,
      submittedAt
    };
    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        const code = json?.code;
        if (code === "rate_limited") {
          setGlobalError(t("validation.rateLimited"));
        } else if (code === "invalid_email") {
          setGlobalError(t("validation.invalidEmail"));
        } else if (code === "invalid_format") {
          setGlobalError(t("validation.invalidFormat"));
        } else {
          setGlobalError("Submission failed. Please try again.");
        }
        return;
      }

      setSubmitted({
        id: String(json.applicationId || json.id || ""),
        createdAt: String(json.createdAt || new Date().toISOString())
      });
    } catch {
      setGlobalError("Submission failed. Please try again.");
    }
  };

  const rulesItems = t.raw("rules.items") as unknown as string[];
  const walletAddress = t("rules.walletValue");

  const copyWallet = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setWalletCopied(true);
      window.setTimeout(() => setWalletCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-10 md:space-y-12">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950/40 p-7 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_55%)]" />
        <div className="relative space-y-7 text-center">
          <div className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-[0.22em] text-slate-200/80">
            {t("pricing.amountLabel")}
          </div>
          <div className="text-6xl font-semibold tracking-tight text-cyan-200 drop-shadow md:text-7xl">
            {price === null ? "--" : `$${price}`}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-1 text-xs font-semibold text-cyan-100">
              USDT
            </span>
            <span className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-1 text-xs font-semibold text-cyan-100">
              USDC
            </span>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs text-slate-200/80 md:text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
              <span className="font-semibold text-rose-300">{t("pricing.dailyIncrease")}</span>
              <span className="text-slate-200/50">·</span>
              <span>{t("pricing.countdownLabel")}</span>
              <span className="text-lg font-semibold text-slate-50 tabular-nums md:text-xl">
                {countdown}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="fx-btn fx-btn-primary rounded-full px-10 py-3 text-sm font-semibold"
            >
              {t("cta.openForm")}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-center">
              <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/70">
                {t("pricing.baseLabel")}
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-50 tabular-nums">
                ${baseAmount}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-center">
              <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/70">
                {t("pricing.dailyLabel")}
              </div>
              <div className="mt-2 text-2xl font-semibold text-rose-300 tabular-nums">
                +${dailyIncrease}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-center">
              <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/70">
                {t("pricing.methodLabel")}
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-50">
                {t("pricing.methodValue")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-50">{t("rules.title")}</h2>
        <div className="fx-card p-6">
          <ul className="space-y-3 text-sm leading-7 text-slate-50">
            {rulesItems.map((item, index) => (
              <li key={item} className="flex gap-4 font-semibold">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[11px] tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/40 p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_55%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          <div className="min-w-[160px] space-y-2">
            <h2 className="text-xl font-semibold text-slate-50">{t("rules.walletLabel")}</h2>
            <div className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
              {t("pricing.methodValue")}
            </div>
          </div>

          <div className="flex-1">
            <div className="rounded-2xl border border-emerald-400/60 bg-white/5 px-5 py-4 text-center text-sm text-slate-50">
              <code className="block break-all font-mono font-semibold">{walletAddress}</code>
            </div>
          </div>

          <div className="flex md:justify-end">
            <Button variant="secondary" size="sm" className="rounded-full" onClick={copyWallet}>
              {walletCopied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </section>


      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 px-6 py-5 text-sm leading-7 text-rose-100/90">
        {t("footerRisk")}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("form.title")}
          onMouseDown={() => setOpen(false)}
        >
          <div
            className="fx-surface max-h-[90vh] w-full max-w-3xl overflow-auto p-6 md:p-8"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-50">{t("form.title")}</h2>
                <p className="mt-2 text-sm text-slate-200/70">{t("form.subtitle")}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-50 hover:bg-white/10"
              >
                {t("form.actions.close")}
              </button>
            </div>

            {submitted ? (
              <div className="mt-8 space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm font-semibold text-slate-50">{t("form.success.title")}</div>
                <div className="text-sm text-slate-200/75">
                  {t("form.success.body", { id: submitted.id })}
                </div>
                <div className="text-xs text-slate-200/60">
                  {t("form.success.time", { time: new Date(submitted.createdAt).toLocaleString(locale) })}
                </div>
              </div>
            ) : (
              <form
                className="mt-8 space-y-10"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSubmit();
                }}
              >
                <div className="space-y-4">
                  <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/70">
                    {t("form.sections.personal")}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <div className="text-xs font-semibold text-slate-200/70">{t("form.fields.name.label")}</div>
                      <input
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder={t("form.fields.name.placeholder")}
                      />
                      {errors.name ? <div className="mt-2 text-xs text-rose-300">{errors.name}</div> : null}
                    </label>
                    <label className="block">
                      <div className="text-xs font-semibold text-slate-200/70">{t("form.fields.email.label")}</div>
                      <input
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder={t("form.fields.email.placeholder")}
                        inputMode="email"
                      />
                      {errors.email ? <div className="mt-2 text-xs text-rose-300">{errors.email}</div> : null}
                    </label>
                    <label className="block">
                      <div className="text-xs font-semibold text-slate-200/70">{t("form.fields.telegram.label")}</div>
                      <input
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                        value={form.telegramWhatsApp}
                        onChange={(e) => setForm((p) => ({ ...p, telegramWhatsApp: e.target.value }))}
                        placeholder={t("form.fields.telegram.placeholder")}
                      />
                      {errors.telegramWhatsApp ? (
                        <div className="mt-2 text-xs text-rose-300">{errors.telegramWhatsApp}</div>
                      ) : null}
                    </label>
                    <label className="block">
                      <div className="text-xs font-semibold text-slate-200/70">{t("form.fields.wechat.label")}</div>
                      <input
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                        value={form.wechat}
                        onChange={(e) => setForm((p) => ({ ...p, wechat: e.target.value }))}
                        placeholder={t("form.fields.wechat.placeholder")}
                      />
                      {errors.wechat ? (
                        <div className="mt-2 text-xs text-rose-300">{errors.wechat}</div>
                      ) : null}
                    </label>
                    <div className="md:col-span-2">
                      <PhoneField
                        label={t("form.fields.phoneGroup")}
                        countryLabel={t("form.fields.country.label")}
                        phoneLabel={t("form.fields.phone.label")}
                        value={form.phone}
                        onChange={(phone) => setForm((p) => ({ ...p, phone }))}
                        required
                        defaultCountry={locale === "zh" ? "CN" : "US"}
                        error={errors.phone}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/70">
                    {t("form.sections.status")}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <div className="text-xs font-semibold text-slate-200/70">{t("form.fields.years.label")}</div>
                      <select
                        className="fx-select mt-2"
                        value={form.tradingYears}
                        onChange={(e) => setForm((p) => ({ ...p, tradingYears: e.target.value }))}
                      >
                        <option value="">{t("form.fields.years.placeholder")}</option>
                        <option value="lt1">{t("form.options.years.lt1")}</option>
                        <option value="1_3">{t("form.options.years.1_3")}</option>
                        <option value="3_5">{t("form.options.years.3_5")}</option>
                        <option value="5_10">{t("form.options.years.5_10")}</option>
                        <option value="10p">{t("form.options.years.10p")}</option>
                      </select>
                      {errors.tradingYears ? (
                        <div className="mt-2 text-xs text-rose-300">{errors.tradingYears}</div>
                      ) : null}
                    </label>

                    <label className="block">
                      <div className="text-xs font-semibold text-slate-200/70">{t("form.fields.weekly.label")}</div>
                      <input
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                        value={form.weeklyFrequency}
                        onChange={(e) => setForm((p) => ({ ...p, weeklyFrequency: e.target.value }))}
                        placeholder={t("form.fields.weekly.placeholder")}
                      />
                      {errors.weeklyFrequency ? (
                        <div className="mt-2 text-xs text-rose-300">{errors.weeklyFrequency}</div>
                      ) : null}
                    </label>

                    <div className="md:col-span-2">
                      <div className="text-xs font-semibold text-slate-200/70">{t("form.fields.instruments.label")}</div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {instrumentsOptions.map((opt) => (
                          <label
                            key={opt.value}
                            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100/90"
                          >
                            <input
                              type="checkbox"
                              checked={form.instruments.includes(opt.value)}
                              onChange={() => toggleMulti("instruments", opt.value)}
                              className="h-4 w-4 accent-sky-400"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-xs font-semibold text-slate-200/70">{t("form.fields.bottlenecks.label")}</div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {bottleneckOptions.map((opt) => (
                          <label
                            key={opt.value}
                            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100/90"
                          >
                            <input
                              type="checkbox"
                              checked={form.bottlenecks.includes(opt.value)}
                              onChange={() => toggleMulti("bottlenecks", opt.value)}
                              className="h-4 w-4 accent-sky-400"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/70">
                    {t("form.sections.intent")}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block md:col-span-2">
                      <div className="text-xs font-semibold text-slate-200/70">{t("form.fields.why.label")}</div>
                      <textarea
                        className="mt-2 min-h-[110px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                        value={form.whyJoin}
                        onChange={(e) => setForm((p) => ({ ...p, whyJoin: e.target.value }))}
                        placeholder={t("form.fields.why.placeholder")}
                      />
                      {errors.whyJoin ? <div className="mt-2 text-xs text-rose-300">{errors.whyJoin}</div> : null}
                    </label>

                    <label className="block md:col-span-2">
                      <div className="text-xs font-semibold text-slate-200/70">{t("form.fields.goal.label")}</div>
                      <textarea
                        className="mt-2 min-h-[110px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                        value={form.goal90d}
                        onChange={(e) => setForm((p) => ({ ...p, goal90d: e.target.value }))}
                        placeholder={t("form.fields.goal.placeholder")}
                      />
                      {errors.goal90d ? <div className="mt-2 text-xs text-rose-300">{errors.goal90d}</div> : null}
                    </label>

                    <div className="md:col-span-2">
                      <div className="text-xs font-semibold text-slate-200/70">{t("form.fields.challenge.label")}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(["yes", "no"] as const).map((v) => (
                          <label
                            key={v}
                            className={[
                              "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm",
                              form.challenge === v
                                ? "border-sky-400/40 bg-sky-400/10 text-slate-50"
                                : "border-white/10 bg-white/5 text-slate-100/90"
                            ].join(" ")}
                          >
                            <input
                              type="radio"
                              name="challenge"
                              value={v}
                              checked={form.challenge === v}
                              onChange={() => setForm((p) => ({ ...p, challenge: v }))}
                              className="h-4 w-4 accent-sky-400"
                            />
                            <span>{t(`form.options.challenge.${v}`)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/70">
                    {t("form.sections.thoughts")}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200/70">{t("form.fields.thoughts.label")}</div>
                    <div className="mt-3">
                      <RichTextEditor
                        value={form.thoughtsHtml}
                        onChange={(next) => setForm((p) => ({ ...p, thoughtsHtml: next }))}
                        placeholder={t("form.fields.thoughts.placeholder")}
                        aria-label={t("form.fields.thoughts.label")}
                      />
                    </div>
                    {errors.thoughtsHtml ? (
                      <div className="mt-2 text-xs text-rose-300">{errors.thoughtsHtml}</div>
                    ) : null}
                  </div>
                </div>

                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />

                {globalError ? (
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {globalError}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="primary" className="rounded-full px-6 py-3" type="submit">
                    {t("form.actions.submit")}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-sm font-semibold text-slate-200/70 hover:text-slate-50"
                  >
                    {t("form.actions.cancel")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
