import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  ".open-next",
  "dist",
  "out",
  ".wrangler"
]);

const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".toml",
  ".env",
  ".sql",
  ".md",
  ".ps1"
]);

type Finding = { file: string; message: string };

async function walk(dir: string, out: string[]) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      await walk(path.join(dir, e.name), out);
      continue;
    }
    const file = path.join(dir, e.name);
    const ext = path.extname(e.name);
    if (!TEXT_EXT.has(ext) && !e.name.startsWith(".env")) continue;
    out.push(file);
  }
}

function rel(p: string) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function isClientFile(src: string) {
  return /^\s*["']use client["'];/m.test(src);
}

async function main() {
  const files: string[] = [];
  await walk(ROOT, files);

  const findings: Finding[] = [];

  for (const file of files) {
    const r = rel(file);
    if (r === "scripts/auditSecrets.ts") continue;
    const src = await fs.readFile(file, "utf8").catch(() => "");
    if (!src) continue;

    // 1) Hard-coded secret-like values must never be committed.
    const supabaseServiceLiteral = new RegExp("sb_" + "secret_[A-Za-z0-9_]+");
    if (supabaseServiceLiteral.test(src)) {
      findings.push({ file: r, message: "Found Supabase service-role key literal." });
    }
    if (/R2_SECRET_ACCESS_KEY\s*=\s*["'][^"']+["']/.test(src)) {
      findings.push({ file: r, message: "Found hard-coded R2 secret access key." });
    }
    if (/JAMENDO_CLIENT_SECRET\s*=\s*["'][^"']+["']/.test(src)) {
      findings.push({ file: r, message: "Found hard-coded Jamendo client secret." });
    }
    if (/SYSTEM_JWT_SECRET\s*=\s*["'][^"']+["']/.test(src)) {
      findings.push({ file: r, message: "Found hard-coded JWT secret." });
    }

    // 2) Prevent accidental Supabase usage after migration.
    if (/NEXT_PUBLIC_SUPABASE_|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY|SUPABASE_URL/.test(src)) {
      findings.push({ file: r, message: "Found Supabase env var reference (Supabase has been removed)." });
    }

    // 3) Secrets must never be accessed in client components.
    if (isClientFile(src) && /process\.env\.RESEND_API_KEY/.test(src)) {
      findings.push({ file: r, message: "Client component references process.env.RESEND_API_KEY." });
    }
    if (isClientFile(src) && /process\.env\.SYSTEM_JWT_SECRET/.test(src)) {
      findings.push({ file: r, message: "Client component references process.env.SYSTEM_JWT_SECRET." });
    }
    if (isClientFile(src) && /process\.env\.R2_SECRET_ACCESS_KEY/.test(src)) {
      findings.push({ file: r, message: "Client component references process.env.R2_SECRET_ACCESS_KEY." });
    }

    // 4) Prevent accidental public exposure via NEXT_PUBLIC_ prefix.
    if (/NEXT_PUBLIC_SUPABASE/.test(src)) {
      findings.push({ file: r, message: "Found NEXT_PUBLIC_SUPABASE* (Supabase has been removed)." });
    }
    if (/NEXT_PUBLIC_RESEND_API_KEY/.test(src)) {
      findings.push({ file: r, message: "Found NEXT_PUBLIC_RESEND_API_KEY (must not exist)." });
    }
    if (/NEXT_PUBLIC_SYSTEM_JWT_SECRET/.test(src)) {
      findings.push({ file: r, message: "Found NEXT_PUBLIC_SYSTEM_JWT_SECRET (must not exist)." });
    }
    if (/NEXT_PUBLIC_R2_SECRET_ACCESS_KEY/.test(src)) {
      findings.push({ file: r, message: "Found NEXT_PUBLIC_R2_SECRET_ACCESS_KEY (must not exist)." });
    }
  }

  if (findings.length) {
    console.error("Secret audit failed:");
    findings.forEach((f) => console.error(`- ${f.file}: ${f.message}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
