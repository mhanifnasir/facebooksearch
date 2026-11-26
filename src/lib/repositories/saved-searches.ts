import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Tables, InsertTables, UpdateTables } from "@/lib/supabase/types";

export type SavedSearchRecord = Tables<"saved_searches">;
export type CreateSavedSearchInput = Omit<
  InsertTables<"saved_searches">,
  "id" | "created_at" | "last_run_at"
>;

async function getSafeSupabaseClient(useAdmin = false) {
  if (useAdmin) return createAdminClient();
  try {
    return await createClient();
  } catch {
    return createAdminClient();
  }
}

/**
 * Creates a new saved search for the user.
 */
export async function createSavedSearch(
  input: CreateSavedSearchInput,
  useAdmin = false
): Promise<SavedSearchRecord | null> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { data, error } = await supabase
      .from("saved_searches")
      .insert({
        user_id: input.user_id,
        name: input.name.trim(),
        query: input.query.trim(),
        exact_phrase: input.exact_phrase ?? false,
        filters_summary: input.filters_summary || null,
        alert_frequency: input.alert_frequency || "daily",
        notify_email: input.notify_email ?? true,
        last_results_count: input.last_results_count ?? 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating saved search:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Failed to create saved search:", err);
    return null;
  }
}

/**
 * Retrieves all saved searches belonging to the user.
 */
export async function getSavedSearches(
  userId: string,
  useAdmin = false
): Promise<SavedSearchRecord[]> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { data, error } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching saved searches:", error.message);
      return [];
    }

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Updates a saved search, enforcing user ownership.
 */
export async function updateSavedSearch(
  savedSearchId: string,
  userId: string,
  updates: UpdateTables<"saved_searches">,
  useAdmin = false
): Promise<SavedSearchRecord | null> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { data, error } = await supabase
      .from("saved_searches")
      .update(updates)
      .eq("id", savedSearchId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating saved search:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Failed to update saved search:", err);
    return null;
  }
}

/**
 * Deletes a saved search, enforcing user ownership.
 */
export async function deleteSavedSearch(
  savedSearchId: string,
  userId: string,
  useAdmin = false
): Promise<boolean> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { error } = await supabase
      .from("saved_searches")
      .delete()
      .eq("id", savedSearchId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting saved search:", error.message);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieves saved searches due for execution by serverless cron jobs.
 */
export async function getSavedSearchesDueForRun(
  limit = 5,
  useAdmin = true
): Promise<SavedSearchRecord[]> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);
    const { data, error } = await supabase
      .from("saved_searches")
      .select("*")
      .limit(limit);

    if (error) {
      console.error("Error fetching due saved searches:", error.message);
      return [];
    }

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Updates execution metadata after a saved search runs.
 */
export async function updateSavedSearchRun(
  savedSearchId: string,
  resultsCount: number,
  useAdmin = true
): Promise<boolean> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);
    const { error } = await supabase
      .from("saved_searches")
      .update({
        last_results_count: resultsCount,
        last_run_at: new Date().toISOString(),
      })
      .eq("id", savedSearchId);

    return !error;
  } catch {
    return false;
  }
}
