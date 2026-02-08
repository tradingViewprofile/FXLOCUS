"use client";

import React from "react";

type ClientDateTimeProps = {
  value?: string | number | Date | null;
  locale?: string;
  fallback?: string;
  className?: string;
  format?: "date" | "datetime";
  formatter?: (date: Date, locale?: string) => string;
};

export function ClientDateTime({
  value,
  locale,
  fallback = "",
  className,
  format = "datetime",
  formatter
}: ClientDateTimeProps) {
  const hasValue = value !== null && value !== undefined && value !== "";
  const [text, setText] = React.useState(hasValue ? "" : fallback);

  React.useEffect(() => {
    if (!hasValue) {
      setText(fallback);
      return;
    }
    const date = value instanceof Date ? value : new Date(value as string | number);
    if (Number.isNaN(date.getTime())) {
      setText(fallback);
      return;
    }
    const next = formatter
      ? formatter(date, locale)
      : format === "date"
        ? date.toLocaleDateString(locale)
        : date.toLocaleString(locale);
    setText(next);
  }, [fallback, format, formatter, hasValue, locale, value]);

  if (!hasValue) {
    return fallback ? <span className={className}>{fallback}</span> : null;
  }

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}
