import type {
  CaseStudy,
  Course,
  DownloadAsset,
  GlossaryTerm,
  Insight,
  Locale,
  Video
} from "@/lib/domain/types";

export type DataProvider = {
  listInsights(locale: Locale): Promise<Insight[]>;
  getInsight(locale: Locale, slug: string): Promise<Insight | null>;

  listVideos(locale: Locale): Promise<Video[]>;
  getVideo(locale: Locale, slug: string): Promise<Video | null>;

  listCourses(locale: Locale): Promise<Course[]>;
  getCourse(locale: Locale, slug: string): Promise<Course | null>;
  getCourseLesson(
    locale: Locale,
    courseSlug: string,
    lessonSlug: string
  ): Promise<{ course: Course; lessonIndex: number } | null>;

  listGlossary(locale: Locale): Promise<GlossaryTerm[]>;
  getGlossaryTerm(locale: Locale, slug: string): Promise<GlossaryTerm | null>;

  listCases(locale: Locale): Promise<CaseStudy[]>;
  getCase(locale: Locale, slug: string): Promise<CaseStudy | null>;

  listDownloads(locale: Locale): Promise<DownloadAsset[]>;
};

