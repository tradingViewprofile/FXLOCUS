"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

function toNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value);
}

export function ToolsCalculators() {
  const t = useTranslations("tools");
  const tEnhance = useTranslations("tools.enhance");

  const [equity, setEquity] = useState("");
  const [riskPct, setRiskPct] = useState("");
  const [stopPips, setStopPips] = useState("");
  const [pipValue, setPipValue] = useState("");

  const position = useMemo(() => {
    const equityN = toNumber(equity);
    const riskPctN = toNumber(riskPct);
    const stopPipsN = toNumber(stopPips);
    const pipValueN = toNumber(pipValue);
    const riskAmt = equityN * (riskPctN / 100);
    const positionSize = stopPipsN > 0 && pipValueN > 0 ? riskAmt / (stopPipsN * pipValueN) : 0;
    return { riskAmt, positionSize };
  }, [equity, pipValue, riskPct, stopPips]);

  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");

  const rr = useMemo(() => {
    const entryN = toNumber(entry);
    const stopN = toNumber(stop);
    const targetN = toNumber(target);
    const risk = Math.abs(entryN - stopN);
    const reward = Math.abs(targetN - entryN);
    const ratio = risk > 0 ? reward / risk : 0;
    return { risk, reward, ratio };
  }, [entry, stop, target]);

  const [lots, setLots] = useState("");
  const [pips, setPips] = useState("");
  const [pipValue2, setPipValue2] = useState("");

  const pip = useMemo(() => {
    const lotsN = toNumber(lots);
    const pipsN = toNumber(pips);
    const pipValueN = toNumber(pipValue2);
    const pnl = lotsN * pipsN * pipValueN;
    return { pnl };
  }, [lots, pips, pipValue2]);

  return (
    <div className="space-y-10">
      <section id="position" className="fx-card p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50">{t("position.title")}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-200/75">{t("position.note")}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            {(
              [
                {
                  key: "equity",
                  value: equity,
                  set: setEquity,
                  placeholder: t("position.inputs.equity")
                },
                {
                  key: "riskPct",
                  value: riskPct,
                  set: setRiskPct,
                  placeholder: t("position.inputs.riskPct")
                },
                {
                  key: "stopPips",
                  value: stopPips,
                  set: setStopPips,
                  placeholder: t("position.inputs.stopPips")
                },
                {
                  key: "pipValue",
                  value: pipValue,
                  set: setPipValue,
                  placeholder: t("position.inputs.pipValue")
                }
              ] as const
            ).map((field) => (
              <label key={field.key} className="block">
                <span className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
                  {t(`position.inputs.${field.key}` as any)}
                </span>
                <input
                  inputMode="decimal"
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  placeholder={field.placeholder}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-200/40"
                />
              </label>
            ))}
          </div>

          <div className="fx-glass p-6">
            <div className="grid gap-4">
              <div>
                <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                  {t("position.outputs.riskAmt")}
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">
                  {formatNumber(position.riskAmt)}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
                  {t("position.outputs.positionSize")}
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">
                  {formatNumber(position.positionSize)}
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-2 text-sm text-slate-200/70">
              <p>{tEnhance("positionTips.t1")}</p>
              <p>{tEnhance("positionTips.t2")}</p>
              <p>{tEnhance("positionTips.t3")}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="rr" className="fx-card p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50">{t("rr.title")}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-200/75">{t("rr.note")}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            {(
              [
                { key: "entry", value: entry, set: setEntry },
                { key: "stop", value: stop, set: setStop },
                { key: "target", value: target, set: setTarget }
              ] as const
            ).map((field) => (
              <label key={field.key} className="block">
                <span className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
                  {t(`rr.inputs.${field.key}` as any)}
                </span>
                <input
                  inputMode="decimal"
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  placeholder={t(`rr.inputs.${field.key}` as any)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-200/40"
                />
              </label>
            ))}
          </div>

          <div className="fx-glass p-6">
            <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
              {t("rr.outputs.rr")}
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">
              {rr.ratio > 0 ? `${formatNumber(rr.ratio)} : 1` : "-"}
            </div>
            <div className="mt-6 space-y-2 text-sm text-slate-200/70">
              <p>{tEnhance("rrTips.t1")}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pip" className="fx-card p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50">{t("pip.title")}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-200/75">{t("pip.note")}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            {(
              [
                { key: "lots", value: lots, set: setLots },
                { key: "pips", value: pips, set: setPips },
                { key: "pipValue", value: pipValue2, set: setPipValue2 }
              ] as const
            ).map((field) => (
              <label key={field.key} className="block">
                <span className="text-xs font-semibold tracking-[0.14em] text-slate-200/60">
                  {t(`pip.inputs.${field.key}` as any)}
                </span>
                <input
                  inputMode="decimal"
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  placeholder={t(`pip.inputs.${field.key}` as any)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-200/40"
                />
              </label>
            ))}
          </div>

          <div className="fx-glass p-6">
            <div className="text-xs font-semibold tracking-[0.16em] text-slate-200/60">
              {t("pip.outputs.pnl")}
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">
              {pipValue2 && lots && pips ? formatNumber(pip.pnl) : "-"}
            </div>
            <div className="mt-6 space-y-2 text-sm text-slate-200/70">
              <p>{tEnhance("pipTips.t1")}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

