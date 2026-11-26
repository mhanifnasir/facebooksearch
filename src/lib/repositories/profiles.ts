import { createClient } from "@/lib/supabase/server";
import { Tables, UpdateTables } from "@/lib/supabase/types";

export type ProfileRecord = Tables<"profiles">;

/**
 * Retrieves user profile by user ID.
 */
export async function getProfile(userId: string): Promise<ProfileRecord | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Updates user profile details (full name, organization, timezone).
 */
export async function updateProfile(
  userId: string,
  updates: {
    fullName?: string;
    organization?: string;
    timezone?: string;
    avatarUrl?: string;
  }
): Promise<ProfileRecord | null> {
  const supabase = await createClient();

  const payload: UpdateTables<"profiles"> = {};
  if (updates.fullName !== undefined) payload.full_name = updates.fullName;
  if (updates.organization !== undefined) payload.organization = updates.organization;
  if (updates.timezone !== undefined) payload.timezone = updates.timezone;
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error.message);
    return null;
  }

  return data;
}
