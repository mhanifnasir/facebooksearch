"use server";

import { getCurrentUser } from "@/app/auth/actions";
import {
  getSearches,
  deleteSearch,
  clearUserSearches,
  SearchRecord,
} from "@/lib/repositories/searches";

export async function getUserSearchHistoryAction(): Promise<SearchRecord[]> {
  const user = await getCurrentUser();
  if (!user?.id) return [];
  return await getSearches(user.id, 100);
}

export async function deleteSearchHistoryItemAction(searchId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user?.id) return false;
  return await deleteSearch(searchId, user.id);
}

export async function clearAllSearchHistoryAction(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user?.id) return false;
  return await clearUserSearches(user.id);
}
