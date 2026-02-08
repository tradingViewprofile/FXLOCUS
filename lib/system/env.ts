import "server-only";

export function mustGetEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export const ENV = {
  // Required for system login/session cookie signing.
  SYSTEM_JWT_SECRET: () => mustGetEnv("SYSTEM_JWT_SECRET"),

  RESEND_API_KEY: () => process.env.RESEND_API_KEY ?? "",
  APP_BASE_URL: () => process.env.APP_BASE_URL ?? "",

  // R2 (S3-compatible) credentials used by presign helpers.
  R2_ENDPOINT: () => process.env.R2_ENDPOINT ?? "",
  R2_ACCESS_KEY_ID: () => process.env.R2_ACCESS_KEY_ID ?? "",
  R2_SECRET_ACCESS_KEY: () => process.env.R2_SECRET_ACCESS_KEY ?? "",
  R2_BUCKET: () => process.env.R2_BUCKET ?? "",
  R2_PUBLIC_BASE_URL: () => process.env.R2_PUBLIC_BASE_URL ?? process.env.R2_CDN_BASE_URL ?? ""
} as const;
