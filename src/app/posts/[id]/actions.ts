"use server";

import { getPostById, FacebookPostRecord } from "@/lib/repositories/posts";

export async function getPostDetailsAction(postId: string): Promise<FacebookPostRecord | null> {
  return await getPostById(postId);
}
