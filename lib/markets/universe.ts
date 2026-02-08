import type { Instrument } from "@/components/markets/context/MarketContext";

// Curated FX list: include only pairs that exist on TradingView.
export const FX_DIRECT: Instrument[] = [
  {
    id: "fx_direct_audusd",
    category: "fx_direct",
    symbolCode: "AUD/USD",
    nameZh: "澳元/美元",
    nameEn: "Australian Dollar / USD",
    tvSymbol: "FX:AUDUSD"
  },
  {
    id: "fx_direct_nzdusd",
    category: "fx_direct",
    symbolCode: "NZD/USD",
    nameZh: "纽元/美元",
    nameEn: "New Zealand Dollar / USD",
    tvSymbol: "FX:NZDUSD"
  },
  {
    id: "fx_direct_eurusd",
    category: "fx_direct",
    symbolCode: "EUR/USD",
    nameZh: "欧元/美元",
    nameEn: "Euro / USD",
    tvSymbol: "FX:EURUSD"
  },
  {
    id: "fx_direct_gbpusd",
    category: "fx_direct",
    symbolCode: "GBP/USD",
    nameZh: "英镑/美元",
    nameEn: "British Pound / USD",
    tvSymbol: "FX:GBPUSD"
  },
  {
    id: "fx_direct_usdcad",
    category: "fx_direct",
    symbolCode: "USD/CAD",
    nameZh: "美元/加元",
    nameEn: "USD / CAD",
    tvSymbol: "FX:USDCAD"
  },
  {
    id: "fx_direct_usdjpy",
    category: "fx_direct",
    symbolCode: "USD/JPY",
    nameZh: "美元/日元",
    nameEn: "USD / JPY",
    tvSymbol: "FX:USDJPY"
  },
  {
    id: "fx_direct_usdchf",
    category: "fx_direct",
    symbolCode: "USD/CHF",
    nameZh: "美元/瑞郎",
    nameEn: "USD / CHF",
    tvSymbol: "FX:USDCHF"
  },
  {
    id: "fx_direct_usdcnh",
    category: "fx_direct",
    symbolCode: "USD/CNH",
    nameZh: "美元/离岸人民�?,
    nameEn: "USD / CNH",
    tvSymbol: "FX:USDCNH"
  }
];

export const FX_CROSS: Instrument[] = [
  {
    id: "fx_cross_eurgbp",
    category: "fx_cross",
    symbolCode: "EUR/GBP",
    nameZh: "欧元/英镑",
    nameEn: "Euro / British Pound",
    tvSymbol: "FX:EURGBP"
  },
  {
    id: "fx_cross_eurjpy",
    category: "fx_cross",
    symbolCode: "EUR/JPY",
    nameZh: "欧元/日元",
    nameEn: "Euro / JPY",
    tvSymbol: "FX:EURJPY"
  },
  {
    id: "fx_cross_eurchf",
    category: "fx_cross",
    symbolCode: "EUR/CHF",
    nameZh: "欧元/瑞郎",
    nameEn: "Euro / CHF",
    tvSymbol: "FX:EURCHF"
  },
  {
    id: "fx_cross_euraud",
    category: "fx_cross",
    symbolCode: "EUR/AUD",
    nameZh: "欧元/澳元",
    nameEn: "Euro / AUD",
    tvSymbol: "FX:EURAUD"
  },
  {
    id: "fx_cross_eurcad",
    category: "fx_cross",
    symbolCode: "EUR/CAD",
    nameZh: "欧元/加元",
    nameEn: "Euro / CAD",
    tvSymbol: "FX:EURCAD"
  },
  {
    id: "fx_cross_eurnzd",
    category: "fx_cross",
    symbolCode: "EUR/NZD",
    nameZh: "欧元/纽元",
    nameEn: "Euro / NZD",
    tvSymbol: "FX:EURNZD"
  },
  {
    id: "fx_cross_gbpjpy",
    category: "fx_cross",
    symbolCode: "GBP/JPY",
    nameZh: "英镑/日元",
    nameEn: "GBP / JPY",
    tvSymbol: "FX:GBPJPY"
  },
  {
    id: "fx_cross_gbpchf",
    category: "fx_cross",
    symbolCode: "GBP/CHF",
    nameZh: "英镑/瑞郎",
    nameEn: "GBP / CHF",
    tvSymbol: "FX:GBPCHF"
  },
  {
    id: "fx_cross_gbpaud",
    category: "fx_cross",
    symbolCode: "GBP/AUD",
    nameZh: "英镑/澳元",
    nameEn: "GBP / AUD",
    tvSymbol: "FX:GBPAUD"
  },
  {
    id: "fx_cross_gbpcad",
    category: "fx_cross",
    symbolCode: "GBP/CAD",
    nameZh: "英镑/加元",
    nameEn: "GBP / CAD",
    tvSymbol: "FX:GBPCAD"
  },
  {
    id: "fx_cross_gbpnzd",
    category: "fx_cross",
    symbolCode: "GBP/NZD",
    nameZh: "英镑/纽元",
    nameEn: "GBP / NZD",
    tvSymbol: "FX:GBPNZD"
  },
  {
    id: "fx_cross_audjpy",
    category: "fx_cross",
    symbolCode: "AUD/JPY",
    nameZh: "澳元/日元",
    nameEn: "AUD / JPY",
    tvSymbol: "FX:AUDJPY"
  },
  {
    id: "fx_cross_audcad",
    category: "fx_cross",
    symbolCode: "AUD/CAD",
    nameZh: "澳元/加元",
    nameEn: "AUD / CAD",
    tvSymbol: "FX:AUDCAD"
  },
  {
    id: "fx_cross_audnzd",
    category: "fx_cross",
    symbolCode: "AUD/NZD",
    nameZh: "澳元/纽元",
    nameEn: "AUD / NZD",
    tvSymbol: "FX:AUDNZD"
  },
  {
    id: "fx_cross_nzdjpy",
    category: "fx_cross",
    symbolCode: "NZD/JPY",
    nameZh: "纽元/日元",
    nameEn: "NZD / JPY",
    tvSymbol: "FX:NZDJPY"
  },
  {
    id: "fx_cross_cadjpy",
    category: "fx_cross",
    symbolCode: "CAD/JPY",
    nameZh: "加元/日元",
    nameEn: "CAD / JPY",
    tvSymbol: "FX:CADJPY"
  },
  {
    id: "fx_cross_chfjpy",
    category: "fx_cross",
    symbolCode: "CHF/JPY",
    nameZh: "瑞郎/日元",
    nameEn: "CHF / JPY",
    tvSymbol: "FX:CHFJPY"
  }
];

