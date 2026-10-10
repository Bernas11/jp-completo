import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// nunca importar isto em código que corre no browser — só Server
// Components/Actions. Bypassa RLS por completo.
export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
