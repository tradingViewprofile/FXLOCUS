import type { ReactNode } from "react";

import { ButtonLink } from "@/components/ui/Button";
import type { Locale } from "@/i18n/routing";

type Cta = {
  href: string;
  label: ReactNode;
  variant: "primary" | "secondary";
};

type Props = {
  locale?: Locale;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle: ReactNode;
  highlights: Array<ReactNode>;
  ctas?: Cta[];
  riskNote?: ReactNode;
};

export function PageHero({ locale, eyebrow, title, subtitle, highlights, ctas, riskNote }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950/40 px-6 py-12 md:px-10 md:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -top-16 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative">
        {eyebrow ? <span className="fx-eyebrow">{eyebrow}</span> : null}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <div>
            <h1 className="fx-title-jump text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200/75 md:text-lg">
              {subtitle}
            </p>

            {ctas?.length ? (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {ctas.slice(0, 2).map((cta) => (
                  <ButtonLink
                    key={`${cta.href}-${cta.variant}`}
                    href={cta.href}
                    locale={locale}
                    variant={cta.variant}
                  >
                    {cta.label}
                  </ButtonLink>
                ))}
              </div>
            ) : null}

            {riskNote ? (
              <p className="mt-6 text-xs leading-5 text-slate-200/60">
                {riskNote}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {highlights.slice(0, 3).map((item, index) => (
              <div
                key={index}
                className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm leading-6 text-slate-200/80"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                  <span>{item}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

