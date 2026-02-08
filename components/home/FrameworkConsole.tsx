"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type TabId = "market" | "mind" | "price" | "execution";

const TAB_ORDER: TabId[] = ["market", "mind", "price", "execution"];

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function FrameworkConsole() {
  const t = useTranslations("home");
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<TabId>("market");

  const tabs = useMemo(
    () =>
      TAB_ORDER.map((id) => ({
        id,
        label: t(`hero.console.tabs.${id}`)
      })),
    [t]
  );

  const panelKey = `hero.console.panels.${activeTab}` as const;
  const outputs = asStringArray(t.raw(`${panelKey}.outputs`));
  const loopSteps = asStringArray(t.raw("hero.console.loop.steps"));

  const progressIndex = useMemo(() => {
    const indexByTab: Record<TabId, number> = {
      market: 0,
      mind: 1,
      price: 2,
      execution: 3
    };
    return indexByTab[activeTab];
  }, [activeTab]);

  return (
    <Card
      variant="glass"
      className="relative overflow-hidden border-white/[0.15] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(56,189,248,0.18),transparent_55%)]" />
      <div className="relative space-y-6 p-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "fx-tab relative rounded-full px-3 py-1 text-xs font-semibold tracking-[0.14em] transition-colors",
                    active
                      ? "bg-white/10 text-slate-50 fx-tab-active"
                      : "text-slate-200/65 hover:bg-white/5 hover:text-slate-50"
                  ].join(" ")}
                  aria-pressed={active}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-[0.16em] text-slate-200/55">
              {t("hero.console.status")}
            </span>
            <span className="relative inline-flex h-2.5 w-2.5 items-center justify-center">
              <span className="absolute h-2.5 w-2.5 rounded-full bg-emerald-400/25" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="space-y-6"
          >
            <div>
              <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/55">
                {t("hero.console.definitionLabel")}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-100/85">
                {t(`${panelKey}.definition`)}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/55">
                  {t("hero.console.outputsLabel")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {outputs.slice(0, 3).map((item) => (
                    <Badge
                      key={item}
                      className="border-white/[0.12] bg-white/[0.06] text-slate-100/85"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="fx-glass border-white/[0.12] bg-white/[0.06] p-5">
                <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/55">
                  {t("hero.console.metricLabel")}
                </div>
                <div className="mt-3 text-lg font-semibold tracking-tight text-slate-50">
                  {t(`${panelKey}.metric`)}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/55">
              {t("hero.console.loop.title")}
            </div>
            <span className="text-xs font-semibold tracking-[0.16em] text-slate-200/45">
              {t("hero.console.loop.subtitle")}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {loopSteps.slice(0, 5).map((label, idx) => {
              const active = idx <= progressIndex;
              return (
                <div
                  key={label}
                  className={[
                    "rounded-2xl border px-2 py-2 text-center text-[11px] font-semibold tracking-[0.12em] transition-colors",
                    active
                      ? "border-sky-400/25 bg-sky-400/10 text-slate-50"
                      : "border-white/10 bg-white/[0.04] text-slate-200/55"
                  ].join(" ")}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
