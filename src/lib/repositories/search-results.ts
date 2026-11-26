import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Tables, InsertTables } from "@/lib/supabase/types";

export type SearchResultRecord = Tables<"search_results">;

async function getSafeSupabaseClient(useAdmin = false) {
  if (useAdmin) return createAdminClient();
  try {
    return await createClient();
  } catch {
    return createAdminClient();
  }
}

/**
 * Inserts a batch of search-to-post links into the search_results table.
 */
export async function createSearchResultsBatch(
  records: InsertTables<"search_results">[],
  useAdmin = true
): Promise<SearchResultRecord[]> {
  if (!records || records.length === 0) return [];

  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { data, error } = await supabase
      .from("search_results")
      .insert(records)
      .select();

    if (error) {
      console.error("Error inserting search results batch:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Failed to insert search results batch:", err);
    return [];
  }
}

/**
 * Fetches all search result records for a given search query ID.
 */
export async function getSearchResultsBySearchId(
  searchId: string,
  useAdmin = false
): Promise<SearchResultRecord[]> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { data, error } = await supabase
      .from("search_results")
      .select("*")
      .eq("search_id", searchId)
      .order("relevance_score", { ascending: false });

    if (error) {
      console.error("Error fetching search results by searchId:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Failed to get search results:", err);
    return [];
  }
}
