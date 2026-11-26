"use server";

import { getFacebookPages, FacebookPageRecord } from "@/lib/repositories/pages";

export async function getFacebookPagesAction(params?: {
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<FacebookPageRecord[]> {
  return await getFacebookPages(params);
}
