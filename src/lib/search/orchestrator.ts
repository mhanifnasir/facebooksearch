import {
  SearchProvider,
  ProviderSearchOptions,
  NormalizedSearchResponse,
  NormalizedSearchResult,
  NormalizedContentType,
  ProviderName,
  SearchStatus,
  JobStatus,
  ProviderJobSummary,
} from "@/lib/providers/types";
import { TavilyProvider } from "@/lib/providers/tavily";
import { BraveProvider } from "@/lib/providers/brave";
import { MetaGraphProvider } from "@/lib/providers/meta";
import { logProviderUsage } from "@/lib/repositories/provider-usage";
import {
  createSearch,
  updateSearchStatus,
} from "@/lib/repositories/searches";
import {
  createSearchJob,
  updateSearchJob,
  getSearchJobById,
} from "@/lib/repositories/search-jobs";
import { upsertPostsBatch } from "@/lib/repositories/posts";
import { createSearchResultsBatch } from "@/lib/repositories/search-results";
import {
  isValidFacebookUrl,
  normalizeFacebookUrl,
  classifyConservative,
  deduplicateAndMergeProvenance,
} from "@/lib/search/url-processor";
import { searchExecutionSchema } from "@/lib/search/validation";
import { mockPosts } from "@/lib/mock-data";
import {
  validateSearchQuery,
  checkUserRateLimit,
  sanitizeErrorMessage,
} from "@/lib/security";
import {
  checkProviderQuota,
  calculateTavilyCredits,
} from "@/lib/providers/guardrails";

export interface OrchestratorSearchOptions extends ProviderSearchOptions {
  providerPreference?: "all" | ProviderName;
  userId?: string;
  contentTypes?: string[];
}

export interface OrchestratedSearchOutput {
  results: NormalizedSearchResult[];
  totalFound: number;
  searchId?: string;
  status: SearchStatus;
  jobSummaries: ProviderJobSummary[];
  activeProviders: string[];
  providerResponses: NormalizedSearchResponse[];
  executionTimeMs: number;
  isFallback: boolean;
  notes: string[];
}

export class SearchOrchestrator {
  private tavily = new TavilyProvider();
  private brave = new BraveProvider();
  private meta = new MetaGraphProvider();

  public getProviders(): SearchProvider[] {
    return [this.tavily, this.brave, this.meta];
  }

  public getProviderStatus(): Record<
    ProviderName,
    { configured: boolean; displayName: string }
  > {
    return {
      tavily: {
        configured: this.tavily.isConfigured(),
        displayName: this.tavily.displayName,
      },
      brave: {
        configured: this.brave.isConfigured(),
        displayName: this.brave.displayName,
      },
      meta_graph: {
        configured: this.meta.isConfigured(),
        displayName: this.meta.displayName,
      },
    };
  }

