"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

function toNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value);
}

export function ToolsQuickCards() {
  const t = useTranslations("tools");

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
    const size = stopPipsN > 0 && pipValueN > 0 ? riskAmt / (stopPipsN * pipValueN) : 0;
    return { riskAmt, size };
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
    return { ratio, risk, reward };
  }, [entry, stop, target]);

  const [lots, setLots] = useState("");
  const [pips, setPips] = useState("");
  const [pipValue2, setPipValue2] = useState("");

  const pnl = useMemo(() => {
    const lotsN = toNumber(lots);
    const pipsN = toNumber(pips);
    const pipValueN = toNumber(pipValue2);
    return lotsN * pipsN * pipValueN;
  }, [lots, pips, pipValue2]);

  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-200/40";

  return (
    <div className="mt-10 grid gap-4 md:grid-cols-3">
      <div className="fx-card flex flex-col gap-4 p-6">
        <div>
          <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
            {t("quick.calc")}
          </div>
          <h3 className="mt-3 text-xl font-semibold text-slate-50">{t("position.title")}</h3>
          <p className="mt-2 text-sm text-slate-200/70">{t("position.note")}</p>
        </div>

        <div className="grid gap-3">
          <label className="text-xs text-slate-200/70">
            {t("position.inputs.equity")}
            <input
              inputMode="decimal"
              value={equity}
              onChange={(e) => setEquity(e.target.value)}
              placeholder={t("position.inputs.equity")}
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-200/70">
              {t("position.inputs.riskPct")}
              <input
                inputMode="decimal"
                value={riskPct}
                onChange={(e) => setRiskPct(e.target.value)}
                placeholder={t("position.inputs.riskPct")}
                className={inputClass}
              />
            </label>
            <label className="text-xs text-slate-200/70">
              {t("position.inputs.stopPips")}
              <input
                inputMode="decimal"
                value={stopPips}
                onChange={(e) => setStopPips(e.target.value)}
                placeholder={t("position.inputs.stopPips")}
                className={inputClass}
              />
            </label>
          </div>
          <label className="text-xs text-slate-200/70">
            {t("position.inputs.pipValue")}
            <input
              inputMode="decimal"
              value={pipValue}
              onChange={(e) => setPipValue(e.target.value)}
              placeholder={t("position.inputs.pipValue")}
              className={inputClass}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100/90">
          <div className="text-xs text-slate-200/60">{t("position.outputs.riskAmt")}</div>
          <div className="mt-1 text-lg font-semibold">{formatNumber(position.riskAmt)}</div>
          <div className="mt-2 text-xs text-slate-200/60">{t("position.outputs.positionSize")}</div>
          <div className="mt-1 text-lg font-semibold">{formatNumber(position.size)}</div>
        </div>

        <Link href="#position" className="fx-btn fx-btn-secondary w-full justify-center">
          {t("quick.ctaFull")}
        </Link>
      </div>

      <div className="fx-card flex flex-col gap-4 p-6">
        <div>
          <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
            {t("quick.check")}
          </div>
          <h3 className="mt-3 text-xl font-semibold text-slate-50">{t("rr.title")}</h3>
          <p className="mt-2 text-sm text-slate-200/70">{t("rr.note")}</p>
        </div>

        <div className="grid gap-3">
          {["entry", "stop", "target"].map((key) => (
            <label key={key} className="text-xs text-slate-200/70">
              {t(`rr.inputs.${key}` as const)}
              <input
                inputMode="decimal"
                value={key === "entry" ? entry : key === "stop" ? stop : target}
                onChange={(e) => {
                  const v = e.target.value;
                  if (key === "entry") setEntry(v);
                  if (key === "stop") setStop(v);
                  if (key === "target") setTarget(v);
                }}
                placeholder={t(`rr.inputs.${key}` as const)}
                className={inputClass}
              />
            </label>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100/90">
          <div className="text-xs text-slate-200/60">{t("rr.outputs.rr")}</div>
          <div className="mt-1 text-lg font-semibold">
            {rr.ratio > 0 ? `${formatNumber(rr.ratio)} : 1` : "-"}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-slate-200/60">
            <div>
              <div>{t("quick.risk")}</div>
              <div className="text-sm text-slate-100/90">{formatNumber(rr.risk)}</div>
            </div>
            <div>
              <div>{t("quick.reward")}</div>
              <div className="text-sm text-slate-100/90">{formatNumber(rr.reward)}</div>
            </div>
          </div>
        </div>

        <Link href="#rr" className="fx-btn fx-btn-secondary w-full justify-center">
          {t("quick.ctaDetail")}
        </Link>
      </div>

      <div className="fx-card flex flex-col gap-4 p-6">
        <div>
          <div className="text-xs font-semibold tracking-[0.18em] text-slate-200/60">
            {t("quick.convert")}
          </div>
          <h3 className="mt-3 text-xl font-semibold text-slate-50">{t("pip.title")}</h3>
          <p className="mt-2 text-sm text-slate-200/70">{t("pip.note")}</p>
        </div>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-200/70">
              {t("pip.inputs.lots")}
              <input
                inputMode="decimal"
                value={lots}
                onChange={(e) => setLots(e.target.value)}
                placeholder={t("pip.inputs.lots")}
                className={inputClass}
              />
            </label>
            <label className="text-xs text-slate-200/70">
              {t("pip.inputs.pips")}
              <input
                inputMode="decimal"
                value={pips}
                onChange={(e) => setPips(e.target.value)}
                placeholder={t("pip.inputs.pips")}
                className={inputClass}
              />
            </label>
          </div>
          <label className="text-xs text-slate-200/70">
            {t("pip.inputs.pipValue")}
            <input
              inputMode="decimal"
              value={pipValue2}
              onChange={(e) => setPipValue2(e.target.value)}
              placeholder={t("pip.inputs.pipValue")}
              className={inputClass}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100/90">
          <div className="text-xs text-slate-200/60">{t("pip.outputs.pnl")}</div>
          <div className="mt-1 text-lg font-semibold">
            {pipValue2 && lots && pips ? formatNumber(pnl) : "-"}
          </div>
        </div>

        <Link href="#pip" className="fx-btn fx-btn-secondary w-full justify-center">
          {t("quick.ctaFull")}
        </Link>
      </div>
    </div>
  );
}
