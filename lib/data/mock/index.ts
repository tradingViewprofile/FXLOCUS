import fs from "node:fs";
import path from "node:path";
import { cache } from "react";

import type {
  CaseStudy,
  Course,
  DownloadAsset,
  GlossaryTerm,
  Insight,
  Locale,
  Pillar,
  Stage,
  Video
} from "@/lib/domain/types";
import type { DataProvider } from "@/lib/data/provider";

type Frontmatter = Record<string, unknown>;

const contentRoot = path.join(process.cwd(), "content");

function safeReadFile(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function safeReadJson<T>(filePath: string): T {
  return JSON.parse(safeReadFile(filePath)) as T;
}

function parseScalar(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  const quoted = /^["']([\s\S]*)["']$/.exec(trimmed);
  if (quoted) return quoted[1];

  return trimmed;
}

function parseFrontmatter(block: string): Frontmatter {
  const result: Frontmatter = {};
  const lines = block.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf(":");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    result[key] = parseScalar(value);
  }

  return result;
}

function parseMarkdownWithFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const match = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/.exec(raw);
  if (!match) return { frontmatter: {}, body: raw };
  const frontmatter = parseFrontmatter(match[1]);
  const body = raw.slice(match[0].length);
  return { frontmatter, body };
}

function normalizePillar(value: unknown): Pillar {
  if (value === "mind" || value === "market" || value === "price_action") return value;
  if (value === "price") return "price_action";
  return "market";
}

function normalizeStage(value: unknown): Stage {
  const stage =
    value === "perception" ||
    value === "discipline" ||
    value === "structure" ||
    value === "execution" ||
    value === "review" ||
    value === "general"
      ? value
      : "general";
  return stage;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

function resolveLocaleDir(locale: Locale) {
  return path.join(contentRoot, locale);
}

const listInsightsCached = cache(async (locale: Locale): Promise<Insight[]> => {
  const insightsDir = path.join(resolveLocaleDir(locale), "insights");
  if (!fs.existsSync(insightsDir)) return [];

  const entries = fs
    .readdirSync(insightsDir)
    .filter((name) => name.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b));

  const items: Insight[] = entries.map((name) => {
    const filePath = path.join(insightsDir, name);
    const { frontmatter, body } = parseMarkdownWithFrontmatter(safeReadFile(filePath));

    const slug = String(frontmatter.slug ?? path.basename(name, ".md"));
    const title = String(frontmatter.title ?? slug);
    const excerpt = String(frontmatter.excerpt ?? "");
    const cover = frontmatter.cover ? String(frontmatter.cover) : undefined;
    const pillar = normalizePillar(frontmatter.pillar);
    const stage = frontmatter.stage ? normalizeStage(frontmatter.stage) : undefined;
    const tags = normalizeTags(frontmatter.tags);
    const publishedAt = frontmatter.publishedAt ? String(frontmatter.publishedAt) : undefined;
    const readingMinutes = typeof frontmatter.readingMinutes === "number" ? frontmatter.readingMinutes : undefined;

    return {
      locale,
      slug,
      title,
      excerpt,
      cover,
      pillar,
      stage,
      tags,
      publishedAt,
      readingMinutes,
      contentMd: body.trim()
    };
  });

  return items.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
});

const listVideosCached = cache(async (locale: Locale): Promise<Video[]> => {
  const filePath = path.join(resolveLocaleDir(locale), "videos.json");
  if (!fs.existsSync(filePath)) return [];
  const items = safeReadJson<Video[]>(filePath).map((item) => ({ ...item, locale }));
  return items.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
});

const listCoursesCached = cache(async (locale: Locale): Promise<Course[]> => {
  const filePath = path.join(resolveLocaleDir(locale), "courses.json");
  if (!fs.existsSync(filePath)) return [];
  const items = safeReadJson<Course[]>(filePath).map((item) => ({ ...item, locale }));
  return items.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
});

const listGlossaryCached = cache(async (locale: Locale): Promise<GlossaryTerm[]> => {
  const filePath = path.join(resolveLocaleDir(locale), "glossary.json");
  if (!fs.existsSync(filePath)) return [];
  return safeReadJson<GlossaryTerm[]>(filePath).map((item) => ({ ...item, locale }));
});

const listCasesCached = cache(async (locale: Locale): Promise<CaseStudy[]> => {
  const filePath = path.join(resolveLocaleDir(locale), "cases.json");
  if (!fs.existsSync(filePath)) return [];
  return safeReadJson<CaseStudy[]>(filePath).map((item) => ({ ...item, locale }));
});

const listDownloadsCached = cache(async (locale: Locale): Promise<DownloadAsset[]> => {
  const filePath = path.join(resolveLocaleDir(locale), "downloads.json");
  if (!fs.existsSync(filePath)) return [];
  return safeReadJson<DownloadAsset[]>(filePath).map((item) => ({ ...item, locale }));
});

export const mockProvider: DataProvider = {
  async listInsights(locale) {
    return listInsightsCached(locale);
  },
  async getInsight(locale, slug) {
    const all = await listInsightsCached(locale);
    return all.find((item) => item.slug === slug) ?? null;
  },

  async listVideos(locale) {
    return listVideosCached(locale);
  },
  async getVideo(locale, slug) {
    const all = await listVideosCached(locale);
    return all.find((item) => item.slug === slug) ?? null;
  },

  async listCourses(locale) {
    return listCoursesCached(locale);
  },
  async getCourse(locale, slug) {
    const all = await listCoursesCached(locale);
    return all.find((item) => item.slug === slug) ?? null;
  },
  async getCourseLesson(locale, courseSlug, lessonSlug) {
    const course = await this.getCourse(locale, courseSlug);
    if (!course) return null;
    const sorted = [...course.lessons].sort((a, b) => a.orderIndex - b.orderIndex);
    const index = sorted.findIndex((lesson) => lesson.slug === lessonSlug);
    if (index === -1) return null;
    return { course: { ...course, lessons: sorted }, lessonIndex: index };
  },

  async listGlossary(locale) {
    return listGlossaryCached(locale);
  },
  async getGlossaryTerm(locale, slug) {
    const all = await listGlossaryCached(locale);
    return all.find((item) => item.slug === slug) ?? null;
  },

  async listCases(locale) {
    return listCasesCached(locale);
  },
  async getCase(locale, slug) {
    const all = await listCasesCached(locale);
    return all.find((item) => item.slug === slug) ?? null;
  },

  async listDownloads(locale) {
    return listDownloadsCached(locale);
  }
};

