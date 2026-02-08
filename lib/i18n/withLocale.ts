import { locales, type Locale } from "@/i18n/routing";

const localePrefixRegex = new RegExp(`^/(${locales.join("|")})(?=/|$)`);

function isExternalHref(href: string) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

export function stripLocale(pathname: string) {
  let cleaned = pathname;
  while (localePrefixRegex.test(cleaned)) {
    cleaned = cleaned.replace(localePrefixRegex, "");
  }
  if (!cleaned) return "/";
  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
}

export function withLocale(locale: Locale, href: string) {
  if (!href) return `/${locale}`;
  if (href.startsWith("#") || href.startsWith("?")) return href;
  if (isExternalHref(href)) return href;
  if (localePrefixRegex.test(href)) return href;
  if (href.startsWith("/")) return `/${locale}${href === "/" ? "" : href}`;
  return `/${locale}/${href}`;
}

