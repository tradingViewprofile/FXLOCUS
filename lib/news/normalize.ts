export function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    const drop = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid"
    ];
    drop.forEach((key) => url.searchParams.delete(key));

    const params = Array.from(url.searchParams.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    url.search = "";
    for (const [key, val] of params) {
      url.searchParams.append(key, val);
    }
    return url.toString();
  } catch {
    return value.trim();
  }
}

export function safeSlug(input: string) {
  const slug = input
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, 80) || `news-${Date.now()}`;
}
