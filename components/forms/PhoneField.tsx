"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlagImage,
  defaultCountries,
  parseCountry,
  usePhoneInput,
  type CountryData,
  type CountryIso2,
  type ParsedCountry
} from "react-international-phone";
import { useLocale, useTranslations } from "next-intl";

export type PhoneFieldValue = {
  country: string; // ISO 3166-1 alpha-2 (uppercase, e.g. "CN")
  dialCode: string; // e.g. "+86"
  e164: string; // e.g. "+8613812345678"
  nationalNumber: string; // e.g. "13812345678"
};

type Props = {
  label: string;
  value: PhoneFieldValue | null;
  onChange: (next: PhoneFieldValue | null) => void;
  defaultCountry?: string; // uppercase preferred (e.g. "CN")
  required?: boolean;
  countryLabel?: string;
  phoneLabel?: string;
  error?: string;
};

function toCountryIso2(value: string | undefined): CountryIso2 {
  if (!value) return "us";
  const iso2 = value.trim().slice(0, 2).toLowerCase();
  if (!/^[a-z]{2}$/.test(iso2)) return "us";
  return iso2 as CountryIso2;
}

function buildPhoneValue(phoneE164: string, country: ParsedCountry): PhoneFieldValue {
  const dialCode = `+${country.dialCode}`;
  const normalized = phoneE164.startsWith("+") ? phoneE164 : `+${phoneE164}`;
  const nationalNumber = normalized.startsWith(dialCode)
    ? normalized.slice(dialCode.length)
    : normalized.replace(/^\+/, "");

  return {
    country: country.iso2.toUpperCase(),
    dialCode,
    e164: normalized,
    nationalNumber
  };
}

export function PhoneField({
  label,
  value,
  onChange,
  defaultCountry,
  required,
  countryLabel,
  phoneLabel,
  error
}: Props) {
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const queryRef = useRef<HTMLInputElement | null>(null);

  const displayNames = useMemo(() => {
    try {
      const language = locale === "zh" ? "zh-CN" : "en";
      return new Intl.DisplayNames([language], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  const countries = useMemo(() => {
    const mapped: CountryData[] = (defaultCountries as CountryData[]).map((data) => {
      const [name, iso2, dialCode, ...rest] = data as unknown as [string, string, string, ...unknown[]];
      const localized = displayNames?.of(String(iso2).toUpperCase()) || name;
      return [localized, iso2 as any, dialCode, ...(rest as any)] as any;
    });
    return mapped;
  }, [displayNames]);

  const countriesParsed = useMemo(() => countries.map((c) => parseCountry(c)), [countries]);

  const {
    inputValue,
    handlePhoneValueChange,
    country: activeCountry,
    setCountry
  } = usePhoneInput({
    defaultCountry: toCountryIso2(defaultCountry),
    value: value?.e164 ?? "",
    countries,
    forceDialCode: true,
    disableCountryGuess: true,
    onChange: ({ phone, country }) => {
      onChange(buildPhoneValue(phone, country));
    }
  });

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countriesParsed;
    return countriesParsed.filter((c) => {
      const name = c.name.toLowerCase();
      const iso2 = c.iso2.toLowerCase();
      const dial = `+${c.dialCode}`;
      return name.includes(q) || iso2.includes(q) || dial.includes(q);
    });
  }, [countriesParsed, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const node = dropdownRef.current;
      if (!node) return;
      if (e.target instanceof Node && !node.contains(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => queryRef.current?.focus(), 0);
  }, [open]);

  return (
    <div className="block">
      <div className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
        {label}
        {required ? <span className="text-rose-300"> *</span> : null}
      </div>

      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <div className="relative">
          <div className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
            {countryLabel ?? tCommon("form.country")}
          </div>
          <button
            type="button"
            className="mt-2 flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 text-left text-sm text-slate-50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <span className="flex min-w-0 items-center gap-3">
              <FlagImage iso2={activeCountry.iso2} size={20} className="block h-5 w-5 rounded-sm" />
              <span className="truncate font-medium">{activeCountry.name}</span>
            </span>
            <span className="shrink-0 font-mono text-xs text-slate-200/70 tabular-nums whitespace-nowrap">
              +{activeCountry.dialCode}
            </span>
          </button>

          {open ? (
            <div
              ref={dropdownRef}
              className="absolute z-50 mt-2 w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-[0_26px_90px_rgba(0,0,0,0.55)]"
            >
              <div className="border-b border-white/10 p-3">
                <input
                  ref={queryRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tCommon("ui.searchCountry")}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-200/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                />
              </div>

              <div className="max-h-72 overflow-auto p-2">
                {filteredCountries.map((c) => {
                  const selected = c.iso2 === activeCountry.iso2;
                  return (
                    <button
                      key={c.iso2}
                      type="button"
                      className={[
                        "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm transition-colors",
                        selected ? "bg-white/10 text-slate-50" : "text-slate-100/90 hover:bg-white/5"
                      ].join(" ")}
                      onClick={() => {
                        setCountry(c.iso2, { focusOnInput: true });
                        setQuery("");
                        setOpen(false);
                      }}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <FlagImage iso2={c.iso2} size={20} className="block h-5 w-5 rounded-sm" />
                        <span className="truncate font-medium">{c.name}</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs text-slate-200/70 tabular-nums whitespace-nowrap">
                        +{c.dialCode}
                      </span>
                    </button>
                  );
                })}

                {filteredCountries.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-slate-200/60">
                    {tCommon("ui.noResults")}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <label className="block">
          <div className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
            {phoneLabel ?? tCommon("form.phone")}
          </div>
          <input
            required={required}
            value={inputValue}
            onChange={handlePhoneValueChange}
            inputMode="tel"
            autoComplete="tel"
            className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-slate-50 placeholder:text-slate-200/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
            placeholder={tCommon("form.placeholders.phone")}
            aria-label={phoneLabel ?? tCommon("form.phone")}
          />
          {error ? <div className="mt-2 text-xs text-rose-300">{error}</div> : null}
        </label>
      </div>
    </div>
  );
}