  /**
   * Executes a complete, resilient 14-step multi-provider search lifecycle.
   */
  public async search(
    rawOptions: OrchestratorSearchOptions
  ): Promise<OrchestratedSearchOutput> {
    const startTime = Date.now();
    const notes: string[] = [];

    // 1. SSRF & URI Scheme Protection
    const ssrfCheck = validateSearchQuery(rawOptions.query);
    if (!ssrfCheck.isValid) {
      return {
        results: [],
        totalFound: 0,
        status: "failed",
        jobSummaries: [],
        activeProviders: [],
        providerResponses: [],
        executionTimeMs: Date.now() - startTime,
        isFallback: false,
        notes: [`Security validation failed: ${ssrfCheck.error}`],
      };
    }

    // 2. Per-User Search Rate Limiting (10 requests/min per user)
    const rateCheck = checkUserRateLimit(
      rawOptions.userId || "anonymous",
      10,
      60000
    );
    if (!rateCheck.allowed) {
      return {
        results: [],
        totalFound: 0,
        status: "failed",
        jobSummaries: [],
        activeProviders: [],
        providerResponses: [],
        executionTimeMs: Date.now() - startTime,
        isFallback: false,
        notes: [
          `Search rate limit exceeded (max 10 searches/min). Please try again in ${Math.ceil(
            rateCheck.resetInMs / 1000
          )} seconds.`,
        ],
      };
    }

    // 3. Validate input using Zod
    const validationResult = searchExecutionSchema.safeParse({
      query: ssrfCheck.sanitized,
      exactPhrase: rawOptions.exactPhrase ?? false,
      targetType: rawOptions.targetType ?? "all",
      contentTypes: rawOptions.contentTypes,
      requireComments: rawOptions.requireComments ?? false,
      dateRange: rawOptions.dateRange ?? "all",
      provider: rawOptions.providerPreference || "all",
      limit: rawOptions.limit ?? 20,
      timeoutMs: rawOptions.timeoutMs ?? 8000,
      searchDepth: (rawOptions as any).searchDepth ?? "basic",
      includeRawContent: (rawOptions as any).includeRawContent ?? false,
      userId:
        rawOptions.userId && rawOptions.userId !== "demo-user-uuid"
          ? rawOptions.userId
          : undefined,
    });

    if (!validationResult.success) {
      const errorMsg = validationResult.error.issues
        .map((e) => e.message)
        .join(", ");
      return {
        results: [],
        totalFound: 0,
        status: "failed",
        jobSummaries: [],
        activeProviders: [],
        providerResponses: [],
        executionTimeMs: Date.now() - startTime,
        isFallback: false,
        notes: [`Validation failed: ${errorMsg}`],
      };
    }

    const options = validationResult.data;
    const userId = options.userId;

    // 4. Create search record in Supabase (status: "pending")
    let searchRecordId: string | undefined;
    if (userId) {
      try {
        const searchRecord = await createSearch(
          {
            user_id: userId,
            query: options.query,
            exact_phrase: options.exactPhrase,
            filters_summary: `Types: ${options.contentTypes?.join(", ") || options.targetType} • Provider: ${options.provider}`,
            content_types: options.contentTypes || [options.targetType],
            require_comments: options.requireComments,
            date_range: options.dateRange,
            provider: options.provider,
            results_count: 0,
            execution_time_ms: 0,
            status: "pending",
          },
          true
        );
        if (searchRecord) {
          searchRecordId = searchRecord.id;
          await updateSearchStatus(searchRecordId, "processing", 0, 0, true);
        }
      } catch (err) {
        console.error("Non-blocking search record creation error:", err);
      }
    }

    // Determine candidate providers to execute
    const candidateProviders: SearchProvider[] = [];
    const pref = options.provider;

    if (pref === "tavily") {
      candidateProviders.push(this.tavily);
    } else if (pref === "brave") {
      candidateProviders.push(this.brave);
    } else if (pref === "meta_graph") {
      candidateProviders.push(this.meta);
    } else {
      // "all" - Tavily is default, Brave is secondary, Meta is conditional
      candidateProviders.push(this.tavily);
      if (this.brave.isConfigured()) candidateProviders.push(this.brave);
      if (this.meta.isConfigured()) candidateProviders.push(this.meta);
    }

    // 5. Create provider job records in Supabase (status: "pending")
    const jobSummaries: ProviderJobSummary[] = [];
    const jobRecordIds = new Map<ProviderName, string>();

    for (const provider of candidateProviders) {
      if (userId && searchRecordId) {
        try {
          const job = await createSearchJob(
            {
              user_id: userId,
              search_id: searchRecordId,
              provider: provider.name,
              status: "pending",
              started_at: new Date().toISOString(),
            },
            true
          );
          if (job) {
            jobRecordIds.set(provider.name, job.id);
            jobSummaries.push({
              id: job.id,
              searchId: searchRecordId,
              provider: provider.name,
              status: "pending",
              totalFound: 0,
              startedAt: job.started_at,
            });
          }
        } catch {
          // Continue gracefully
        }
      }
    }

    // 6. Execute selected providers concurrently with Free-Tier Quota Enforcement
    const providerPromises = candidateProviders.map(async (provider) => {
      const jobId = jobRecordIds.get(provider.name);
      if (jobId) {
        await updateSearchJob(jobId, { status: "processing" }, true).catch(() => {});
      }

      // Check provider quota and cost controls before execution
      const operationCost =
        provider.name === "tavily"
          ? calculateTavilyCredits({
              searchDepth: options.searchDepth,
              includeRawContent: options.includeRawContent,
            })
          : 1;

      const quotaCheck = await checkProviderQuota(provider.name, operationCost);
      if (!quotaCheck.allowed) {
        const quotaError = quotaCheck.reason || "Monthly quota exhausted. Free-tier protection engaged.";
        if (jobId) {
          await updateSearchJob(
            jobId,
            {
              status: "failed",
              total_found: 0,
              error_message: quotaError,
              completed_at: new Date().toISOString(),
            },
            true
          ).catch(() => {});

          const existingSummary = jobSummaries.find((j) => j.id === jobId);
          if (existingSummary) {
            existingSummary.status = "failed";
            existingSummary.errorMessage = quotaError;
            existingSummary.completedAt = new Date().toISOString();
          }
        }

        return {
          provider: provider.name,
          providerName: provider.displayName,
          results: [],
          totalFound: 0,
          executionTimeMs: 0,
          quotaCost: 0,
          error: quotaError,
        };
      }

      try {
        const res = await provider.search({
          query: options.query,
          exactPhrase: options.exactPhrase,
          targetType: options.targetType,
          requireComments: options.requireComments,
          dateRange: options.dateRange,
          limit: options.limit,
          timeoutMs: options.timeoutMs,
          searchDepth: options.searchDepth,
          includeRawContent: options.includeRawContent,
        });

        // Non-blocking provider telemetry logging
        if (provider.isConfigured()) {
          logProviderUsage(
            {
              user_id: userId || null,
              provider: provider.name,
              endpoint: provider.name === "meta_graph" ? "me/posts" : "search",
              latency_ms: res.executionTimeMs,
              quota_cost: res.quotaCost,
              success: !res.error,
              error_message: res.error || null,
            },
            true
          ).catch(() => {});
        }

        // Update provider job record status in Supabase
        if (jobId) {
          const jobStatus: JobStatus = res.error ? "failed" : "completed";
          const sanitizedError = res.error ? sanitizeErrorMessage(res.error) : null;
          await updateSearchJob(
            jobId,
            {
              status: jobStatus,
              total_found: res.results.length,
              error_message: sanitizedError,
              completed_at: new Date().toISOString(),
            },
            true
          ).catch(() => {});

          const existingSummary = jobSummaries.find((j) => j.id === jobId);
          if (existingSummary) {
            existingSummary.status = jobStatus;
            existingSummary.totalFound = res.results.length;
            existingSummary.errorMessage = sanitizedError || undefined;
            existingSummary.completedAt = new Date().toISOString();
          }
        }

        return res;
      } catch (err: unknown) {
        const rawErrorMsg =
          err instanceof Error ? err.message : "Provider unexpected exception";
        const errorMsg = sanitizeErrorMessage(rawErrorMsg);

        if (jobId) {
          await updateSearchJob(
            jobId,
            {
              status: "failed",
              total_found: 0,
              error_message: errorMsg,
              completed_at: new Date().toISOString(),
            },
            true
          ).catch(() => {});

          const existingSummary = jobSummaries.find((j) => j.id === jobId);
          if (existingSummary) {
            existingSummary.status = "failed";
            existingSummary.errorMessage = errorMsg;
            existingSummary.completedAt = new Date().toISOString();
          }
        }

        return {
          provider: provider.name,
          providerName: provider.displayName,
          results: [],
          totalFound: 0,
          executionTimeMs: 0,
          quotaCost: 0,
          error: errorMsg,
        };
      }
    });

    const settledResults = await Promise.allSettled(providerPromises);

    // 7. Normalize responses and track provider execution
    const providerResponses: NormalizedSearchResponse[] = [];
    const activeProviders: string[] = [];
    const rawResultsToProcess: NormalizedSearchResult[] = [];
    let successfulProviderCount = 0;
    let failedProviderCount = 0;

    for (const settled of settledResults) {
      if (settled.status === "fulfilled") {
        const res = settled.value;
        providerResponses.push(res);

        if (res.error) {
          failedProviderCount++;
          notes.push(`[${res.providerName}] ${sanitizeErrorMessage(res.error)}`);
        } else {
          successfulProviderCount++;
          activeProviders.push(res.provider);
          rawResultsToProcess.push(...res.results);
        }
      } else {
        failedProviderCount++;
        notes.push(`Provider execution rejected: ${sanitizeErrorMessage(String(settled.reason))}`);
      }
    }

    // 8. Validate Facebook URLs & 9. Classify Content Conservatively
    const validatedResults: NormalizedSearchResult[] = [];
    for (const item of rawResultsToProcess) {
      if (isValidFacebookUrl(item.url)) {
        const conservativeType = classifyConservative(item.url, item.title, item.snippet);
        validatedResults.push({
          ...item,
          contentType: conservativeType,
        });
      } else {
        notes.push(`Excluded non-Facebook or malformed URL: ${item.url}`);
      }
    }

    // 10. Deduplicate URLs & Merge Provider Provenance
    let processedResults = deduplicateAndMergeProvenance(validatedResults);

    // 11. Enrich supported records through Meta when authorized
    if (this.meta.isConfigured()) {
      try {
        const enrichmentPromises = processedResults.map(async (res) => {
          if (res.canonicalPostId || res.contentType === "post") {
            const enriched = await this.meta.enrichPostDetails(res.url);
            if (enriched) {
              if (enriched.reactionsCount !== undefined) res.reactionsCount = enriched.reactionsCount;
              if (enriched.sharesCount !== undefined) res.sharesCount = enriched.sharesCount;
              if (enriched.commentCount !== undefined) res.commentCount = enriched.commentCount;
              if (enriched.fullText) res.fullText = enriched.fullText;
              res.dataAccessStatus = "verified";
            }
          }
          return res;
        });

        processedResults = await Promise.all(enrichmentPromises);
      } catch {
        // Enrichment error is non-fatal; continue
      }
    }

    // Demonstration fallback when no live keys are configured
    let isFallback = false;
    if (processedResults.length === 0 && candidateProviders.every((p) => !p.isConfigured())) {
      isFallback = true;
      notes.push(
        "No live API keys configured. Displaying verified demonstration data feed."
      );

      const queryTerm = options.query.toLowerCase();
      const mockMatches = mockPosts.filter((p) => {
        if (queryTerm === "all" || !queryTerm) return true;
        return (
          p.title.toLowerCase().includes(queryTerm) ||
          p.snippet.toLowerCase().includes(queryTerm) ||
          p.pageName.toLowerCase().includes(queryTerm)
        );
      });

      const fallbackList = mockMatches.length > 0 ? mockMatches : mockPosts.slice(0, 5);

      for (const p of fallbackList) {
        const conservativeType = classifyConservative(p.facebookUrl);
        processedResults.push({
          id: p.id,
          title: p.title,
          snippet: p.snippet,
          fullText: p.fullText,
          url: p.facebookUrl,
          originalUrl: p.facebookUrl,
          normalizedUrl: p.facebookUrl,
          canonicalPostId: p.id,
          pageName: p.pageName,
          pageAvatar: p.pageAvatar,
          pageVerified: p.pageVerified,
          publishedAt: p.publishedAt,
          contentType: conservativeType !== "unknown" ? conservativeType : "post",
          provider: "tavily",
          providers: ["tavily"],
          provenance: [
            {
              provider: "tavily",
              score: 0.95,
              originalUrl: p.facebookUrl,
              foundAt: p.publishedAt,
            },
          ],
          providerName: "Demonstration Feed (Mock Provider)",
          commentCount: p.commentCount,
          reactionsCount: p.reactionsCount,
          sharesCount: p.sharesCount,
          videoDuration: p.videoDuration,
          videoThumbnail: p.videoThumbnail,
          dataAccessStatus: "archived",
          raw: p.rawPayload,
        });
      }
    }

    // Filter by content type if user requested a specific content filter
    let finalResults = processedResults;
    if (options.targetType && options.targetType !== "all") {
      finalResults = finalResults.filter((r) => r.contentType === options.targetType);
    }

    // Sort by relevance score or publication date
    finalResults.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Limit results according to max results control
    if (options.limit && options.limit > 0) {
      finalResults = finalResults.slice(0, options.limit);
    }

    // 13. Determine overall search status
    // Rule: "If one provider succeeds and another fails, mark the search partial rather than failed."
    let searchStatus: SearchStatus = "completed";
    if (successfulProviderCount > 0 && failedProviderCount > 0) {
      searchStatus = "partial";
    } else if (successfulProviderCount === 0 && failedProviderCount > 0 && !isFallback) {
      searchStatus = "failed";
    } else {
      searchStatus = "completed";
    }

    const totalExecutionTime = Date.now() - startTime;

    // 12. Save permitted metadata to Supabase
    if (userId && searchRecordId) {
      try {
        await updateSearchStatus(
          searchRecordId,
          searchStatus,
          finalResults.length,
          totalExecutionTime,
          true
        );

        if (finalResults.length > 0) {
          // Batch upsert posts into facebook_posts
          const postInserts = finalResults.map((r) => ({
            id: r.id,
            page_id: r.pageUsername || null,
            page_name: r.pageName,
            page_avatar: r.pageAvatar || null,
            page_verified: r.pageVerified ?? false,
            page_followers: 0,
            title: r.title,
            snippet: r.snippet,
            full_text: r.fullText || null,
            facebook_url: r.url,
            provider: r.provider,
            provider_name: r.providerName,
            content_type: r.contentType,
            data_access_status: r.dataAccessStatus,
            comment_count: r.commentCount || 0,
            reactions_count: r.reactionsCount || 0,
            shares_count: r.sharesCount || 0,
            video_duration: r.videoDuration || null,
            video_thumbnail: r.videoThumbnail || null,
            media_urls: [],
            tags: [r.contentType, r.provider],
            raw_payload: (r.raw || {}) as any,
            published_at: r.publishedAt || new Date().toISOString(),
          }));

          await upsertPostsBatch(postInserts, true);

          // Batch insert search results linking
          const resultInserts = finalResults.map((r, idx) => ({
            search_id: searchRecordId!,
            user_id: userId,
            post_id: r.id,
            relevance_score: r.score ?? 1.0 - idx * 0.05,
          }));

          await createSearchResultsBatch(resultInserts, true);
        }
      } catch (err) {
        console.error("Non-blocking metadata persistence error:", err);
      }
    }

    // 14. Return results and provider summaries
    return {
      results: finalResults,
      totalFound: finalResults.length,
      searchId: searchRecordId,
      status: searchStatus,
      jobSummaries,
      activeProviders,
      providerResponses,
      executionTimeMs: totalExecutionTime,
      isFallback,
      notes,
    };
  }

