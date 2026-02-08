"use client";

type SaveOptions = {
  url: string;
  filename: string;
  mimeType?: string | null;
};

function sanitizeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").trim();
}

function buildSafeFilename(name: string) {
  const trimmed = sanitizeFilename(name || "download");
  return trimmed || "download";
}

async function saveViaPicker(options: SaveOptions) {
  const safeName = buildSafeFilename(options.filename);
  const picker = (window as any).showSaveFilePicker;
  if (typeof picker !== "function") return false;

  try {
    const handle = await picker({
      suggestedName: safeName
    });
    const res = await fetch(options.url);
    if (!res.ok) throw new Error("download_failed");
    const buffer = await res.arrayBuffer();
    let writable: FileSystemWritableFileStream;
    try {
      writable = await handle.createWritable({ keepExistingData: false });
    } catch {
      writable = await handle.createWritable();
    }
    await writable.write(buffer);
    await writable.close();
    return true;
  } catch (err: any) {
    if (err?.name === "AbortError") return true;
    return false;
  }
}

function saveViaAnchor(options: SaveOptions) {
  const safeName = buildSafeFilename(options.filename);
  const link = document.createElement("a");
  link.href = options.url;
  link.download = safeName;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function saveWithPicker(options: SaveOptions) {
  if (typeof window === "undefined") return;
  const usedPicker = await saveViaPicker(options);
  if (!usedPicker) saveViaAnchor(options);
}
