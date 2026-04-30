// Server-only admin client for the user's EXTERNAL Supabase project.
// Uses EXTERNAL_SUPABASE_URL + EXTERNAL_SUPABASE_SERVICE_ROLE_KEY.
// NEVER import this file from client/component code.

import { createClient } from "@supabase/supabase-js";

let cached: ReturnType<typeof createClient> | null = null;

export function getExternalSupabaseAdmin() {
  if (cached) return cached;

  const url = process.env.EXTERNAL_SUPABASE_URL;
  const serviceRoleKey = process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "External Supabase is not configured. Missing EXTERNAL_SUPABASE_URL or EXTERNAL_SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
