"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { FacebookCommentRecord } from "@/lib/repositories/facebook-comments";

export async function getDiscoveredCommentsAction(params?: {
  search?: string;
  sentiment?: string;
  limit?: number;
}): Promise<FacebookCommentRecord[]> {
  const adminClient = createAdminClient();
  let query = adminClient
    .from("facebook_comments")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(params?.limit || 50);

  if (params?.search) {
    query = query.or(
      `text.ilike.%${params.search}%,author_name.ilike.%${params.search}%`
    );
  }

  if (params?.sentiment && params.sentiment !== "all") {
    query = query.eq("sentiment", params.sentiment);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching comments:", error.message);
    return [];
  }

  return data || [];
}
