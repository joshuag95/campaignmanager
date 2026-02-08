import { NextRequest } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

// Auth helper for API routes:
// validates a bearer token and returns the authenticated Supabase user id.
export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

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