  /**
   * Retries a specific failed provider job for an existing search query.
   */
  public async retrySearchJob(jobId: string): Promise<OrchestratedSearchOutput | null> {
    const job = await getSearchJobById(jobId, true);
    if (!job) return null;

    const providerMap = {
      tavily: this.tavily,
      brave: this.brave,
      meta_graph: this.meta,
    };

    const provider = providerMap[job.provider as ProviderName];
    if (!provider) return null;

    // Re-run single provider
    await updateSearchJob(jobId, { status: "processing" }, true);

    const startTime = Date.now();
    try {
      const res = await provider.search({
        query: "retry",
        limit: 10,
      });

      const jobStatus: JobStatus = res.error ? "failed" : "completed";
      await updateSearchJob(
        jobId,
        {
          status: jobStatus,
          total_found: res.results.length,
          error_message: res.error || null,
          completed_at: new Date().toISOString(),
        },
        true
      );

      return {
        results: res.results,
        totalFound: res.results.length,
        searchId: job.search_id || undefined,
        status: jobStatus,
        jobSummaries: [
          {
            id: jobId,
            searchId: job.search_id || undefined,
            provider: job.provider as ProviderName,
            status: jobStatus,
            totalFound: res.results.length,
            errorMessage: res.error,
            completedAt: new Date().toISOString(),
          },
        ],
        activeProviders: res.error ? [] : [provider.name],
        providerResponses: [res],
        executionTimeMs: Date.now() - startTime,
        isFallback: false,
        notes: res.error ? [`Retry error: ${res.error}`] : ["Retry completed successfully"],
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Retry failed";
      await updateSearchJob(
        jobId,
        {
          status: "failed",
          error_message: errorMsg,
          completed_at: new Date().toISOString(),
        },
        true
      );
      return null;
    }
  }
}

export const searchOrchestrator = new SearchOrchestrator();
