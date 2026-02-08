"use client";

export function NewsHero({ locale }: { locale: "zh" | "en" }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a1634] to-[#050a14] p-8 md:p-10">
      <div className="mb-2 text-sm text-white/85">FxLocus News Terminal</div>
      <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
        {locale === "zh" ? "新闻不是信息量，是证据链。" : "News is evidence, not noise."}
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-white/70">
        {locale === "zh"
          ? "实时聚合一手信息源，自动清洗去重，并以 FxLocus 的训练视角输出摘要、要点、情绪与关联品种。"
          : "Real-time aggregation, deduped and cleaned, with FxLocus training-oriented summaries, key points, sentiment, and related symbols."}
      </p>
      <div className="mt-5 text-xs text-white/50">
        {locale === "zh"
          ? "提示：部分付费媒体仅提供标题/链接，避免侵权。"
          : "Note: paid sources are metadata-only by default."}
      </div>
    </div>
  );
}
