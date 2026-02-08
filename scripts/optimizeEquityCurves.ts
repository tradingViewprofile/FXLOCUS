import path from "node:path";
import fs from "node:fs/promises";

import sharp from "sharp";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "public", "EquityCurve");

async function fileExists(p: string) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const entries = await fs.readdir(DIR, { withFileTypes: true });
  const pngs = entries
    .filter((e) => e.isFile() && /\.png$/i.test(e.name))
    .map((e) => e.name);

  if (!pngs.length) {
    console.log("No EquityCurve PNGs found.");
    return;
  }

  let converted = 0;
  for (const name of pngs) {
    const input = path.join(DIR, name);
    const output = path.join(DIR, name.replace(/\.png$/i, ".webp"));
    if (await fileExists(output)) continue;

    await sharp(input)
      .webp({ quality: 80, effort: 5 })
      .toFile(output);
    converted += 1;
  }

  console.log(`EquityCurve: converted ${converted}/${pngs.length} PNG -> WebP`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

