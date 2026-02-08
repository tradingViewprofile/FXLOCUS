export type Locale = "zh" | "en";

export type Pillar = "mind" | "market" | "price_action";

export type Stage =
  | "general"
  | "perception"
  | "discipline"
  | "structure"
  | "execution"
  | "review";

export type ContentMeta = {
  locale: Locale;
  slug: string;
  title: string;
  excerpt: string;
  cover?: string;
  pillar: Pillar;
  stage?: Stage;
  tags: string[];
  publishedAt?: string; // YYYY-MM-DD
  readingMinutes?: number;
};

export type Insight = ContentMeta & {
  contentMd: string;
};

export type VideoProvider = "youtube" | "bilibili" | "other";

export type Video = ContentMeta & {
  provider: VideoProvider;
  embedUrl: string;
  durationMin?: number;
  points?: string[];
  homework?: string;
  relatedSlugs?: string[];
};

export type CourseLevel = "all" | "beginner" | "intermediate" | "advanced";
export type CourseAccess = "free" | "member";

export type CourseLesson = {
  slug: string;
  title: string;
  contentMd?: string;
  videoEmbedUrl?: string;
  orderIndex: number;
  durationMin?: number;
  access?: CourseAccess;
};

export type Course = ContentMeta & {
  level: CourseLevel;
  access: CourseAccess;
  lessons: CourseLesson[];
  estimatedHours?: number;
};

export type GlossaryTerm = {
  locale: Locale;
  slug: string;
  pillar: Pillar;
  term: string;
  oneLiner: string;
  misconceptions: string[];
  frameworkNote: string;
  related: { label: string; href: string }[];
};

export type CaseStudy = {
  locale: Locale;
  slug: string;
  pillar: "price_action";
  title: string;
  tags: string[];
  cover?: string;
  marketContext: string;
  forceNote: string;
  locationNote: string;
  falsificationNote: string;
  commonMistake: string;
  homework: string;
};

export type DownloadAsset = {
  locale: Locale;
  slug: string;
  title: string;
  description: string;
  fileUrl: string; // public path
  format: "md" | "pdf" | "png" | "json";
  category: "templates" | "system" | "tools";
};

