import bcrypt from "bcryptjs";
import { spawnSync } from "child_process";

function usage() {
  return [
    "Usage:",
    "  npm run create-admin -- --email you@example.com --password 'YourPassword123!' --name 'Super Admin' [--phone '+8613800000000']",
    "",
    "Notes:",
    "  - Uses Cloudflare D1 via wrangler.",
    "  - Requires D1_DATABASE_NAME in env.",
    "  - Set D1_LOCAL=1 to run against local D1 (wrangler)."
  ].join("\n");
}

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a?.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

function isValidEmail(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function passwordStrengthError(password: string): string | null {
  if (typeof password !== "string" || !password) return "Missing password.";
  if (password.length < 12) return "Password must be at least 12 characters.";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain a special character.";
  return null;
}

function sqlEscape(value: string) {
  return value.replace(/'/g, "''");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    console.log(usage());
    return;
  }

  const fullName = String(args.name || args.full_name || "FxLocus Super Admin");
  const email = String(args.email || "").trim().toLowerCase();
  const phone = String(args.phone || "").trim();
  const password = String(args.password || "");

  if (!email || !password) {
    console.error(usage());
    throw new Error("Missing required args: --email and/or --password");
  }
  if (!isValidEmail(email)) throw new Error("Invalid email format.");
  const pwErr = passwordStrengthError(password);
  if (pwErr) throw new Error(pwErr);

  const dbName = String(process.env.D1_DATABASE_NAME || "").trim();
  if (!dbName) throw new Error("Missing D1_DATABASE_NAME.");

  const now = new Date().toISOString();
  const hash = await bcrypt.hash(password, 12);
  const id = crypto.randomUUID();

  const sql = `
  insert into profiles
    (id, email, full_name, phone, role, leader_id, student_status, status, password_hash, created_at, updated_at)
  values
    ('${sqlEscape(id)}', '${sqlEscape(email)}', '${sqlEscape(fullName)}', ${phone ? `'${sqlEscape(phone)}'` : "null"},
     'super_admin', null, '普通学员', 'active', '${sqlEscape(hash)}', '${sqlEscape(now)}', '${sqlEscape(now)}')
  on conflict(email) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    role = 'super_admin',
    status = 'active',
    password_hash = excluded.password_hash,
    updated_at = excluded.updated_at;
  `.trim();

  const argsList = ["d1", "execute", dbName, "--command", sql];
  if (String(process.env.D1_LOCAL || "").trim() === "1") {
    argsList.push("--local");
  }

  const res = spawnSync("wrangler", argsList, { stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error("wrangler d1 execute failed");
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