export const METALS: Instrument[] = [
  {
    id: "metals_xauusd",
    category: "metals",
    symbolCode: "XAUUSD",
    nameZh: "黄金现货/美元",
    nameEn: "Gold Spot / USD",
    tvSymbol: "OANDA:XAUUSD"
  },
  {
    id: "metals_xagusd",
    category: "metals",
    symbolCode: "XAGUSD",
    nameZh: "白银现货/美元",
    nameEn: "Silver Spot / USD",
    tvSymbol: "OANDA:XAGUSD"
  },
  {
    id: "metals_xptusd",
    category: "metals",
    symbolCode: "XPTUSD",
    nameZh: "铂金/美元",
    nameEn: "Platinum / USD",
    tvSymbol: "OANDA:XPTUSD"
  },
  {
    id: "metals_xpdusd",
    category: "metals",
    symbolCode: "XPDUSD",
    nameZh: "钯金/美元",
    nameEn: "Palladium / USD",
    tvSymbol: "OANDA:XPDUSD"
  }
];

export const CRYPTO: Instrument[] = [
  {
    id: "crypto_btcusdt",
    category: "crypto",
    symbolCode: "BTCUSDT",
    nameZh: "比特�?USDT",
    nameEn: "Bitcoin / USDT",
    tvSymbol: "BINANCE:BTCUSDT"
  },
  {
    id: "crypto_ethusdt",
    category: "crypto",
    symbolCode: "ETHUSDT",
    nameZh: "以太�?USDT",
    nameEn: "Ethereum / USDT",
    tvSymbol: "BINANCE:ETHUSDT"
  },
  {
    id: "crypto_solusdt",
    category: "crypto",
    symbolCode: "SOLUSDT",
    nameZh: "Solana/USDT",
    nameEn: "Solana / USDT",
    tvSymbol: "BINANCE:SOLUSDT"
  },
  {
    id: "crypto_bnbusdt",
    category: "crypto",
    symbolCode: "BNBUSDT",
    nameZh: "BNB/USDT",
    nameEn: "BNB / USDT",
    tvSymbol: "BINANCE:BNBUSDT"
  },
  {
    id: "crypto_xrpusdt",
    category: "crypto",
    symbolCode: "XRPUSDT",
    nameZh: "XRP/USDT",
    nameEn: "XRP / USDT",
    tvSymbol: "BINANCE:XRPUSDT"
  }
];

