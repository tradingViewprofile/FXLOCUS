import crypto from "crypto";

export function hashText(value?: string) {
  const text = (value || "").trim();
  if (!text) return null;
  return crypto.createHash("sha256").update(text).digest("hex");
}
