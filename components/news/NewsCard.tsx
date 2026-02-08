"use client";


type Sentiment = "bullish" | "bearish" | "neutral";

function dot(sentiment: Sentiment) {
  if (sentiment === "bullish") return "bg-emerald-400";
  if (sentiment === "bearish") return "bg-rose-400";
  return "bg-slate-300";
}

function cleanText(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/<+\s*sep\s*>+/gi, "")
    .replace(/[<>]+/g, "")
    .trim();
}

export function NewsCard({
  locale,
  item,
  onClickReadMore
}: {
  locale: "zh" | "en";
  item: any;
  onClickReadMore: (articleId: string) => void;
}) {
  const title = cleanText(String(item.title || ""));
  const summary = cleanText(String(item.summary || ""));
  const heat = (item.heat ?? item.views) || 0;
  const externalUrl = typeof item.url === "string" ? item.url : "";

  return (
    <div className="fx-card rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs text-white/55">
        {item.logo ? <img src={item.logo} alt="" className="h-5 w-5 rounded" /> : null}
        <span>{item.source || (locale === "zh" ? "来源" : "Source")}</span>
        <span>·</span>
        <span>{item.publishedAt ? new Date(item.publishedAt).toLocaleString() : ""}</span>
        <span className="ml-auto flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${dot(item.sentiment)}`} />
          <span className="text-white/45">{item.importance?.toUpperCase?.() || ""}</span>
        </span>
      </div>

      <div className="mt-2">
        <div className="line-clamp-2 text-lg font-semibold leading-snug text-white">{title}</div>
        <div className="mt-2 line-clamp-3 text-sm leading-6 text-white/70">{summary}</div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(item.symbols || []).slice(0, 6).map((symbol: string) => (
          <span
            key={symbol}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70"
          >
            {symbol}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {externalUrl ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => onClickReadMore(item.id)}
            className="fx-btn fx-btn-secondary rounded-xl px-3 py-1.5 text-sm text-white/85"
          >
            {locale === "zh" ? "阅读全文" : "Read original"}
          </a>
        ) : (
          <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/40">
            {locale === "zh" ? "暂无原文" : "No source"}
          </span>
        )}
        <div className="text-xs text-white/45">
          {locale === "zh" ? `热度：${heat}` : `Heat: ${heat}`}
        </div>
      </div>
    </div>
  );
}
