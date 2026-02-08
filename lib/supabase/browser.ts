"use client";

export function createSupabaseBrowserClient(): never {
  // We no longer allow client-side direct DB access after migrating off Supabase.
  // Client components should call our Next.js Route Handlers instead.
  throw new Error("Supabase browser client is not available. Use API routes instead.");
}
