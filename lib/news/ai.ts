import { z } from "zod";

const OutputSchema = z.object({
  category: z.enum(["fx", "stocks", "commodities", "crypto", "macro"]),
  importance: z.enum(["high", "medium", "low"]),
  sentiment: z.enum(["bullish", "bearish", "neutral"]),
  symbols: z.array(z.string()).max(12),
  summary_en: z.string().max(600),
  summary_zh: z.string().max(600),
  key_points_en: z.array(z.string()).min(3).max(5),
  key_points_zh: z.array(z.string()).min(3).max(5),
  title_zh: z.string().max(200).optional(),
  fxlocus_lens_zh: z.string().max(800).optional(),
  fxlocus_lens_en: z.string().max(800).optional()
});

export type AiOutput = z.infer<typeof OutputSchema>;

export async function analyzeWithAI(input: {
  title: string;
  content: string;
  source: string;
  url: string;
}): Promise<AiOutput | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const prompt = [
    "You are FxLocus News Analyst.",
    "Return JSON ONLY matching the schema.",
    "Tasks:",
    "1) classify category: fx/stocks/commodities/crypto/macro",
    "2) importance: high/medium/low",
    "3) sentiment: bullish/bearish/neutral",
    "4) extract up to 12 related symbols (EURUSD, XAUUSD, BTCUSDT, SPX, NDX, USOIL etc.)",
    "5) summary in EN and ZH (<=200 Chinese chars / <=400 English chars)",
    "6) 3-5 key points in EN and ZH",
    "7) Provide FxLocus Lens: training-oriented commentary (NOT trading advice)",
    `Input:\nsource: ${input.source}\nurl: ${input.url}\ntitle: ${input.title}\ncontent: ${input.content.slice(0, 5000)}`
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: "Return JSON only. No markdown." },
          { role: "user", content: prompt }
        ]
      }),
      signal: controller.signal
    });

    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;

    try {
      const parsed = OutputSchema.parse(JSON.parse(content));
      return parsed;
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
