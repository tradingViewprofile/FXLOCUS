"use client";

import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Pillar } from "@/lib/mock/types";

type PillarMeta = {
  key: Pillar;
  label: string;
  title: string;
  slogan: string;
  keyPoints: string[];
  tags: string[];
  outputHint: string;
  position: string;
  scenarios: string[];
  pillars: Array<{ title: string; desc: string }>;
  steps: Array<{ title: string; definition: string }>;
  drills: Array<{ title: string; cadence: string }>;
  deliverables: string[];
  metrics: string[];
  antipatterns: string[];
  faq: Array<{ q: string; a: string }>;
  cta: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
};

type Labels = {
  keyPoints: string;
  tags: string;
  outputHint: string;
  position: string;
  scenarios: string;
  pillars: string;
  steps: string;
  stepDefinition: string;
  drills: string;
  deliverables: string;
  metrics: string;
  antipatterns: string;
  faq: string;
};

function parsePillarFromHash(hash: string): Pillar | null {
  const h = (hash || "").replace(/^#/, "").trim();
  if (h === "mind" || h === "market" || h === "price") return h;
  return null;
}

export function FrameworkPillarWorkbench({
  pillars,
  labels,
  links
}: {
  pillars: PillarMeta[];
  labels: Labels;
  links: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
}) {
  const reduceMotion = useReducedMotion();
  const [pillar, setPillar] = React.useState<Pillar>(pillars[0]?.key ?? "mind");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const initial = parsePillarFromHash(window.location.hash);
    if (initial) setPillar(initial);
  }, []);

  const active = pillars.find((p) => p.key === pillar) ?? pillars[0];

  return (
    <div className="mt-10 space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {pillars.map((meta) => {
          const isActive = meta.key === pillar;
          return (
            <button
              key={meta.key}
              type="button"
              onClick={() => {
                setPillar(meta.key);
                if (typeof window !== "undefined") window.history.replaceState(null, "", `#${meta.key}`);
              }}
              className={[
                "group relative rounded-3xl border px-6 py-5 text-left",
                "transition-[border-color,background-color,box-shadow,transform] duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40",
                isActive
                  ? "border-sky-400/40 bg-sky-500/10 shadow-[0_22px_60px_rgba(56,189,248,0.2)]"
                  : "border-white/10 bg-white/5 hover:-translate-y-1 hover:border-sky-400/25 hover:bg-white/10"
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="flex items-center justify-between gap-3">
                <Badge>{meta.label}</Badge>
              </div>
              <div className="mt-4 text-2xl font-semibold text-slate-50">{meta.title}</div>
              <p className="mt-2 text-sm leading-6 text-slate-200/70">{meta.slogan}</p>
              <div className="mt-4">
                <div className="text-[10px] font-semibold tracking-[0.2em] text-slate-200/50">
                  {labels.tags}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {meta.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              {isActive ? (
                <div className="mt-5 space-y-3">
                  <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
                    {labels.keyPoints}
                  </div>
                  <ul className="space-y-2 text-sm text-slate-200/75">
                    {meta.keyPoints.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-xs text-slate-100/80">
                    <span className="text-slate-200/60">{labels.outputHint}</span>
                    <span className="ml-2">{meta.outputHint}</span>
                  </div>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {active ? (
          <motion.div
            key={active.key}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
          >
            <Card className="p-7">
              <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-6">
                  <div>
                    <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
                      {labels.position}
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold text-slate-50">{active.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-200/70">{active.position}</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
                      {labels.scenarios}
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-200/75">
                      {active.scenarios.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
                      {labels.steps}
                    </div>
                    <div className="mt-4 space-y-3">
                      {active.steps.map((step, index) => (
                        <div
                          key={step.title}
                          className="rounded-2xl border border-white/10 bg-white/5 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-50">{step.title}</div>
                            <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold text-slate-200/60">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-slate-200/65">
                            <span className="text-slate-200/50">{labels.stepDefinition}</span>
                            <span className="ml-2">{step.definition}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
                      {labels.pillars}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-1">
                      {active.pillars.map((pillarItem) => (
                        <div
                          key={pillarItem.title}
                          className="rounded-2xl border border-white/10 bg-white/5 p-4"
                        >
                          <div className="text-sm font-semibold text-slate-50">{pillarItem.title}</div>
                          <p className="mt-2 text-xs leading-6 text-slate-200/70">
                            {pillarItem.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
                      {labels.drills}
                    </div>
                    <ul className="mt-3 space-y-3 text-sm text-slate-200/75">
                      {active.drills.map((drill) => (
                        <li key={drill.title} className="flex items-start justify-between gap-3">
                          <span className="leading-6">{drill.title}</span>
                          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200/65">
                            {drill.cadence}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
                        {labels.deliverables}
                      </div>
                      <ul className="mt-3 space-y-2 text-sm text-slate-200/75">
                        {active.deliverables.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
                        {labels.metrics}
                      </div>
                      <ul className="mt-3 space-y-2 text-sm text-slate-200/75">
                        {active.metrics.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300/70" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
                    {labels.antipatterns}
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200/75">
                    {active.antipatterns.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400/70" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
                    {labels.faq}
                  </div>
                  <div className="mt-3 space-y-3">
                    {active.faq.map((item, index) => (
                      <details
                        key={item.q}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                        open={index === 0}
                      >
                        <summary className="cursor-pointer text-sm font-semibold text-slate-50">
                          {item.q}
                        </summary>
                        <div className="mt-3 text-sm leading-6 text-slate-200/70">
                          {item.a}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={links.primary} variant="primary">
                  {active.cta.primary}
                </ButtonLink>
                <ButtonLink href={links.secondary} variant="secondary">
                  {active.cta.secondary}
                </ButtonLink>
                <ButtonLink
                  href={links.tertiary}
                  variant="secondary"
                  className="border-white/10 bg-transparent text-slate-200/80 hover:bg-white/5"
                >
                  {active.cta.tertiary}
                </ButtonLink>
              </div>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
