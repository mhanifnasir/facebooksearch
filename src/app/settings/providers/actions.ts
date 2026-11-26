"use server";

import { getCurrentUser } from "@/app/auth/actions";
import { ProviderName } from "@/lib/providers/types";
import {
  getProviderGuardrailConfig,
  getProviderMonthlyUsage,
  setProviderGuardrailOverride,
  checkProviderQuota,
  ProviderStatus,
} from "@/lib/providers/guardrails";
import { maskSecret, sanitizeErrorMessage } from "@/lib/security";
import { TavilyProvider } from "@/lib/providers/tavily";
import { BraveProvider } from "@/lib/providers/brave";
import { MetaGraphProvider } from "@/lib/providers/meta";
import * as z from "zod";

export interface ProviderSettingView {
  id: ProviderName;
  name: string;
  enabled: boolean;
  isConfigured: boolean;
  status: ProviderStatus;
  monthlyLimit: number;
  publishedLimit: number;
  safetyMarginPct: number;
  usedQuota: number;
  remainingQuota: number;
  unit: string;
  costEstimate: string;
  lastSuccessfulRequest: string | null;
  maskedSecret: string;
  documentationUrl: string;
  recentErrors: Array<{ message: string; timestamp: string }>;
}

const updateSettingsSchema = z.object({
  provider: z.enum(["tavily", "brave", "meta_graph"]),
  enabled: z.boolean().optional(),
  customLimit: z.number().int().min(10).max(10000).optional(),
});

/**
 * Returns comprehensive settings and telemetry for Tavily, Brave, and Meta providers.
 * Enforces server-only secret masking — raw API keys are NEVER exposed to the frontend.
 */
export async function getProviderSettingsAction(): Promise<{
  providers: ProviderSettingView[];
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { providers: [], error: "Unauthorized access. Please log in." };
    }

    const tavily = new TavilyProvider();
    const brave = new BraveProvider();
    const meta = new MetaGraphProvider();

    const providerList: ProviderName[] = ["tavily", "brave", "meta_graph"];
    const results: ProviderSettingView[] = [];

    for (const id of providerList) {
      const config = getProviderGuardrailConfig(id);
      const usageInfo = await getProviderMonthlyUsage(id);
      const quotaCheck = await checkProviderQuota(id, 0);

      let isConfigured = false;
      let rawSecret: string | undefined;
      let docsUrl = "";

      if (id === "tavily") {
        isConfigured = tavily.isConfigured();
        rawSecret = process.env.TAVILY_API_KEY;
        docsUrl = "https://docs.tavily.com";
      } else if (id === "brave") {
        isConfigured = brave.isConfigured();
        rawSecret = process.env.BRAVE_API_KEY || process.env.BRAVE_SEARCH_API_KEY;
        docsUrl = "https://brave.com/search/api/";
      } else if (id === "meta_graph") {
        isConfigured = meta.isConfigured();
        rawSecret = process.env.META_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN;
        docsUrl = "https://developers.facebook.com/docs/graph-api/";
      }

      let status: ProviderStatus = "operational";
      if (!isConfigured) {
        status = "not_configured";
      } else if (!config.enabled) {
        status = "disabled";
      } else if (!quotaCheck.allowed && quotaCheck.status === "quota_exhausted") {
        status = "quota_exhausted";
      }

      // Cost calculation
      let costEstimate = "$0.00";
      if (id === "brave") {
        const spentUsd = (usageInfo.usedQuota * config.costPerUnitUsd).toFixed(2);
        costEstimate = `$${spentUsd} / $5.00`;
      } else if (id === "tavily") {
        costEstimate = `${usageInfo.usedQuota} / ${config.effectiveMonthlyLimit} credits`;
      } else {
        costEstimate = `${usageInfo.usedQuota} calls`;
      }

      results.push({
        id,
        name: config.displayName,
        enabled: config.enabled,
        isConfigured,
        status,
        monthlyLimit: config.effectiveMonthlyLimit,
        publishedLimit: config.publishedMonthlyLimit,
        safetyMarginPct: config.safetyMarginPct,
        usedQuota: usageInfo.usedQuota,
        remainingQuota: Math.max(0, config.effectiveMonthlyLimit - usageInfo.usedQuota),
        unit: config.unit,
        costEstimate,
        lastSuccessfulRequest: usageInfo.lastSuccessfulAt,
        maskedSecret: maskSecret(rawSecret),
        documentationUrl: docsUrl,
        recentErrors: usageInfo.recentErrors.map((e) => ({
          message: sanitizeErrorMessage(e.message),
          timestamp: e.timestamp,
        })),
      });
    }

    return { providers: results };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to load provider settings";
    return { providers: [], error: sanitizeErrorMessage(errorMsg) };
  }
}

