import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHero } from "@/components/marketing/PageHero";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import type { Locale, Pillar } from "@/lib/mock/types";
import { FrameworkPillarWorkbench } from "@/components/framework/FrameworkPillarWorkbench";

type Props = {
  params: { locale: Locale };
};

type TriangleAccent = "sky" | "emerald" | "amber";
type TriangleVertex = "top" | "left" | "right";

const triangleAccent = {
  sky: {
    border: "border-sky-400/30",
    glow: "shadow-[0_18px_60px_rgba(56,189,248,0.2)]",
    text: "text-sky-200",
    dot: "rgba(56,189,248,0.95)",
    halo: "rgba(56,189,248,0.22)"
  },
  emerald: {
    border: "border-emerald-400/30",
    glow: "shadow-[0_18px_60px_rgba(16,185,129,0.22)]",
    text: "text-emerald-200",
    dot: "rgba(16,185,129,0.95)",
    halo: "rgba(16,185,129,0.22)"
  },
  amber: {
    border: "border-amber-300/30",
    glow: "shadow-[0_18px_60px_rgba(251,191,36,0.2)]",
    text: "text-amber-200",
    dot: "rgba(251,191,36,0.92)",
    halo: "rgba(251,191,36,0.22)"
  }
} as const;

const triangleVertex = {
  top: { cx: 60, cy: 10 },
  left: { cx: 12, cy: 96 },
  right: { cx: 108, cy: 96 }
} as const;

function TriangleCard({
  title,
  desc,
  note,
  accent,
  vertex
}: {
  title: string;
  desc: string;
  note: string;
  accent: TriangleAccent;
  vertex: TriangleVertex;
}) {
  const style = triangleAccent[accent];
  const point = triangleVertex[vertex];
  return (
    <Card className={["p-6", style.border, style.glow].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-200/70">{desc}</p>
      <div className="mt-5 flex items-center justify-center">
        <svg viewBox="0 0 120 104" className="h-24 w-32">
          <polygon
            points="60 6 10 98 110 98"
            fill="none"
            stroke="rgba(148,163,184,0.45)"
            strokeWidth="1.6"
          />
          <circle cx={point.cx} cy={point.cy} r="6.5" fill={style.dot} />
          <circle cx={point.cx} cy={point.cy} r="14" fill={style.halo} />
        </svg>
      </div>
      <div className="mt-4 text-xs text-slate-200/65">{note}</div>
    </Card>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "seo" });
  return {
    title: t("frameworkTitle"),
    description: t("frameworkDesc")
  };
}

