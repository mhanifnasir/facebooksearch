import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Database, Tables, InsertTables, UpdateTables } from "@/lib/supabase/types";
import { SearchStatus } from "@/lib/providers/types";

export type SearchRecord = Tables<"searches">;
export type CreateSearchInput = Omit<InsertTables<"searches">, "id" | "created_at" | "executed_at">;

async function getSafeSupabaseClient(useAdmin = false) {
  if (useAdmin) return createAdminClient();
  try {
    return await createClient();
  } catch {
    return createAdminClient();
  }
}

/**
 * Inserts a new search query record into the database for the authenticated user.
 */
export async function createSearch(
  input: CreateSearchInput,
  useAdmin = false
): Promise<SearchRecord | null> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { data, error } = await supabase
      .from("searches")
      .insert({
        user_id: input.user_id,
        query: input.query.trim(),
        exact_phrase: input.exact_phrase ?? false,
        filters_summary: input.filters_summary || null,
        content_types: input.content_types || ["post", "page", "video"],
        require_comments: input.require_comments ?? false,
        date_range: input.date_range || "all",
        provider: input.provider || "all",
        results_count: input.results_count ?? 0,
        execution_time_ms: input.execution_time_ms ?? 0,
        status: input.status || "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating search record:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Failed to create search record:", err);
    return null;
  }
}

/**
 * Updates the status, results count, or execution metrics of a search record.
 */
export async function updateSearchStatus(
  searchId: string,
  status: SearchStatus,
  resultsCount?: number,
  executionTimeMs?: number,
  useAdmin = true
): Promise<SearchRecord | null> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const updates: UpdateTables<"searches"> = {
      status,
      ...(resultsCount !== undefined ? { results_count: resultsCount } : {}),
      ...(executionTimeMs !== undefined ? { execution_time_ms: executionTimeMs } : {}),
    };

    const { data, error } = await supabase
      .from("searches")
      .update(updates)
      .eq("id", searchId)
      .select()
      .single();

    if (error) {
      console.error("Error updating search status:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Failed to update search status:", err);
    return null;
  }
}

/**
 * Retrieves the search history for a specific user, ordered newest first.
 * Row Level Security (RLS) ensures users cannot see other users' searches.
 */
export async function getSearches(userId: string, limit = 50): Promise<SearchRecord[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("searches")
      .select("*")
      .eq("user_id", userId)
      .order("executed_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching user searches:", error.message);
      return [];
    }

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Retrieves a single search by ID, enforcing user ownership.
 * Prevents Insecure Direct Object Reference (IDOR).
 */
export async function getSearchById(searchId: string, userId: string): Promise<SearchRecord | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("searches")
      .select("*")
      .eq("id", searchId)
      .eq("user_id", userId)
      .single();

    if (error) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Deletes a search record owned by the authenticated user.
 */
export async function deleteSearch(searchId: string, userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("searches")
      .delete()
      .eq("id", searchId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting search record:", error.message);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Clears all search history for a user.
 */
export async function clearUserSearches(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("searches")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Error clearing search history:", error.message);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
