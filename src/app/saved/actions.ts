"use server";

import { getCurrentUser } from "@/app/auth/actions";
import {
  getSavedSearches,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
  SavedSearchRecord,
} from "@/lib/repositories/saved-searches";

export async function getSavedSearchesAction(): Promise<SavedSearchRecord[]> {
  const user = await getCurrentUser();
  if (!user?.id) return [];
  return await getSavedSearches(user.id);
}

export async function createSavedSearchAction(input: {
  name: string;
  query: string;
  exactPhrase?: boolean;
  filtersSummary?: string;
  alertFrequency?: string;
  notifyEmail?: boolean;
}): Promise<SavedSearchRecord | null> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Authentication required to save searches");

  return await createSavedSearch({
    user_id: user.id,
    name: input.name,
    query: input.query,
    exact_phrase: input.exactPhrase ?? false,
    filters_summary: input.filtersSummary || "Posts & Videos • Custom Filter",
    alert_frequency: input.alertFrequency || "daily",
    notify_email: input.notifyEmail ?? true,
    last_results_count: 0,
  });
}

export async function updateSavedSearchAction(
  savedSearchId: string,
  updates: {
    name?: string;
    alertFrequency?: string;
    notifyEmail?: boolean;
  }
): Promise<SavedSearchRecord | null> {
  const user = await getCurrentUser();
  if (!user?.id) throw new Error("Authentication required");

  return await updateSavedSearch(savedSearchId, user.id, {
    ...(updates.name ? { name: updates.name } : {}),
    ...(updates.alertFrequency ? { alert_frequency: updates.alertFrequency } : {}),
    ...(updates.notifyEmail !== undefined ? { notify_email: updates.notifyEmail } : {}),
  });
}

export async function deleteSavedSearchAction(savedSearchId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user?.id) return false;
  return await deleteSavedSearch(savedSearchId, user.id);
}
