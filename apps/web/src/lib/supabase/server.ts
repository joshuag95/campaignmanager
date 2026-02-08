import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

// Service-role client for server-side route handlers.
// Keep usage limited to trusted endpoints and always apply app-level auth checks.
export function createServiceSupabaseClient() {
  const env = getEnv();

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
