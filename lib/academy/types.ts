export type Category = {
  id: string;
  title: string;
  desc: string;
  icon: string;
};

export type LessonSectionAccordion = {
  id: string;
  title: string;
  content: string;
};

export type LessonSection = {
  id: string;
  title: string;
  summary: string;
  content: string;
  accordions: LessonSectionAccordion[];
};

export type LessonChecklistItem = {
  id: string;
  text: string;
  why: string;
  doneByDefault?: boolean;
};

export type LessonCase = {
  id: string;
  title: string;
  setup: string;
  execution: string;
  result: string;
  review: string;
};

export type LessonToolInput = {
  id: string;
  label: string;
  unit?: string;
  placeholder?: string;
  defaultValue?: number;
};

export type LessonToolTable = {
  columns: string[];
  rows: string[][];
  caption?: string;
};

export type LessonToolOutput = string | LessonToolTable;

export type LessonTool = {
  id: string;
  type: string;
  title: string;
  inputs?: LessonToolInput[];
  output?: LessonToolOutput;
  templateText?: string;
};

export type LessonFaq = {
  q: string;
  a: string;
};

export type Lesson = {
  id: string;
  slug: string;
  categoryId: string;
  title: string;
  subtitle: string;
  summary: string;
  readTime: string;
  level: string;
  updatedAt: string;
  tags: string[];
  tldr: [string, string, string];
  toc: string[];
  sections: LessonSection[];
  checklistItems: LessonChecklistItem[];
  cases: LessonCase[];
  tools: LessonTool[];
  faq: LessonFaq[];
};
