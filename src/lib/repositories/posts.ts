import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Tables, InsertTables } from "@/lib/supabase/types";

export type FacebookPostRecord = Tables<"facebook_posts">;
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
 * Retrieves public Facebook posts from the database cache.
 */
export async function getPosts(params?: {
  search?: string;
  contentType?: string;
  provider?: string;
  pageId?: string;
  limit?: number;
  offset?: number;
}): Promise<FacebookPostRecord[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("facebook_posts").select("*");

    if (params?.search) {
      query = query.or(
        `title.ilike.%${params.search}%,snippet.ilike.%${params.search}%,page_name.ilike.%${params.search}%`
      );
    }

    if (params?.contentType && params.contentType !== "all") {
      query = query.eq("content_type", params.contentType);
    }

    if (params?.provider && params.provider !== "all") {
      query = query.eq("provider", params.provider);
    }

    if (params?.pageId) {
      query = query.eq("page_id", params.pageId);
    }

    query = query
      .order("published_at", { ascending: false })
      .range(
        params?.offset ?? 0,
        (params?.offset ?? 0) + (params?.limit ?? 20) - 1
      );

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching posts:", error.message);
      return [];
    }

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Retrieves a single post by ID along with its associated page and comments.
 */
export async function getPostById(
  postId: string
): Promise<FacebookPostRecord | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("facebook_posts")
      .select("*")
      .eq("id", postId)
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
 * Retrieves public comments associated with a specific post.
 */
export async function getCommentsForPost(
  postId: string
): Promise<FacebookCommentRecord[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("facebook_comments")
      .select("*")
      .eq("post_id", postId)
      .order("likes_count", { ascending: false });

    if (error) {
      console.error("Error fetching comments for post:", error.message);
      return [];
    }

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Inserts or updates a post in the database.
 */
export async function upsertPost(
  post: InsertTables<"facebook_posts">,
  useAdmin = true
): Promise<FacebookPostRecord | null> {
  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { data, error } = await supabase
      .from("facebook_posts")
      .upsert(post, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Error upserting post:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Failed to upsert post:", err);
    return null;
  }
}

/**
 * Inserts or updates a batch of posts in the database.
 */
export async function upsertPostsBatch(
  posts: InsertTables<"facebook_posts">[],
  useAdmin = true
): Promise<FacebookPostRecord[]> {
  if (!posts || posts.length === 0) return [];

  try {
    const supabase = await getSafeSupabaseClient(useAdmin);

    const { data, error } = await supabase
      .from("facebook_posts")
      .upsert(posts, { onConflict: "id" })
      .select();

    if (error) {
      console.error("Error upserting posts batch:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Failed to upsert posts batch:", err);
    return [];
  }
}