export const INDICES: Instrument[] = [
  {
    id: "idx_spx",
    category: "indices",
    symbolCode: "SPX",
    nameZh: "标普500",
    nameEn: "S&P 500",
    tvSymbol: "TVC:SPX"
  },
  {
    id: "idx_ndx",
    category: "indices",
    symbolCode: "NDX",
    nameZh: "纳斯达克100",
    nameEn: "Nasdaq 100",
    tvSymbol: "TVC:NDX"
  },
  {
    id: "idx_dji",
    category: "indices",
    symbolCode: "DJI",
    nameZh: "道琼�?,
    nameEn: "Dow Jones",
    tvSymbol: "TVC:DJI"
  },
  {
    id: "idx_dax",
    category: "indices",
    symbolCode: "DAX",
    nameZh: "德国DAX",
    nameEn: "DAX",
    tvSymbol: "XETR:DAX"
  },
  {
    id: "idx_ftse",
    category: "indices",
    symbolCode: "UKX",
    nameZh: "英国富时100",
    nameEn: "FTSE 100",
    tvSymbol: "TVC:UKX"
  },
  {
    id: "idx_nikkei",
    category: "indices",
    symbolCode: "NI225",
    nameZh: "日经225",
    nameEn: "Nikkei 225",
    tvSymbol: "TVC:NI225"
  }
];

export const COMMODITIES: Instrument[] = [
  {
    id: "cmd_us_oil",
    category: "commodities",
    symbolCode: "USOIL",
    nameZh: "WTI原油",
    nameEn: "WTI Crude",
    tvSymbol: "TVC:USOIL"
  },
  {
    id: "cmd_uk_oil",
    category: "commodities",
    symbolCode: "UKOIL",
    nameZh: "布伦特原�?,
    nameEn: "Brent Crude",
    tvSymbol: "TVC:UKOIL"
  },
  {
    id: "cmd_ng",
    category: "commodities",
    symbolCode: "NGAS",
    nameZh: "天然�?,
    nameEn: "Natural Gas",
    tvSymbol: "TVC:NGAS"
  },
  {
    id: "cmd_copper",
    category: "commodities",
    symbolCode: "COPPER",
    nameZh: "�?,
    nameEn: "Copper",
    tvSymbol: "TVC:COPPER"
  }
];

export const STOCKS: Instrument[] = [
  {
    id: "stocks_aapl",
    category: "stocks",
    symbolCode: "AAPL",
    nameZh: "苹果",
    nameEn: "Apple",
    tvSymbol: "NASDAQ:AAPL"
  },
  {
    id: "stocks_msft",
    category: "stocks",
    symbolCode: "MSFT",
    nameZh: "微软",
    nameEn: "Microsoft",
    tvSymbol: "NASDAQ:MSFT"
  },
  {
    id: "stocks_tsla",
    category: "stocks",
    symbolCode: "TSLA",
    nameZh: "特斯�?,
    nameEn: "Tesla",
    tvSymbol: "NASDAQ:TSLA"
  },
  {
    id: "stocks_nvda",
    category: "stocks",
    symbolCode: "NVDA",
    nameZh: "英伟�?,
    nameEn: "NVIDIA",
    tvSymbol: "NASDAQ:NVDA"
  },
  {
    id: "stocks_amzn",
    category: "stocks",
    symbolCode: "AMZN",
    nameZh: "亚马�?,
    nameEn: "Amazon",
    tvSymbol: "NASDAQ:AMZN"
  },
  {
    id: "stocks_baba",
    category: "stocks",
    symbolCode: "BABA",
    nameZh: "阿里巴巴",
    nameEn: "Alibaba",
    tvSymbol: "NYSE:BABA"
  },
  {
    id: "stocks_tsm",
    category: "stocks",
    symbolCode: "TSM",
    nameZh: "台积�?,
    nameEn: "TSMC",
    tvSymbol: "NYSE:TSM"
  },
  {
    id: "stocks_0700",
    category: "stocks",
    symbolCode: "0700",
    nameZh: "腾讯控股",
    nameEn: "Tencent",
    tvSymbol: "HKEX:0700"
  },
  {
    id: "stocks_9988",
    category: "stocks",
    symbolCode: "9988",
    nameZh: "阿里巴巴-SW",
    nameEn: "Alibaba HK",
    tvSymbol: "HKEX:9988"
  },
  {
    id: "stocks_600519",
    category: "stocks",
    symbolCode: "600519",
    nameZh: "贵州茅台",
    nameEn: "Kweichow Moutai",
    tvSymbol: "SSE:600519"
  },
  {
    id: "stocks_601318",
    category: "stocks",
    symbolCode: "601318",
    nameZh: "中国平安",
    nameEn: "Ping An Insurance",
    tvSymbol: "SSE:601318"
  }
];

export function getUniverse(category: Instrument["category"]) {
  if (category === "fx_direct") return FX_DIRECT;
  if (category === "fx_cross") return FX_CROSS;
  if (category === "metals") return METALS;
  if (category === "crypto") return CRYPTO;
  if (category === "indices") return INDICES;
  if (category === "commodities") return COMMODITIES;
  if (category === "stocks") return STOCKS;
  return [
    ...FX_DIRECT,
    ...FX_CROSS,
    ...METALS,
    ...CRYPTO,
    ...INDICES,
    ...COMMODITIES,
    ...STOCKS
  ];
}
