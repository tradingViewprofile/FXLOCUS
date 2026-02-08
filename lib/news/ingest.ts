import Parser from "rss-parser";
import sanitizeHtml from "sanitize-html";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { analyzeWithAI } from "./ai";
import { hashText } from "./dedupe";
import { normalizeUrl, safeSlug } from "./normalize";
import { extractSymbolsHeuristic } from "./symbols";

const parser = new Parser({ timeout: 12_000 });

function cleanToText(html?: string) {
  const cleaned = sanitizeHtml(html || "", {
    allowedTags: [],
    allowedAttributes: {}
  });
  return cleaned.replace(/\s+/g, " ").trim();
}

function guessCategory(title: string) {
  const t = title.toLowerCase();
  if (/(cpi|ppi|rate|central bank|fed|ecb|inflation|gdp|payroll|ism)/i.test(t))
    return "macro";
  if (/(bitcoin|btc|ethereum|crypto|solana)/i.test(t)) return "crypto";
  if (/(oil|wti|brent|gold|silver|copper|commodity|xau|xag)/i.test(t)) return "commodities";
  if (/(stock|equity|nasdaq|sp500|dow|earnings)/i.test(t)) return "stocks";
  return "fx";
}

export async function ensureSourcesSeeded() {
  const sb = supabaseAdmin();
  const { data } = await sb.from("news_sources").select("id").limit(1);
  if (data && data.length > 0) return;
  const { DEFAULT_SOURCES } = await import("./sources");
  await sb.from("news_sources").insert(DEFAULT_SOURCES);
}

export async function ingestOnce() {
  const sb = supabaseAdmin();
  await ensureSourcesSeeded();

  const { data: sources } = await sb.from("news_sources").select("*").eq("enabled", true);
  const enabled = sources || [];
  const stats = { raw: 0, articles: 0, errors: 0 };

  for (const src of enabled) {
    if (src.type === "licensed_api") continue;
    if (!src.url || typeof src.url !== "string" || !src.url.startsWith("http")) continue;

    let feed;
    try {
      feed = await parser.parseURL(src.url);
    } catch {
      stats.errors += 1;
      continue;
    }

    for (const item of (feed.items || []).slice(0, 40)) {
      const title = String(item.title || "").trim();
      const link = String(item.link || "").trim();
      if (!title || !link) continue;

      const normalized = normalizeUrl(link);
      const rawHtml = (item as any).content || (item as any)["content:encoded"] || "";
      const snippet = (item as any).contentSnippet || "";
      const rawText = cleanToText(rawHtml) || cleanToText(snippet) || "";
      const publishedAt = (item as any).isoDate
        ? new Date((item as any).isoDate).toISOString()
        : new Date().toISOString();

      const titleHash = hashText(title) || "";
      const contentHash = hashText(rawText) || "";

      const up = await sb
        .from("news_raw")
        .upsert(
          {
            source_id: src.id,
            url: link,
            normalized_url: normalized,
            title,
            author: (item as any).creator || (item as any).author || null,
            published_at: publishedAt,
            raw_html: rawHtml || null,
            raw_text: rawText || null,
            title_hash: titleHash,
            content_hash: contentHash
          },
          { onConflict: "normalized_url" }
        );

      if (up.error) continue;
      stats.raw += 1;

      const { data: existing } = await sb.from("news_articles").select("id").eq("url", link).limit(1);
      if (existing && existing.length > 0) continue;

      const slugBase = safeSlug(`${src.name}-${title}`);
      const slug = `${slugBase}-${titleHash.slice(0, 8) || Date.now()}`;

      const policy = (src.content_policy || "excerpt_only") as
        | "full"
        | "excerpt_only"
        | "metadata_only";
      const bodyForAi = policy === "metadata_only" ? "" : rawText;

      const ai = await analyzeWithAI({
        title,
        content: bodyForAi || title,
        source: src.name,
        url: link
      });

      const rawSymbols =
        ai?.symbols && ai.symbols.length > 0
          ? ai.symbols
          : extractSymbolsHeuristic(`${title}\n${rawText}`);
      const symbols = Array.from(
        new Set(
          rawSymbols
            .map((symbol: string) => symbol.replace(/[\/-]/g, "").toUpperCase().trim())
            .filter(Boolean)
        )
      ).slice(0, 12);

      const category = ai?.category || guessCategory(title);
      const importance = ai?.importance || "medium";
      const sentiment = ai?.sentiment || "neutral";

      let titleZh = ai?.title_zh || null;
      let summaryZh = ai?.summary_zh || null;
      let keyPointsZh = ai?.key_points_zh || [];
      let lensZh = ai?.fxlocus_lens_zh || null;

      const titleEn = title;
      const summaryEn = ai?.summary_en || title;
      const keyPointsEn = ai?.key_points_en || [];
      const lensEn = ai?.fxlocus_lens_en || null;

      const languageMode = (src.language_mode || "bilingual") as
        | "bilingual"
        | "en_only"
        | "zh_only";

      if (languageMode === "en_only") {
        titleZh = null;
        summaryZh = null;
        keyPointsZh = [];
        lensZh = null;
      }

      const contentEn =
        policy === "metadata_only"
          ? null
          : rawText
              ? rawText.slice(0, policy === "full" ? 5000 : 900)
              : null;
      const contentZh = null;

      const autoPublish = src.auto_publish !== false;
      const status = autoPublish ? "published" : "pending";
      const langFallback = !titleZh || !summaryZh ? "zh_missing" : null;

      const ins = await sb
        .from("news_articles")
        .insert({
          source_id: src.id,
          slug,
          url: link,
          title_en: titleEn,
          title_zh: titleZh,
          summary_en: summaryEn,
          summary_zh: summaryZh,
          content_en: contentEn,
          content_zh: contentZh,
          author: (item as any).creator || (item as any).author || null,
          cover_image_url: null,
          published_at: publishedAt,
          category,
          importance,
          sentiment,
          symbols_json: symbols,
          key_points_en_json: keyPointsEn,
          key_points_zh_json: keyPointsZh,
          fxlocus_lens_en: lensEn,
          fxlocus_lens_zh: lensZh,
          status,
          lang_fallback: langFallback
        })
        .select("id")
        .maybeSingle();

      if (!ins.error && ins.data?.id) {
        await sb.from("news_metrics").upsert(
          { article_id: ins.data.id },
          { onConflict: "article_id" }
        );
        stats.articles += 1;
      }
    }
  }

  return stats;
}

