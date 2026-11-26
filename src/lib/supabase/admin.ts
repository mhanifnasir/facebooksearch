import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "./types";

/**
 * Server-only Supabase Admin Client using the Service Role Key.
 * Bypasses Row Level Security (RLS) for backend indexing tasks,
 * automated scraper webhook ingestion, and provider usage tracking.
 *
 * CRITICAL SECURITY:
 * - NEVER import or call this function in Client Components.
 * - NEVER prefix SUPABASE_SERVICE_ROLE_KEY with NEXT_PUBLIC_.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY VIOLATION: createAdminClient() was called in a client browser environment. This client must only be used on the server."
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
