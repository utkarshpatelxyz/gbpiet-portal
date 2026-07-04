import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only client with the service role key. Never import from client code.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-service-key",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
