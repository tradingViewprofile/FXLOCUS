import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type Props = {
  params: { locale: Locale };
};

export const dynamic = "force-static";
export const revalidate = 86400;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("aboutTitle"),
    description: t("aboutDesc")
  };
}

export default async function AboutPage({ params }: Props) {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: "about" });
  const heroBullets = t.raw("hero.bullets") as { title: string; desc: string }[];
  const heroPanelItems = t.raw("hero.panel.items") as { title: string; desc: string }[];
  const heroPanelMetrics = t.raw("hero.panel.metrics") as { label: string; desc: string }[];
  const trustItems = t.raw("trust.items") as { title: string; desc: string }[];
  const methodSteps = t.raw("method.steps") as {
    step: string;
    title: string;
    goal: string;
    deliverable: string;
  }[];
  const moduleItems = t.raw("modules.items") as {
    title: string;
    input: string;
    action: string;
    output: string;
  }[];
  const moduleDeliverables = t.raw("modules.deliverables.items") as string[];
  const fitGood = t.raw("fit.good") as string[];
  const fitBad = t.raw("fit.bad") as string[];
  const metricsItems = t.raw("metrics.items") as { title: string; desc: string }[];
  const processSteps = t.raw("process.steps") as { title: string; desc: string }[];
  const prepItems = t.raw("process.prepItems") as string[];
  const faqItems = t.raw("faq.items") as { q: string; a: string }[];
  const bulletSeparator = locale === "zh" ? "ï¼? : ": ";

  return (
    <div className="space-y-0">
      <section className="fx-section">
        <div className="fx-container">
          <div className="grid gap-6 lg:min-h-[560px] lg:grid-cols-[7fr_5fr] lg:items-center">
            <div className="space-y-6">
              <span className="fx-eyebrow">{t("hero.badge")}</span>
              <h1 className="text-[34px] font-semibold leading-[1.15] text-[color:var(--text)] md:text-[52px]">
                {t("hero.title")}
              </h1>
              <p className="text-[16px] leading-[1.75] text-[color:var(--text-secondary)]">
                {t("hero.subtitle")}
              </p>
              <ul className="space-y-3">
                {heroBullets.map((item) => (
                  <li key={item.title} className="flex gap-3 text-[15px] leading-[1.6]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--accent)]" />
                    <span>
                      <span className="font-semibold text-[color:var(--text)]">{item.title}</span>
                      <span className="text-[color:var(--text-secondary)]">
                        {bulletSeparator}
                        {item.desc}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/contact" locale={locale} className="fx-btn fx-btn-primary">
                  {t("hero.cta.primary")}
                </Link>
                <Link href="#method-framework" locale={locale} className="fx-btn fx-btn-secondary">
                  {t("hero.cta.secondary")}
                </Link>
              </div>
              <p className="text-[13px] leading-[1.6] text-[color:var(--text-muted)]">
                {t("hero.compliance")}
              </p>
            </div>

            <Card className="p-6 md:p-8">
              <h2 className="text-[20px] font-semibold leading-[1.3] text-[color:var(--text)]">
                {t("hero.panel.title")}
              </h2>
              <div className="mt-6 space-y-3">
                {heroPanelItems.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[var(--radius-card-sm)] border border-[color:var(--border)] bg-[color:var(--bg-1)] px-4 py-3"
                  >
                    <div className="text-[14px] font-semibold text-[color:var(--text)]">{item.title}</div>
                    <div className="mt-1 text-[13px] leading-[1.6] text-[color:var(--text-secondary)]">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
                  {t("hero.panel.metricsTitle")}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {heroPanelMetrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-[var(--radius-card-sm)] border border-[color:var(--border)] bg-[color:var(--panel)] px-4 py-3"
                    >
                      <div className="text-[14px] font-semibold text-[color:var(--text)]">{metric.label}</div>
                      <div className="mt-1 text-[12px] leading-[1.6] text-[color:var(--text-secondary)]">
                        {metric.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-5 text-[13px] leading-[1.6] text-[color:var(--text-secondary)]">
                {t("hero.panel.footer")}
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-[color:var(--bg-1)] py-6 md:py-8">
        <div className="fx-container">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item) => (
              <div
                key={item.title}
                className="rounded-[var(--radius-card-sm)] border border-[color:var(--border)] bg-[color:var(--panel)] px-4 py-4"
              >
                <div className="text-[15px] font-semibold text-[color:var(--text)]">{item.title}</div>
                <div className="mt-1 text-[13px] leading-[1.6] text-[color:var(--text-secondary)]">
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="method-framework" className="fx-section">
        <div className="fx-container space-y-8">
          <div>
            <h2 className="text-[24px] font-semibold leading-[1.2] text-[color:var(--text)] md:text-[32px]">
              {t("method.title")}
            </h2>
            <p className="mt-3 text-[16px] leading-[1.75] text-[color:var(--text-secondary)]">
              {t("method.lead")}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {methodSteps.map((step) => (
              <Card key={step.title} className="flex h-full flex-col gap-4 p-6">
                <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
                  {step.step}
                </div>
                <h3 className="text-[20px] font-semibold leading-[1.3] text-[color:var(--text)]">{step.title}</h3>
                <p className="text-[14px] leading-[1.6] text-[color:var(--text-secondary)]">
                  {step.goal}
                </p>
                <div className="mt-auto rounded-[var(--radius-card-sm)] border border-[color:var(--border)] bg-[color:var(--bg-1)] px-4 py-3">
                  <div className="text-[12px] font-semibold text-[color:var(--text-muted)]">
                    {t("method.outputLabel")}
                  </div>
                  <div className="text-[13px] leading-[1.6] text-[color:var(--text-secondary)]">
                    {step.deliverable}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="fx-section bg-[color:var(--bg-1)]">
        <div className="fx-container space-y-8">
          <div>
            <h2 className="text-[24px] font-semibold leading-[1.2] text-[color:var(--text)] md:text-[32px]">
              {t("modules.title")}
            </h2>
            <p className="mt-3 text-[16px] leading-[1.75] text-[color:var(--text-secondary)]">
              {t("modules.lead")}
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[7fr_5fr]">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {moduleItems.map((module) => (
                <Card key={module.title} className="flex h-full flex-col gap-4 p-5">
                  <h3 className="text-[18px] font-semibold leading-[1.3] text-[color:var(--text)]">
                    {module.title}
                  </h3>
                  <div className="space-y-2 text-[14px] leading-[1.6] text-[color:var(--text-secondary)]">
                    <p>
                      {t("modules.labels.input")}
                      {module.input}
                    </p>
                    <p>
                      {t("modules.labels.action")}
                      {module.action}
                    </p>
                    <p>
                      {t("modules.labels.output")}
                      {module.output}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
            <Card className="p-6">
              <h3 className="text-[20px] font-semibold leading-[1.3] text-[color:var(--text)]">
                {t("modules.deliverables.title")}
              </h3>
              <ul className="mt-4 space-y-2 text-[14px] leading-[1.6] text-[color:var(--text-secondary)]">
                {moduleDeliverables.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--accent)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-[13px] leading-[1.6] text-[color:var(--text-muted)]">
                {t("modules.deliverables.note")}
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="fx-section">
        <div className="fx-container space-y-8">
          <div>
            <h2 className="text-[24px] font-semibold leading-[1.2] text-[color:var(--text)] md:text-[32px]">
              {t("fit.title")}
            </h2>
            <p className="mt-3 text-[16px] leading-[1.75] text-[color:var(--text-secondary)]">
              {t("fit.lead")}
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h3 className="text-[20px] font-semibold leading-[1.3] text-[color:var(--text)]">
                {t("fit.goodTitle")}
              </h3>
              <ul className="mt-4 space-y-2 text-[14px] leading-[1.6] text-[color:var(--text-secondary)]">
                {fitGood.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-6">
              <h3 className="text-[20px] font-semibold leading-[1.3] text-[color:var(--text)]">
                {t("fit.badTitle")}
              </h3>
              <ul className="mt-4 space-y-2 text-[14px] leading-[1.6] text-[color:var(--text-secondary)]">
                {fitBad.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      <section className="fx-section bg-[color:var(--bg-1)]">
        <div className="fx-container grid gap-6 lg:grid-cols-[5fr_7fr]">
          <div>
            <h2 className="text-[24px] font-semibold leading-[1.2] text-[color:var(--text)] md:text-[32px]">
              {t("metrics.title")}
            </h2>
            <p className="mt-3 text-[16px] leading-[1.75] text-[color:var(--text-secondary)]">
              {t("metrics.lead")}
            </p>
            <p className="mt-4 text-[13px] leading-[1.6] text-[color:var(--text-muted)]">{t("metrics.note")}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {metricsItems.map((metric) => (
              <Card key={metric.title} className="p-5">
                <h3 className="text-[18px] font-semibold leading-[1.3] text-[color:var(--text)]">
                  {metric.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-[color:var(--text-secondary)]">
                  {metric.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="fx-section">
        <div className="fx-container space-y-8">
          <h2 className="text-[24px] font-semibold leading-[1.2] text-[color:var(--text)] md:text-[32px]">
            {t("process.title")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((step, index) => (
              <Card key={step.title} className="flex h-full flex-col gap-3 p-5">
                <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
                  Step {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="text-[18px] font-semibold leading-[1.3] text-[color:var(--text)]">
                  {step.title}
                </h3>
                <p className="text-[14px] leading-[1.6] text-[color:var(--text-secondary)]">{step.desc}</p>
              </Card>
            ))}
          </div>
          <Card className="p-6">
            <h3 className="text-[20px] font-semibold leading-[1.3] text-[color:var(--text)]">
              {t("process.prepTitle")}
            </h3>
            <ul className="mt-4 space-y-2 text-[14px] leading-[1.6] text-[color:var(--text-secondary)]">
              {prepItems.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="fx-section">
        <div className="fx-container space-y-6">
          <h2 className="text-[24px] font-semibold leading-[1.2] text-[color:var(--text)] md:text-[32px]">
            {t("faq.title")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="rounded-[var(--radius-card-sm)] border border-[color:var(--border)] bg-[color:var(--panel)] px-4 py-3"
              >
                <summary className="cursor-pointer text-[15px] font-semibold text-[color:var(--text)]">
                  {item.q}
                </summary>
                <p className="mt-2 text-[14px] leading-[1.6] text-[color:var(--text-secondary)]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="fx-section bg-[color:var(--bg-1)]">
        <div className="fx-container">
          <div className="fx-card p-8 md:p-10">
            <h2 className="text-[24px] font-semibold leading-[1.2] text-[color:var(--text)] md:text-[32px]">
              {t("final.title")}
            </h2>
            <p className="mt-3 text-[16px] leading-[1.75] text-[color:var(--text-secondary)]">
              {t("final.lead")}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" locale={locale} className="fx-btn fx-btn-primary">
                {t("final.primary")}
              </Link>
              <Link href="/downloads" locale={locale} className="fx-btn fx-btn-secondary">
                {t("final.secondary")}
              </Link>
            </div>
            <p className="mt-4 text-[13px] leading-[1.6] text-[color:var(--text-muted)]">
              {t("final.note")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
