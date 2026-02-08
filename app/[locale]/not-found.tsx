import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "notFound" });

  return (
    <div className="py-20">
      <div className="fx-card mx-auto max-w-2xl p-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50">{t("title")}</h1>
        <p className="mt-4 text-base leading-7 text-slate-200/75">{t("lead")}</p>
        <div className="mt-8">
          <Link href="/" locale={locale} className="fx-btn fx-btn-primary">
            {t("cta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
