/**
 * Facebook Public Content Search - Provider Guardrails & Free-Tier Cost Controls
 *
 * Enforces strict free-tier quotas, safety margins, and cost controls:
 * - Tavily: max 1,000 credits/mo with dynamic credit calculation (basic = 1, advanced/extract = 2).
 *   Safety margin threshold: 950 credits (5% safety buffer).
 * - Brave: max $5.00/mo credit budget (~1,000 requests) with strictly NO automatic top-ups.
 *   Safety margin threshold: $4.75 (950 queries).
 * - Meta Graph: Token validity enforcement, permissions checking, and rate limit tracking.
 * - Automatic provider failover: if a provider exhausts its quota, it is marked 'quota_exhausted'
 *   and disabled for the period while remaining providers continue execution.
 */

import { ProviderName } from "./types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ProviderStatus =
  | "operational"
  | "degraded"
  | "quota_exhausted"
  | "disabled"
  | "not_configured"
  | "token_expired";

export interface ProviderGuardrailConfig {
  provider: ProviderName;
  displayName: string;
  enabled: boolean;
  publishedMonthlyLimit: number; // Official provider free-tier cap
  safetyMarginPct: number;       // Safety buffer percentage (e.g. 5%)
  effectiveMonthlyLimit: number; // Hard cap after applying safety buffer
  unit: string;                  // "credits" | "queries" | "calls"
  costPerUnitUsd: number;        // USD cost equivalent
  supportsAutoTopup: false;      // Strictly false - never enable paid automatic top-ups
}

// Initial application defaults with safety margin buffers
export const DEFAULT_GUARDRAILS: Record<ProviderName, ProviderGuardrailConfig> = {
  tavily: {
    provider: "tavily",
    displayName: "Tavily Search API",
    enabled: true,
    publishedMonthlyLimit: 1000,
    safetyMarginPct: 5,
    effectiveMonthlyLimit: 950, // 1000 - 5% safety margin
    unit: "credits",
    costPerUnitUsd: 0.005,
    supportsAutoTopup: false,
  },
  brave: {
    provider: "brave",
    displayName: "Brave Search API",
    enabled: true,
    publishedMonthlyLimit: 1000, // $5.00 budget at $0.005/req
    safetyMarginPct: 5,
    effectiveMonthlyLimit: 950, // $4.75 budget (950 queries)
    unit: "queries ($5 budget)",
    costPerUnitUsd: 0.005,
    supportsAutoTopup: false,
  },
  meta_graph: {
    provider: "meta_graph",
    displayName: "Meta Graph API v21.0",
    enabled: true,
    publishedMonthlyLimit: 2000,
    safetyMarginPct: 5,
    effectiveMonthlyLimit: 1900,
    unit: "API calls",
    costPerUnitUsd: 0.0,
    supportsAutoTopup: false,
  },
};

// In-memory runtime override store (can be toggled by user/admin)
const guardrailOverrides = new Map<
  ProviderName,
  { enabled?: boolean; customLimit?: number }
>();

// In-memory test usage accumulator for test suites and offline environments
let testUsageOverrides = new Map<ProviderName, number>();

/**
 * Calculates dynamic Tavily credit consumption.
 * Rule: "Do not assume one request always consumes one credit;
 * calculate Tavily credits according to the selected operation."
 */
export function calculateTavilyCredits(operation: {
  searchDepth?: "basic" | "advanced";
  includeRawContent?: boolean;
}): number {
  if (operation.searchDepth === "advanced" || operation.includeRawContent) {
    return 2; // Advanced search or raw HTML extraction consumes 2 credits
  }
  return 1; // Standard basic search consumes 1 credit
}

/**
 * Retrieves the current effective guardrail configuration for a provider.
 */
export function getProviderGuardrailConfig(
  provider: ProviderName
): ProviderGuardrailConfig {
  const base = DEFAULT_GUARDRAILS[provider];
  const override = guardrailOverrides.get(provider);

  if (!override) return base;

  const effectiveLimit =
    override.customLimit !== undefined
      ? Math.min(override.customLimit, base.publishedMonthlyLimit)
      : base.effectiveMonthlyLimit;

  return {
    ...base,
    enabled: override.enabled !== undefined ? override.enabled : base.enabled,
    effectiveMonthlyLimit: effectiveLimit,
  };
}

