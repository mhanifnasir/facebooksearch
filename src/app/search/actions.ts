"use server";

import { searchOrchestrator } from "@/lib/search/orchestrator";
import { getCurrentUser } from "@/app/auth/actions";
import { MetaGraphProvider } from "@/lib/providers/meta";
import { saveCommentsBatch, getCommentsByPostId } from "@/lib/repositories/facebook-comments";
import { ProviderName, MetaCommentsResponse } from "@/lib/providers/types";

export interface ExecuteSearchParams {
  query: string;
  exactPhrase?: boolean;
  contentTypes?: string[];
  targetType?: "all" | "post" | "page" | "video" | "unknown";
  requireComments?: boolean;
  dateFilter?: "all" | "24h" | "7d" | "30d" | "custom";
  provider?: string;
  limit?: number;
  searchDepth?: "basic" | "advanced";
  includeRawContent?: boolean;
}

export async function executeSearchAction(params: ExecuteSearchParams) {
  const user = await getCurrentUser();
  const userId = user?.id;

  const providerPref =
    params.provider === "tavily" ||
    params.provider === "brave" ||
    params.provider === "meta_graph"
      ? (params.provider as ProviderName)
      : "all";

  const searchOutput = await searchOrchestrator.search({
    query: params.query,
    exactPhrase: params.exactPhrase,
    providerPreference: providerPref,
    targetType: params.targetType || "all",
    contentTypes: params.contentTypes,
    userId: userId && userId !== "demo-user-uuid" ? userId : undefined,
    dateRange: params.dateFilter,
    requireComments: params.requireComments,
    limit: params.limit || 20,
    searchDepth: params.searchDepth,
    includeRawContent: params.includeRawContent,
  });

  return searchOutput;
}

/**
 * Server Action to retry a specific failed provider job.
 */
export async function retryProviderJobAction(jobId: string) {
  return await searchOrchestrator.retrySearchJob(jobId);
}

/**
 * Server Action to fetch authentic Facebook comments from the Meta Graph API comments edge.
 * Enforces pagination and strictly prevents search-engine snippets from being stored as comments.
 */
export async function fetchPostCommentsAction(
  postId: string,
  cursor?: string
): Promise<MetaCommentsResponse> {
  const metaProvider = new MetaGraphProvider();

  // If Meta Graph is configured, fetch live comments
  if (metaProvider.isConfigured()) {
    const response = await metaProvider.fetchPostComments(postId, { after: cursor, limit: 25 });

    if (response.comments.length > 0) {
      // Save permitted authentic comments to Supabase
      const commentInserts = response.comments.map((c) => ({
        id: c.id,
        post_id: c.postId,
        post_title: c.postTitle || null,
        author_name: c.authorName,
        author_avatar: c.authorAvatar || null,
        text: c.text,
        published_at: c.publishedAt,
        likes_count: c.likesCount,
        replies_count: c.repliesCount || 0,
        sentiment: "neutral",
        is_top_comment: false,
      }));

      await saveCommentsBatch(commentInserts, true);
    }

    return response;
  }

  // Fallback: Return previously cached comments for this post if available
  const cachedComments = await getCommentsByPostId(postId, 50, true);
  if (cachedComments.length > 0) {
    return {
      comments: cachedComments.map((c) => ({
        id: c.id,
        postId: c.post_id,
        postTitle: c.post_title || undefined,
        text: c.text,
        authorName: c.author_name,
        authorAvatar: c.author_avatar || undefined,
        publishedAt: c.published_at,
        likesCount: c.likes_count,
        repliesCount: c.replies_count,
      })),
      totalCount: cachedComments.length,
      hasMore: false,
    };
  }

  return {
    comments: [],
    hasMore: false,
    error:
      "Meta Graph API connector is not configured. Add META_PAGE_ACCESS_TOKEN to retrieve live comments.",
  };
}
