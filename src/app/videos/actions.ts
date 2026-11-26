"use server";

import { getPosts, FacebookPostRecord } from "@/lib/repositories/posts";

export async function getFacebookVideosAction(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<FacebookPostRecord[]> {
  const posts = await getPosts({
    search: params?.search,
    limit: params?.limit || 24,
    offset: params?.offset || 0,
  });

  // Filter video & reel content types
  return posts.filter(
    (p) => p.content_type === "video" || p.content_type === "reel"
  );
}
