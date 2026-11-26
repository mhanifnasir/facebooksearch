import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Tables, InsertTables } from "@/lib/supabase/types";

export type FacebookCommentRecord = Tables<"facebook_comments">;

async function getSafeSupabaseClient(useAdmin = false) {
  if (useAdmin) return createAdminClient();
  try {
    return await createClient();
  } catch {
    return createAdminClient();
  }
}

/**
 * Saves a batch of official Facebook comments retrieved from the Meta Graph API.
 * Ensures snippets are never mistakenly stored as comments.
 */
export async function saveCommentsBatch(
  comments: InsertTables<"facebook_comments">[],
  useAdmin = true
): Promise<FacebookCommentRecord[]> {
  if (!comments || comments.length === 0) return [];

  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { data, error } = await supabase
      .from("facebook_comments")
      .upsert(comments, { onConflict: "id" })
      .select();

    if (error) {
      console.error("Error upserting facebook comments:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Failed to save facebook comments batch:", err);
    return [];
  }
}

/**
 * Fetches all stored comments for a specific Facebook Post.
 */
export async function getCommentsByPostId(
  postId: string,
  limit = 50,
  useAdmin = false
): Promise<FacebookCommentRecord[]> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { data, error } = await supabase
      .from("facebook_comments")
      .select("*")
      .eq("post_id", postId)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching comments by postId:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Failed to get comments by postId:", err);
    return [];
  }
}
