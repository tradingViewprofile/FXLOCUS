export function computeHeat({
  id,
  publishedAt,
  views,
  clicks
}: {
  id: string;
  publishedAt?: string | null;
  views?: number | null;
  clicks?: number | null;
}) {
  const seed = hashString(`${id || ""}|${publishedAt || ""}`);
  const base = 20 + (seed % 180);
  const now = Date.now();
  const publishedMs = publishedAt ? Date.parse(publishedAt) : NaN;
  const hours = Number.isNaN(publishedMs) ? 24 : Math.max(1, (now - publishedMs) / 3_600_000);
  const decay = Math.max(0.35, 1 - hours / 72);
  const metric = (views || 0) * 1.2 + (clicks || 0) * 4;
  return Math.max(0, Math.round(base * decay + metric));
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
