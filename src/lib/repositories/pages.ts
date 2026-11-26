import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Tables, InsertTables } from "@/lib/supabase/types";

export type FacebookPageRecord = Tables<"facebook_pages">;

async function getSafeSupabaseClient(useAdmin = false) {
  if (useAdmin) return createAdminClient();
  try {
    return await createClient();
  } catch {
    return createAdminClient();
  }
}

/**
 * Retrieves public Facebook pages from the directory.
 */
export async function getFacebookPages(params?: {
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
  useAdmin?: boolean;
}): Promise<FacebookPageRecord[]> {
  try {
    const supabase = await getSafeSupabaseClient(params?.useAdmin ?? true);
    let query = supabase.from("facebook_pages").select("*");

    if (params?.search) {
      query = query.or(
        `name.ilike.%${params.search}%,username.ilike.%${params.search}%,about.ilike.%${params.search}%`
      );
    }

    if (params?.category && params.category !== "all") {
      query = query.eq("category", params.category);
    }

    query = query
      .order("followers_count", { ascending: false })
      .range(
        params?.offset ?? 0,
        (params?.offset ?? 0) + (params?.limit ?? 30) - 1
      );

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching Facebook pages:", error.message);
      return [];
    }

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Retrieves a single Facebook page by ID.
 */
export async function getFacebookPageById(
  pageId: string,
  useAdmin = true
): Promise<FacebookPageRecord | null> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { data, error } = await supabase
      .from("facebook_pages")
      .select("*")
      .eq("id", pageId)
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
 * Inserts or updates a Facebook page in the directory.
 */
export async function upsertFacebookPage(
  page: InsertTables<"facebook_pages">,
  useAdmin = true
): Promise<FacebookPageRecord | null> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { data, error } = await supabase
      .from("facebook_pages")
      .upsert(page, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Error upserting Facebook page:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Failed to upsert Facebook page:", err);
    return null;
  }
}
