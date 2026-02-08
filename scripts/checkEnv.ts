function required(name: string) {
  const value = String(process.env[name] || "").trim();
  if (!value) return { name, ok: false as const };
  return { name, ok: true as const };
}

function main() {
  const missing: string[] = [];

  const mode = String(process.env.ENV_CHECK_MODE || "run").trim(); // run | build

  // Keep build-mode checks minimal; DB credentials are only required at runtime.
  const requiredVars: string[] = [];
  if (mode === "run") {
    // System session cookie signing (required when running the app).
    requiredVars.push("SYSTEM_JWT_SECRET");
  }

  const prod = process.env.NODE_ENV === "production";
  const requireResend = prod || process.env.REQUIRE_RESEND === "1";
  if (mode === "run" && requireResend) requiredVars.push("RESEND_API_KEY");

  const requireR2 = process.env.REQUIRE_R2 === "1";
  if (mode === "run" && requireR2) {
    requiredVars.push("R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET");
  }

  requiredVars.forEach((name) => {
    const res = required(name);
    if (!res.ok) missing.push(name);
  });

  // Prevent accidental secret exposure.
  const publicLeak = Object.keys(process.env).filter((k) => {
    if (!k.startsWith("NEXT_PUBLIC_")) return false;
    return (
      k.includes("SERVICE_ROLE") ||
      k.includes("RESEND") ||
      k.includes("SECRET") ||
      k.includes("PRIVATE") ||
      k.includes("JWT") ||
      k.includes("R2_") ||
      k.includes("ACCESS_KEY")
    );
  });

  if (missing.length || publicLeak.length) {
    if (missing.length) {
      console.error("Missing required env vars:");
      missing.forEach((k) => console.error(`- ${k}`));
    }
    if (publicLeak.length) {
      console.error("Potential secret exposure: these vars are prefixed with NEXT_PUBLIC_ and should not be public:");
      publicLeak.forEach((k) => console.error(`- ${k}`));
    }
    process.exit(1);
  }
}

main();
