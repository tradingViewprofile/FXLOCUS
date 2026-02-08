"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { saveWithPicker } from "@/lib/downloads/saveWithPicker";
import type { DownloadAsset } from "@/lib/domain/types";

type Props = {
  downloads: DownloadAsset[];
};

function groupByCategory(items: DownloadAsset[]) {
  const grouped: Record<DownloadAsset["category"], DownloadAsset[]> = {
    templates: [],
    system: [],
    tools: []
  };

  for (const item of items) grouped[item.category].push(item);
  return grouped;
}

function sanitizeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").trim();
}

function buildDownloadFilename(asset: DownloadAsset) {
  const base = sanitizeFilename(asset.title || asset.slug || "download");
  const ext = asset.format ? `.${asset.format}` : "";
  if (!base) return `download${ext}`;
  return base.endsWith(ext) || !ext ? base : `${base}${ext}`;
}

export function DownloadsGrid({ downloads }: Props) {
  const t = useTranslations("downloads");
  const grouped = useMemo(() => groupByCategory(downloads), [downloads]);
  const sections = ["templates", "system", "tools"] as const;

  return (
    <>
      {sections.map((section) => (
        <section key={section} className="fx-section">
          <h2 className="fx-h2">{t(`categories.${section}`)}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {grouped[section].map((asset) => (
              <button
                key={asset.slug}
                type="button"
                onClick={() =>
                  saveWithPicker({
                    url: asset.fileUrl,
                    filename: buildDownloadFilename(asset)
                  })
                }
                className="fx-card block p-7 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="fx-pill">{t(`formats.${asset.format}`)}</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-50">{asset.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-200/70">{asset.description}</p>
              </button>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
