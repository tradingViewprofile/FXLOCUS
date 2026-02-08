"use client";

import type { ComponentProps } from "react";
import NextLink from "next/link";
import { useLocale } from "next-intl";

import type { Locale } from "@/i18n/routing";
import { withLocale } from "@/lib/i18n/withLocale";

type Props = Omit<ComponentProps<typeof NextLink>, "href"> & {
  href: string;
};

export function LocalizedLink({ href, ...props }: Props) {
  const locale = useLocale() as Locale;
  return <NextLink href={withLocale(locale, href)} {...props} />;
}

