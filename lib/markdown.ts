import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import remarkSlug from "remark-slug";
import GithubSlugger from "github-slugger";

export type TocItem = {
  id: string;
  depth: 2 | 3;
  value: string;
};

export function getTocFromMarkdown(markdown: string): TocItem[] {
  const slugger = new GithubSlugger();
  const lines = markdown.split(/\r?\n/);

  const items: TocItem[] = [];
  for (const line of lines) {
    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const depth = match[1].length as 2 | 3;
    const value = match[2].replace(/\s+#\s*$/, "").trim();
    const id = slugger.slug(value);
    items.push({ id, depth, value });
  }

  return items;
}

export async function renderMarkdown(markdown: string): Promise<string> {
  const file = await remark()
    .use(remarkGfm)
    .use(remarkSlug as any)
    .use(remarkHtml, { sanitize: false })
    .process(markdown);

  return String(file);
}