/**
 * Tests connection to a provider using server-side keys without exposing secrets.
 */
export async function testProviderConnectionAction(provider: ProviderName): Promise<{
  success: boolean;
  latencyMs: number;
  message: string;
  status: ProviderStatus;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      latencyMs: 0,
      message: "Authentication required to test provider connection.",
      status: "disabled",
    };
  }

  const startTime = Date.now();

  try {
    if (provider === "tavily") {
      const tavily = new TavilyProvider();
      if (!tavily.isConfigured()) {
        return {
          success: false,
          latencyMs: 0,
          message: "Tavily API key is not configured in server environment (TAVILY_API_KEY).",
          status: "not_configured",
        };
      }

      const res = await tavily.search({ query: "Facebook", limit: 1, timeoutMs: 5000 });
      const latency = Date.now() - startTime;

      if (res.error) {
        return {
          success: false,
          latencyMs: latency,
          message: sanitizeErrorMessage(res.error),
          status: res.error.includes("429") ? "quota_exhausted" : "degraded",
        };
      }

      return {
        success: true,
        latencyMs: latency,
        message: `Connection Verified (200 OK) • Tavily responded in ${latency}ms`,
        status: "operational",
      };
    }

    if (provider === "brave") {
      const brave = new BraveProvider();
      if (!brave.isConfigured()) {
        return {
          success: false,
          latencyMs: 0,
          message:
            "Brave Search API key is not configured in server environment (BRAVE_API_KEY / BRAVE_SEARCH_API_KEY).",
          status: "not_configured",
        };
      }

      const res = await brave.search({ query: "Facebook", limit: 1, timeoutMs: 5000 });
      const latency = Date.now() - startTime;

      if (res.error) {
        return {
          success: false,
          latencyMs: latency,
          message: sanitizeErrorMessage(res.error),
          status: res.error.includes("429") ? "quota_exhausted" : "degraded",
        };
      }

      return {
        success: true,
        latencyMs: latency,
        message: `Connection Verified (200 OK) • Brave Search responded in ${latency}ms`,
        status: "operational",
      };
    }

    if (provider === "meta_graph") {
      const meta = new MetaGraphProvider();
      if (!meta.isConfigured()) {
        return {
          success: false,
          latencyMs: 0,
          message:
            "Meta Access Token is not configured in server environment (META_ACCESS_TOKEN / META_PAGE_ACCESS_TOKEN).",
          status: "not_configured",
        };
      }

      const val = await meta.validateToken();
      const latency = Date.now() - startTime;

      if (!val.valid) {
        return {
          success: false,
          latencyMs: latency,
          message: sanitizeErrorMessage(val.error || "Token verification failed."),
          status: val.status,
        };
      }

      return {
        success: true,
        latencyMs: latency,
        message: `Token Verified (200 OK) • Meta Graph API connected in ${latency}ms`,
        status: "operational",
      };
    }

    return {
      success: false,
      latencyMs: 0,
      message: "Unsupported provider requested.",
      status: "not_configured",
    };
  } catch (err: unknown) {
    const latency = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : "Connection attempt failed";
    return {
      success: false,
      latencyMs: latency,
      message: sanitizeErrorMessage(msg),
      status: "degraded",
    };
  }
}

/**
 * Updates provider configuration overrides (enabled state or monthly safety limit).
 */
export async function updateProviderSettingsAction(input: {
  provider: ProviderName;
  enabled?: boolean;
  customLimit?: number;
}): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Authentication required to modify provider settings." };
  }

  const parsed = updateSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: `Invalid input: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
    };
  }

  const { provider, enabled, customLimit } = parsed.data;

  setProviderGuardrailOverride(provider, { enabled, customLimit });

  return {
    success: true,
    message: `${provider.toUpperCase()} provider settings updated successfully.`,
  };
}
