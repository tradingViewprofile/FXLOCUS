export type SourcePolicy = "full" | "excerpt_only" | "metadata_only";

export type SourceDef = {
  name: string;
  type: "rss" | "official" | "licensed_api";
  url: string;
  logo_url?: string;
  enabled: boolean;
  content_policy: SourcePolicy;
  auto_publish?: boolean;
  language_mode?: "bilingual" | "en_only" | "zh_only";
};

export const DEFAULT_SOURCES: SourceDef[] = [
  {
    name: "FXStreet News",
    type: "rss",
    url: "https://www.fxstreet.com/rss/news",
    enabled: true,
    content_policy: "excerpt_only",
    auto_publish: true,
    language_mode: "bilingual"
  },
  {
    name: "FXStreet Analysis",
    type: "rss",
    url: "https://www.fxstreet.com/rss/analysis",
    enabled: true,
    content_policy: "excerpt_only",
    auto_publish: true,
    language_mode: "bilingual"
  },
  {
    name: "DailyFX",
    type: "rss",
    url: "https://www.dailyfx.com/feeds/market-news",
    enabled: true,
    content_policy: "excerpt_only",
    auto_publish: true,
    language_mode: "bilingual"
  },
  {
    name: "Federal Reserve",
    type: "official",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
    enabled: true,
    content_policy: "metadata_only",
    auto_publish: true,
    language_mode: "en_only"
  },
  {
    name: "EIA (Energy Information Administration)",
    type: "official",
    url: "https://www.eia.gov/rss/overview.xml",
    enabled: true,
    content_policy: "metadata_only",
    auto_publish: true,
    language_mode: "en_only"
  },
  {
    name: "Reuters",
    type: "licensed_api",
    url: "reuters://feed",
    enabled: false,
    content_policy: "metadata_only",
    auto_publish: false,
    language_mode: "en_only"
  },
  {
    name: "Bloomberg",
    type: "licensed_api",
    url: "bloomberg://feed",
    enabled: false,
    content_policy: "metadata_only",
    auto_publish: false,
    language_mode: "en_only"
  },
  {
    name: "Financial Times",
    type: "licensed_api",
    url: "ft://feed",
    enabled: false,
    content_policy: "metadata_only",
    auto_publish: false,
    language_mode: "en_only"
  },
  {
    name: "WSJ",
    type: "licensed_api",
    url: "wsj://feed",
    enabled: false,
    content_policy: "metadata_only",
    auto_publish: false,
    language_mode: "en_only"
  }
];
