import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Tables, InsertTables, UpdateTables } from "@/lib/supabase/types";
import { JobStatus, ProviderName } from "@/lib/providers/types";

export type SearchJobRecord = Tables<"search_jobs">;

/**
 * Helper to get a Supabase client that safely falls back to admin
 * when executed outside an active Next.js cookie request scope.
 */
async function getSafeSupabaseClient(useAdmin = false) {
  if (useAdmin) return createAdminClient();
  try {
    return await createClient();
  } catch {
    return createAdminClient();
  }
}

/**
 * Creates a new provider search job record in Supabase.
 */
export async function createSearchJob(
  input: InsertTables<"search_jobs">,
  useAdmin = true
): Promise<SearchJobRecord | null> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { data, error } = await supabase
      .from("search_jobs")
      .insert({
        user_id: input.user_id,
        search_id: input.search_id || null,
        provider: input.provider,
        status: input.status || "pending",
        total_found: input.total_found ?? 0,
        error_message: input.error_message || null,
        started_at: input.started_at || new Date().toISOString(),
        completed_at: input.completed_at || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating search job record:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Failed to create search job:", err);
    return null;
  }
}

/**
 * Updates an existing provider search job with execution results or error details.
 */
export async function updateSearchJob(
  jobId: string,
  updates: UpdateTables<"search_jobs">,
  useAdmin = true
): Promise<SearchJobRecord | null> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { data, error } = await supabase
      .from("search_jobs")
      .update(updates)
      .eq("id", jobId)
      .select()
      .single();

    if (error) {
      console.error("Error updating search job:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Failed to update search job:", err);
    return null;
  }
}

/**
 * Retrieves all provider jobs for a specific search ID.
 */
export async function getSearchJobsBySearchId(
  searchId: string,
  useAdmin = false
): Promise<SearchJobRecord[]> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { data, error } = await supabase
      .from("search_jobs")
      .select("*")
      .eq("search_id", searchId)
      .order("started_at", { ascending: true });

    if (error) {
      console.error("Error fetching search jobs:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Failed to get search jobs:", err);
    return [];
  }
}

/**
 * Retrieves a single search job by ID.
 */
export async function getSearchJobById(
  jobId: string,
  useAdmin = true
): Promise<SearchJobRecord | null> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { data, error } = await supabase
      .from("search_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}
