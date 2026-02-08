"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

export function FooterBrand() {
  const t = useTranslations("footer");

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Image
          src="/brand/logo-mark.svg"
          width={36}
          height={36}
          alt={t("brand.primary")}
          className="h-9 w-9"
        />

        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-[0.14em] text-slate-50">
            {t("brand.primary")}
          </div>
          <div className="mt-1 text-xs tracking-[0.18em] text-slate-200/60">
            {t("brand.secondary")}
          </div>
        </div>
      </div>

      <div className="text-xs tracking-[0.18em] text-slate-200/60">
        {t("brand.subtitle")}
      </div>
      <div className="text-sm font-semibold text-slate-100/85">
        {t("brand.tagline")}
      </div>
      <p className="text-xs leading-5 text-slate-200/60">
        {t("brand.description")}
      </p>
    </div>
  );
}

