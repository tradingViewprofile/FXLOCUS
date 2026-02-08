import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist", "desktop");
const artifact = path.join(distDir, "fxlocus_setup.exe");
const metaTarget = path.join(distDir, "desktop-package.json");
const pkgPath = path.join(root, "package.json");

function bumpPatch(version: string) {
  const parts = version.split(".").map((v) => Number(v));
  if (parts.length < 3 || parts.some((v) => Number.isNaN(v))) return version;
  parts[2] += 1;
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

let nextVersion = "0.1.0";
try {
  const pkgRaw = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(pkgRaw);
  const currentVersion = String(pkg.version || "0.1.0");
  nextVersion = bumpPatch(currentVersion);
  if (nextVersion !== currentVersion) {
    pkg.version = nextVersion;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    console.log(`Version bumped: ${currentVersion} -> ${nextVersion}`);
  } else {
    console.log(`Version unchanged: ${currentVersion}`);
  }
} catch (error) {
  console.error("Failed to bump version:", error);
}

try {
  execSync("electron-builder --win --x64", { stdio: "inherit", cwd: root });
} catch (error) {
  console.error("Electron build failed.");
  process.exit(1);
}

if (!existsSync(artifact)) {
  console.error(`Build artifact not found: ${artifact}`);
  process.exit(1);
}

try {
  const meta = {
    version: nextVersion,
    builtAt: new Date().toISOString()
  };
  writeFileSync(metaTarget, JSON.stringify(meta, null, 2) + "\n");
  console.log(`Desktop package metadata saved: ${metaTarget}`);
} catch (error) {
  console.error("Failed to write desktop package metadata:", error);
}
