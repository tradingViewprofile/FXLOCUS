import "server-only";

import { createD1SupabaseClient } from "@/lib/db/d1Supabase";

export function createSupabaseServerClient() {
  // Legacy helper kept for repo compatibility. It used to attach Supabase auth cookies.
  // Auth is now implemented by our own session cookie, so this returns a D1-backed client.
  return createD1SupabaseClient();
}


