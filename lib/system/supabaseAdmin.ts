import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export function supabaseAdmin() {
  return createSupabaseAdminClient();
}