/**
 * Sets an administrative or user override for provider configuration.
 */
export function setProviderGuardrailOverride(
  provider: ProviderName,
  updates: { enabled?: boolean; customLimit?: number }
): void {
  const existing = guardrailOverrides.get(provider) || {};
  guardrailOverrides.set(provider, { ...existing, ...updates });
}

/**
 * Computes current monthly usage from the Supabase provider_usage table
 * starting from the 1st day of the current calendar month (UTC).
 */
export async function getProviderMonthlyUsage(
  provider: ProviderName,
  useAdmin = true
): Promise<{ usedQuota: number; lastSuccessfulAt: string | null; recentErrors: Array<{ message: string; timestamp: string }> }> {
  // Check if an in-memory test override is active
  if (testUsageOverrides.has(provider)) {
    return {
      usedQuota: testUsageOverrides.get(provider) || 0,
      lastSuccessfulAt: new Date().toISOString(),
      recentErrors: [],
    };
  }

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

    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("provider_usage")
      .select("quota_cost, success, error_message, created_at")
      .eq("provider", provider)
      .gte("created_at", startOfMonth.toISOString())
      .order("created_at", { ascending: false });

    if (error || !data) {
      return { usedQuota: 0, lastSuccessfulAt: null, recentErrors: [] };
    }

    let used = 0;
    let lastSuccessfulAt: string | null = null;
    const recentErrors: Array<{ message: string; timestamp: string }> = [];

    for (const record of data) {
      used += record.quota_cost || 1;
      if (record.success && !lastSuccessfulAt) {
        lastSuccessfulAt = record.created_at;
      }
      if (!record.success && record.error_message && recentErrors.length < 5) {
        recentErrors.push({
          message: record.error_message,
          timestamp: record.created_at,
        });
      }
    }

    return { usedQuota: used, lastSuccessfulAt, recentErrors };
  } catch {
    return { usedQuota: 0, lastSuccessfulAt: null, recentErrors: [] };
  }
}

export interface QuotaCheckResult {
  allowed: boolean;
  status: ProviderStatus;
  usedThisMonth: number;
  monthlyLimit: number;
  remainingQuota: number;
  reason?: string;
}

/**
 * Checks if a provider has sufficient quota to execute an operation.
 * If quota is exhausted, enforces free usage protection by disallowing the request.
 */
export async function checkProviderQuota(
  provider: ProviderName,
  operationCost = 1
): Promise<QuotaCheckResult> {
  const config = getProviderGuardrailConfig(provider);

  if (!config.enabled) {
    return {
      allowed: false,
      status: "disabled",
      usedThisMonth: 0,
      monthlyLimit: config.effectiveMonthlyLimit,
      remainingQuota: 0,
      reason: `${config.displayName} is currently disabled in provider settings.`,
    };
  }

  const { usedQuota } = await getProviderMonthlyUsage(provider);
  const remaining = Math.max(0, config.effectiveMonthlyLimit - usedQuota);

  if (usedQuota + operationCost > config.effectiveMonthlyLimit) {
    return {
      allowed: false,
      status: "quota_exhausted",
      usedThisMonth: usedQuota,
      monthlyLimit: config.effectiveMonthlyLimit,
      remainingQuota: remaining,
      reason: `Monthly free-tier quota limit reached (${usedQuota}/${config.effectiveMonthlyLimit} ${config.unit}). Safety margin protection engaged. Paid automatic top-ups are disabled.`,
    };
  }

  return {
    allowed: true,
    status: "operational",
    usedThisMonth: usedQuota,
    monthlyLimit: config.effectiveMonthlyLimit,
    remainingQuota: remaining,
  };
}

/**
 * Sets an explicit test usage amount for unit/integration testing.
 */
export function setTestUsage(provider: ProviderName, amount: number): void {
  testUsageOverrides.set(provider, amount);
}

/**
 * Resets test usages and runtime overrides.
 */
export function resetGuardrailOverrides(): void {
  guardrailOverrides.clear();
  testUsageOverrides.clear();
}
