import { getRequestConfig } from "next-intl/server";
import { defaultLocale, locales } from "./routing";

type Locale = (typeof locales)[number];
type Messages = Record<string, unknown>;

const messageCache: Partial<Record<Locale, Messages>> = {};

async function loadMessages(locale: Locale) {
  if (messageCache[locale]) {
    return messageCache[locale];
  }

  const modules = locale === "zh"
    ? await Promise.all([
        import("../messages/zh/about.json"),
        import("../messages/zh/common.json"),
        import("../messages/zh/contact.json"),
        import("../messages/zh/footer.json"),
        import("../messages/zh/framework.json"),
        import("../messages/zh/home.json"),
        import("../messages/zh/insights.json"),
        import("../messages/zh/videos.json"),
        import("../messages/zh/courses.json"),
        import("../messages/zh/glossary.json"),
        import("../messages/zh/cases.json"),
        import("../messages/zh/downloads.json"),
        import("../messages/zh/nav.json"),
        import("../messages/zh/notFound.json"),
        import("../messages/zh/privacy.json"),
        import("../messages/zh/programs.json"),
        import("../messages/zh/risk.json"),
        import("../messages/zh/seo.json"),
        import("../messages/zh/system.json"),
        import("../messages/zh/terms.json"),
        import("../messages/zh/tools.json"),
        import("../messages/zh/academy.json"),
        import("../messages/zh/player.json"),
        import("../messages/zh/donate.json"),
        import("../messages/zh/adminSystem.json"),
        import("../messages/zh/markets.json"),
        import("../messages/zh/news.json"),
        import("../messages/zh/faq.json")
      ])
    : await Promise.all([
        import("../messages/en/about.json"),
        import("../messages/en/common.json"),
        import("../messages/en/contact.json"),
        import("../messages/en/footer.json"),
        import("../messages/en/framework.json"),
        import("../messages/en/home.json"),
        import("../messages/en/insights.json"),
        import("../messages/en/videos.json"),
        import("../messages/en/courses.json"),
        import("../messages/en/glossary.json"),
        import("../messages/en/cases.json"),
        import("../messages/en/downloads.json"),
        import("../messages/en/nav.json"),
        import("../messages/en/notFound.json"),
        import("../messages/en/privacy.json"),
        import("../messages/en/programs.json"),
        import("../messages/en/risk.json"),
        import("../messages/en/seo.json"),
        import("../messages/en/system.json"),
        import("../messages/en/terms.json"),
        import("../messages/en/tools.json"),
        import("../messages/en/academy.json"),
        import("../messages/en/player.json"),
        import("../messages/en/donate.json"),
        import("../messages/en/adminSystem.json"),
        import("../messages/en/markets.json"),
        import("../messages/en/news.json"),
        import("../messages/en/faq.json")
      ]);

  const [
    about,
    common,
    contact,
    footer,
    framework,
    home,
    insights,
    videos,
    courses,
    glossary,
    cases,
    downloads,
    nav,
    notFound,
    privacy,
    programs,
    risk,
    seo,
    system,
    terms,
    tools,
    academy,
    player,
    donate,
    adminSystem,
    markets,
    news,
    faq
  ] = modules;

  const messages: Messages = {
    about: about.default,
    common: common.default,
    contact: contact.default,
    footer: footer.default,
    framework: framework.default,
    home: home.default,
    insights: insights.default,
    videos: videos.default,
    courses: courses.default,
    glossary: glossary.default,
    cases: cases.default,
    downloads: downloads.default,
    nav: nav.default,
    notFound: notFound.default,
    privacy: privacy.default,
    programs: programs.default,
    risk: risk.default,
    seo: seo.default,
    system: system.default,
    terms: terms.default,
    tools: tools.default,
    academy: academy.default,
    player: player.default,
    donate: donate.default,
    adminSystem: adminSystem.default,
    markets: markets.default,
    news: news.default,
    faq: faq.default
  };

  messageCache[locale] = messages;
  return messages;
}

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locale && locales.includes(locale as Locale)
    ? (locale as Locale)
    : defaultLocale;

  return {
    locale: resolvedLocale,
    messages: await loadMessages(resolvedLocale)
  };
});
