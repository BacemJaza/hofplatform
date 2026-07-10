// Server-only admin client for the user's EXTERNAL Supabase project.
// NEVER import this file from client/component code.

import { supabaseAdmin } from "./client.server";

export function getExternalSupabaseAdmin() {
  return supabaseAdmin;
}
