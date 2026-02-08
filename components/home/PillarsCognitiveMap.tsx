"use client";

import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Card } from "@/components/ui/Card";
import { Link } from "@/i18n/navigation";

type PillarKey = "mind" | "market" | "price";

type Pillar = {
  key: PillarKey;
  label: string;
  title: string;
  def: string;
  points: string[];
  href: string;
};

export function PillarsCognitiveMap({
  title,
  subtitle,
  pillars,
  ctaLabel
}: {
  title: string;
  subtitle: string;
  pillars: Pillar[];
  ctaLabel: string;
}) {
  const reduceMotion = useReducedMotion();
  const orderedPillars = React.useMemo(() => {
    const byKey = new Map(pillars.map((pillar) => [pillar.key, pillar]));
    return (["mind", "market", "price"] as PillarKey[]).map((key) => byKey.get(key)).filter(Boolean) as Pillar[];
  }, [pillars]);
  const [active, setActive] = React.useState<PillarKey>((orderedPillars[0]?.key ?? "mind") as PillarKey);
  const activePillar = orderedPillars.find((p) => p.key === active) ?? orderedPillars[0];

  React.useEffect(() => {
    if (orderedPillars.length === 0) return;
    if (!orderedPillars.some((p) => p.key === active)) {
      setActive(orderedPillars[0].key);
    }
  }, [active, orderedPillars]);

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.18),transparent_45%),radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(circle_at_70%_90%,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-6 rounded-[28px] border border-white/10 bg-white/5" />
        <div className="pointer-events-none absolute inset-10 rounded-[24px] border border-white/10 bg-slate-950/50" />
        <div className="pointer-events-none absolute -left-12 top-8 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative z-10 space-y-5">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-200/60">{title}</div>
            <div className="mt-2 text-xs leading-5 text-slate-200/70">{subtitle}</div>
          </div>

          <div className="space-y-3">
            {orderedPillars.map((pillar, index) => {
              const isActive = pillar.key === active;
              const preview = pillar.points[0] ?? pillar.def;
              return (
                <motion.button
                  key={pillar.key}
                  type="button"
                  onClick={() => setActive(pillar.key)}
                  className={[
                    "group relative w-full overflow-hidden rounded-2xl px-5 py-4 text-left",
                    "transition-[background-color,box-shadow,transform] duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40",
                    isActive
                      ? "bg-sky-500/10 shadow-[0_18px_48px_rgba(56,189,248,0.18)]"
                      : "bg-white/5 hover:bg-white/10"
                  ].join(" ")}
                  aria-pressed={isActive}
                  whileHover={reduceMotion ? undefined : { y: -2 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                >
                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-200/60">{pillar.label}</div>
                      <div className="mt-1 text-base font-semibold text-slate-50">{pillar.title}</div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200/70">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="relative z-10 mt-2 line-clamp-2 text-xs leading-5 text-slate-200/70">{preview}</div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activePillar ? (
          <motion.div
            key={activePillar.key}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
          >
            <Card className="p-7">
              <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">{activePillar.label}</div>
              <h3 className="mt-3 text-2xl font-semibold text-slate-50">{activePillar.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-200/70">{activePillar.def}</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-200/75">
                {activePillar.points.slice(0, 3).map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Link href={activePillar.href} className="mt-5 inline-flex text-sm font-semibold text-sky-300 hover:text-sky-200">
                {ctaLabel}
              </Link>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
