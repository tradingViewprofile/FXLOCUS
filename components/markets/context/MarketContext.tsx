"use client";

import React from "react";

export type Locale = "zh" | "en";

export type Instrument = {
  id: string;
  category:
    | "fx_direct"
    | "fx_cross"
    | "metals"
    | "crypto"
    | "indices"
    | "commodities"
    | "stocks"
    | "all";
  symbolCode: string;
  nameZh?: string;
  nameEn?: string;
  tvSymbol: string;
};

type State = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  instrument: Instrument;
  setInstrument: (instrument: Instrument) => void;
};

const MarketContext = React.createContext<State | null>(null);

export function MarketProvider({
  locale,
  initialInstrument,
  children
}: {
  locale: Locale;
  initialInstrument: Instrument;
  children: React.ReactNode;
}) {
  const [loc, setLoc] = React.useState<Locale>(locale);
  const [instrument, setInstrument] = React.useState<Instrument>(initialInstrument);

  const value = React.useMemo(
    () => ({ locale: loc, setLocale: setLoc, instrument, setInstrument }),
    [loc, instrument]
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const ctx = React.useContext(MarketContext);
  if (!ctx) throw new Error("useMarket must be used within MarketProvider");
  return ctx;
}
