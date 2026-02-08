export type Locale = "zh" | "en";

export type Pillar = "mind" | "market" | "price";

export type BilingualText = {
  zh: string;
  en: string;
};

export type FrameworkModule = {
  id: string;
  pillar: Pillar;
  title: BilingualText;
  oneLiner: BilingualText;
  trainingActions: {
    zh: string[];
    en: string[];
  };
  deliverables: {
    zh: string[];
    en: string[];
  };
  evaluation: BilingualText;
};

export type InsightPost = {
  slug: string;
  pillar: Pillar;
  title: BilingualText;
  excerpt: BilingualText;
  publishedAt: string; // YYYY-MM-DD
  readingTime: number;
  tags: string[];
  contentMd: BilingualText;
};

export type Testimonial = {
  id: string;
  role: BilingualText;
  market: "FX" | "Gold" | "Indices" | "Crypto" | "Multi";
  before: BilingualText;
  after: BilingualText;
  quote: BilingualText;
};

export type Video = {
  id: string;
  pillar: Pillar;
  title: BilingualText;
  excerpt: BilingualText;
  durationMinutes: number;
  publishedAt: string; // YYYY-MM-DD
};

export type Course = {
  id: string;
  tier: "course" | "camp" | "audit";
  title: BilingualText;
  lead: BilingualText;
  deliverables: {
    zh: string[];
    en: string[];
  };
};
