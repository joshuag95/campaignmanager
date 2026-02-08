import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

// Auth helper for API routes:
// validates bearer token first, then falls back to cookie-based Supabase SSR session.
export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");

  // Priority 1: explicit bearer token from API clients.
  if (authHeader?.startsWith("Bearer ")) {
    const accessToken = authHeader.slice("Bearer ".length).trim();
    if (!accessToken) {
      return null;
    }

    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      return null;
    }

    return data.user.id;
  }

  // Priority 2: browser cookie session for SSR-based auth flows.
  const env = getEnv();
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Route handlers in this project currently do not refresh/rotate session cookies.
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}
