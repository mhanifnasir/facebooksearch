import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Tables, InsertTables } from "@/lib/supabase/types";
import { sanitizeErrorMessage } from "@/lib/security";

export type ProviderUsageRecord = Tables<"provider_usage">;

/**
 * Logs a provider API call or scraper execution.
 * Can be called with either user session or admin service role.
 * Automatically sanitizes error messages to prevent credential leaks.
 */
export async function logProviderUsage(
  input: InsertTables<"provider_usage">,
  useAdmin = true
): Promise<ProviderUsageRecord | null> {
  try {
    let supabase;
    if (useAdmin) {
      supabase = createAdminClient();
    } else {
      try {
        supabase = await createClient();
      } catch {
        supabase = createAdminClient();
      }
    }

    const sanitizedError = input.error_message
      ? sanitizeErrorMessage(input.error_message)
      : null;

    const { data, error } = await supabase
      .from("provider_usage")
      .insert({
        user_id: input.user_id || null,
        provider: input.provider,
        endpoint: input.endpoint,
        status_code: input.status_code ?? 200,
        latency_ms: input.latency_ms,
        quota_cost: input.quota_cost ?? 1,
        success: input.success ?? true,
        error_message: sanitizedError,
      })
      .select()
      .single();

    if (error) {
      console.error("Error logging provider usage:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Failed to log provider usage:", err);
    return null;
  }
}

/**
 * Aggregates provider usage metrics for the dashboard.
 */
export async function getProviderUsageSummary(userId?: string, useAdmin = false) {
  let supabase;
  if (useAdmin) {
    supabase = createAdminClient();
  } else {
    try {
      supabase = await createClient();
    } catch {
      supabase = createAdminClient();
    }
  }
  let query = supabase.from("provider_usage").select("*");

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    return {
      totalCalls: 0,
      averageLatencyMs: 0,
      successRate: 100,
      recentLogs: [],
    };
  }

  const totalCalls = data.length;
  const successfulCalls = data.filter((d) => d.success).length;
  const avgLatency =
    totalCalls > 0
      ? Math.round(data.reduce((acc, curr) => acc + curr.latency_ms, 0) / totalCalls)
      : 0;

  return {
    totalCalls,
    averageLatencyMs: avgLatency,
    successRate: totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 100,
    recentLogs: data,
  };
}
