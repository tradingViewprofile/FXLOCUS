"use client";

import { FormEvent, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { PhoneField, type PhoneFieldValue } from "@/components/forms/PhoneField";
import { isPhoneValidByCountry } from "@/lib/phone/validatePhone";

type FormState = {
  name: string;
  email: string;
  phone: PhoneFieldValue | null;
  wechat: string;
  intent: string;
  message: string;
  instruments: string[];
  bottleneck: string;
};

export function ContactForm() {
  const locale = useLocale();
  const t = useTranslations("contact");
  const tCommon = useTranslations("common");

  const instrumentOptions = useMemo(
    () =>
      [
        { key: "fx", label: t("form.instrumentOptions.fx") },
        { key: "gold", label: t("form.instrumentOptions.gold") },
        { key: "indices", label: t("form.instrumentOptions.indices") },
        { key: "crypto", label: t("form.instrumentOptions.crypto") }
      ] as const,
    [t]
  );

  const bottleneckOptions = useMemo(
    () =>
      [
        { key: "discipline", label: t("form.bottleneckOptions.discipline") },
        { key: "perception", label: t("form.bottleneckOptions.perception") },
        { key: "structure", label: t("form.bottleneckOptions.structure") },
        { key: "risk", label: t("form.bottleneckOptions.risk") },
        { key: "review", label: t("form.bottleneckOptions.review") }
      ] as const,
    [t]
  );

  const intentOptions = useMemo(
    () =>
      [
        { key: "call", label: t("form.intentOptions.call") },
        { key: "biz", label: t("form.intentOptions.biz") },
        { key: "apply", label: t("form.intentOptions.apply") }
      ] as const,
    [t]
  );

  const [state, setState] = useState<FormState>({
    name: "",
    email: "",
    phone: null,
    wechat: "",
    intent: "call",
    message: "",
    instruments: [],
    bottleneck: "discipline"
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<{ phone?: string }>({});

  const hasPhoneDigits = (phone: PhoneFieldValue | null) =>
    Boolean(phone?.nationalNumber?.replace(/\D/g, "").length);

  const validate = () => {
    const nextErrors: { phone?: string } = {};
    if (hasPhoneDigits(state.phone) && !isPhoneValidByCountry(state.phone)) {
      nextErrors.phone = t("form.validation.invalidPhone");
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  function toggleInstrument(key: string) {
    setState((prev) => {
      const exists = prev.instruments.includes(key);
      return {
        ...prev,
        instruments: exists ? prev.instruments.filter((x) => x !== key) : [...prev.instruments, key]
      };
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError("");

    if (!validate()) {
      setStatus("idle");
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...state, locale })
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as any;
        throw new Error(data?.error || t("form.error"));
      }

      setStatus("success");
      setState({
        name: "",
        email: "",
        phone: null,
        wechat: "",
        intent: "call",
        message: "",
        instruments: [],
        bottleneck: "discipline"
      });
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || t("form.error"));
    }
  }

  return (
    <form onSubmit={onSubmit} className="fx-card p-8 !overflow-visible">
      <div className="relative z-40 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
            {t("form.name")}
          </span>
          <input
            value={state.name}
            onChange={(e) => setState((p) => ({ ...p, name: e.target.value }))}
            placeholder={t("form.placeholders.name")}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-200/40"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
            {t("form.email")}
          </span>
          <input
            type="email"
            required
            value={state.email}
            onChange={(e) => setState((p) => ({ ...p, email: e.target.value }))}
            placeholder={t("form.placeholders.email")}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-200/40"
          />
        </label>

        <div className="md:col-span-2 relative z-30">
          <PhoneField
            label={t("form.phoneGroup")}
            countryLabel={t("form.country")}
            phoneLabel={t("form.phone")}
            value={state.phone}
            onChange={(phone) => {
              setState((p) => ({ ...p, phone }));
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            defaultCountry={locale === "zh" ? "CN" : "US"}
            error={errors.phone}
          />
        </div>

        <label className="block">
          <span className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
            {t("form.wechat")}
          </span>
          <input
            value={state.wechat}
            onChange={(e) => setState((p) => ({ ...p, wechat: e.target.value }))}
            placeholder={t("form.placeholders.wechat")}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-200/40"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
            {t("form.intent")}
          </span>
          <select
            value={state.intent}
            onChange={(e) => setState((p) => ({ ...p, intent: e.target.value }))}
            className="fx-select mt-2"
          >
            {intentOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="fx-glass p-6">
          <div className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
            {t("form.instruments")}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {instrumentOptions.map((opt) => {
              const checked = state.instruments.includes(opt.key);
              return (
                <label
                  key={opt.key}
                  className="flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100/90"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleInstrument(opt.key)}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="fx-glass p-6">
          <div className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
            {t("form.bottleneck")}
          </div>
          <select
            value={state.bottleneck}
            onChange={(e) => setState((p) => ({ ...p, bottleneck: e.target.value }))}
            className="fx-select mt-4"
          >
            {bottleneckOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="mt-6 block">
        <span className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
          {t("form.message")}
        </span>
        <textarea
          value={state.message}
          onChange={(e) => setState((p) => ({ ...p, message: e.target.value }))}
          placeholder={t("form.placeholders.message")}
          rows={5}
          className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-200/40"
        />
      </label>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" className="fx-btn fx-btn-primary" disabled={status === "submitting"}>
          {status === "submitting" ? tCommon("ui.submitting") : tCommon("cta.submit")}
        </button>

        {status === "success" ? (
          <p className="text-sm font-semibold text-sky-300">{t("form.success")}</p>
        ) : null}

        {status === "error" ? (
          <p className="text-sm font-semibold text-rose-300">{error}</p>
        ) : null}
      </div>
    </form>
  );
}