export default async function FrameworkPage({ params }: Props) {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: "framework" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const highlights = t.raw("hero.highlights") as string[];
  const modules = (["mind", "market", "price"] as Pillar[]).map((key) => ({
    key,
    label: tCommon(`labels.${key}` as any),
    title: t(`modules.items.${key}.title`),
    slogan: t(`modules.items.${key}.slogan`),
    keyPoints: t.raw(`modules.items.${key}.keyPoints`) as string[],
    tags: t.raw(`modules.items.${key}.tags`) as string[],
    outputHint: t(`modules.items.${key}.outputHint`),
    position: t(`modules.items.${key}.position`),
    scenarios: t.raw(`modules.items.${key}.scenarios`) as string[],
    pillars: t.raw(`modules.items.${key}.pillars`) as Array<{ title: string; desc: string }>,
    steps: t.raw(`modules.items.${key}.steps`) as Array<{ title: string; definition: string }>,
    drills: t.raw(`modules.items.${key}.drills`) as Array<{ title: string; cadence: string }>,
    deliverables: t.raw(`modules.items.${key}.deliverables`) as string[],
    metrics: t.raw(`modules.items.${key}.metrics`) as string[],
    antipatterns: t.raw(`modules.items.${key}.antipatterns`) as string[],
    faq: t.raw(`modules.items.${key}.faq`) as Array<{ q: string; a: string }>,
    cta: {
      primary: t(`modules.items.${key}.cta.primary`),
      secondary: t(`modules.items.${key}.cta.secondary`),
      tertiary: t(`modules.items.${key}.cta.tertiary`)
    }
  }));

  const triangleParagraphs = t.raw("triangle.body") as string[];
  const triangleTimeframes = t.raw("triangle.timeframes.items") as Array<{ k: string; v: string }>;

  return (
    <div className="space-y-14 md:space-y-20">
      <PageHero
        locale={locale}
        eyebrow={tCommon(locale === "en" ? "brandEn" : "brandCn")}
        title={t("hero.title")}
        subtitle={t("hero.subtitle")}
        highlights={highlights}
        ctas={[
          { href: "/programs", label: t("hero.cta.primary"), variant: "primary" },
          { href: "/contact", label: t("hero.cta.secondary"), variant: "secondary" }
        ]}
        riskNote={t("hero.risk")}
      />

            <Section
        id="modules"
        className="scroll-mt-24"
        eyebrow={t("modules.eyebrow")}
        title={t("modules.title")}
        lead={t("modules.lead")}
      >
        <div id="mind" className="scroll-mt-24" />
        <div id="market" className="scroll-mt-24" />
        <div id="price" className="scroll-mt-24" />
        <FrameworkPillarWorkbench
          pillars={modules}
          labels={{
            keyPoints: t("modules.labels.keyPoints"),
            tags: t("modules.labels.tags"),
            outputHint: t("modules.labels.outputHint"),
            position: t("modules.labels.position"),
            scenarios: t("modules.labels.scenarios"),
            pillars: t("modules.labels.pillars"),
            steps: t("modules.labels.steps"),
            stepDefinition: t("modules.labels.stepDefinition"),
            drills: t("modules.labels.drills"),
            deliverables: t("modules.labels.deliverables"),
            metrics: t("modules.labels.metrics"),
            antipatterns: t("modules.labels.antipatterns"),
            faq: t("modules.labels.faq")
          }}
          links={{
            primary: "/programs",
            secondary: "/downloads",
            tertiary: "/contact"
          }}
        />
      </Section>

      <Section
        id="triangle"
        eyebrow={t("triangle.eyebrow")}
        title={t("triangle.title")}
        lead={t("triangle.lead")}
      >
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <TriangleCard
            title={t("triangle.cards.winRate.title")}
            desc={t("triangle.cards.winRate.desc")}
            note={t("triangle.cards.winRate.note")}
            accent="sky"
            vertex="top"
          />
          <TriangleCard
            title={t("triangle.cards.rr.title")}
            desc={t("triangle.cards.rr.desc")}
            note={t("triangle.cards.rr.note")}
            accent="emerald"
            vertex="right"
          />
          <TriangleCard
            title={t("triangle.cards.freq.title")}
            desc={t("triangle.cards.freq.desc")}
            note={t("triangle.cards.freq.note")}
            accent="amber"
            vertex="left"
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-7">
            <div className="space-y-4 text-sm leading-7 text-slate-200/75">
              {triangleParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </Card>

          <Card className="p-7">
            <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
              {t("triangle.timeframes.title")}
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-200/75">
              {triangleTimeframes.map((item) => (
                <div key={item.k} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-xs font-semibold text-slate-100/80">{item.k}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-200/70">{item.v}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100/80">
              {t("triangle.timeframes.focus")}
            </div>
          </Card>
        </div>
      </Section>

      <Section
        eyebrow={t("sections.loopTitle")}
        title={t("sections.loopTitle")}
        lead={t("loop.lead")}
      >
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(["s1", "s2", "s3", "s4", "s5"] as const).map((key) => (
            <Card key={key} className="p-5 text-sm text-slate-200/80">
              <Badge>{t(`loop.steps.${key}.k`)}</Badge>
              <p className="mt-3 leading-6">{t(`loop.steps.${key}.v`)}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        eyebrow={t("sections.auditTitle")}
        title={t("sections.auditTitle")}
        lead={t("audit.lead")}
      >
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {(["a1", "a2", "a3", "a4"] as const).map((key) => (
            <Card key={key} className="p-7">
              <Badge>{t(`audit.items.${key}.k`)}</Badge>
              <h3 className="mt-4 text-lg font-semibold text-slate-50">
                {t(`audit.items.${key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-200/70">
                {t(`audit.items.${key}.desc`)}
              </p>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/programs" locale={locale} variant="primary">
            {t("cta.toPrograms")}
          </ButtonLink>
          <ButtonLink href="/contact" locale={locale} variant="secondary">
            {t("cta.bookCall")}
          </ButtonLink>
        </div>
      </Section>
    </div>
  );
}



