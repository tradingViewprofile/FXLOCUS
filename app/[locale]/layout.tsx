import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import Script from "next/script";
import { notFound } from "next/navigation";

import { LocaleMeta } from "@/components/LocaleMeta";
import { SiteShell } from "@/components/SiteShell";
import { locales, type Locale } from "@/i18n/routing";

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

export const revalidate = 86400;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const locale = params.locale as Locale;
  if (!locales.includes(locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages({ locale });
  const safeLocale = locale === "en" ? "en" : "zh";
  const localeBootstrap = `(function(){try{var root=document.documentElement;var locale=${JSON.stringify(
    safeLocale
  )};root.lang=locale==="en"?"en":"zh-CN";root.classList.toggle("font-en",locale==="en");root.classList.toggle("font-zh",locale!=="en");}catch(e){}})();`;
  const desktopBootstrap =
    "(function(){try{var root=document.documentElement;var ua=navigator.userAgent||\"\";var isDesktop=!!(window.fxlocusDesktop&&window.fxlocusDesktop.isDesktop)||/Fxlocus Desktop/i.test(ua);if(isDesktop){root.setAttribute(\"data-desktop\",\"1\");}else{root.removeAttribute(\"data-desktop\");}var path=location.pathname||\"\";var isAuth=/\\/system\\/(login|forgot-password|reset-password)(\\/|$)/.test(path);if(isAuth){root.setAttribute(\"data-system-auth\",\"1\");}else{root.removeAttribute(\"data-system-auth\");}}catch(e){}})();";

  return (
    <>
      <Script id="locale-bootstrap" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: localeBootstrap }} />
      <Script id="desktop-bootstrap" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: desktopBootstrap }} />
      <LocaleMeta locale={locale} />
      <NextIntlClientProvider key={locale} locale={locale} messages={messages}>
        <SiteShell locale={locale}>{children}</SiteShell>
      </NextIntlClientProvider>
    </>
  );
}
