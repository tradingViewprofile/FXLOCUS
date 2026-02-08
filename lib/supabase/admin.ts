import "server-only";

import { createD1SupabaseClient } from "@/lib/db/d1Supabase";

export function createSupabaseAdminClient() {
  // Backwards compatible API surface for the repo: this used to be a Supabase service-role client.
  // We now run on Cloudflare D1 and expose a minimal supabase-like query builder.
  return createD1SupabaseClient();
}

export const supabaseAdmin = createSupabaseAdminClient;

