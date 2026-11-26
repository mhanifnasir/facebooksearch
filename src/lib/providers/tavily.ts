import {
  SearchProvider,
  ProviderSearchOptions,
  NormalizedSearchResponse,
  NormalizedSearchResult,
} from "./types";
import {
  classifyFacebookUrl,
  extractPageInfoFromUrl,
  buildTargetedFacebookQueries,
} from "@/lib/search/query-builder";
import { calculateTavilyCredits } from "./guardrails";
import { sanitizeErrorMessage } from "@/lib/security";

export class TavilyProvider implements SearchProvider {
  public readonly name = "tavily" as const;
  public readonly displayName = "Tavily Search API";

  private get apiKey(): string | undefined {
    return process.env.TAVILY_API_KEY;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public async search(
    options: ProviderSearchOptions
  ): Promise<NormalizedSearchResponse> {
    const startTime = Date.now();
    const quotaCost = calculateTavilyCredits({
      searchDepth: options.searchDepth,
      includeRawContent: options.includeRawContent,
    });

    if (!this.isConfigured()) {
      return {
        provider: this.name,
        providerName: this.displayName,
        results: [],
        totalFound: 0,
        executionTimeMs: Date.now() - startTime,
        quotaCost: 0,
        error: "Tavily API key is not configured (TAVILY_API_KEY).",
      };
    }

    // Select query pattern based on targetType
    const queries = buildTargetedFacebookQueries(options.query, {
      exactPhrase: options.exactPhrase,
    });

    let targetQuery = queries.general;
    if (options.targetType === "post") {
      targetQuery = queries.posts;
    } else if (options.targetType === "page") {
      targetQuery = queries.pages;
    } else if (options.targetType === "video") {
      targetQuery = queries.videos;
    }

    const maxResults = options.limit || 10;
    const timeoutMs = options.timeoutMs || 8000;
    const searchDepth = options.searchDepth || "basic";
    const includeRawContent = options.includeRawContent || false;

    // Retry configuration
    const maxRetries = 2;
    let lastError: string | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: this.apiKey,
            query: targetQuery,
            search_depth: searchDepth,
            include_domains: ["facebook.com"],
            max_results: maxResults,
            include_answer: false,
            include_raw_content: includeRawContent,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (response.status === 429) {
          lastError = "Tavily rate limit / quota exceeded (429). Free-tier protection active.";
          if (attempt < maxRetries) {
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * Math.pow(2, attempt))
            );
            continue;
          }
          break;
        }

        if (!response.ok) {
          const errText = await response.text();
          lastError = sanitizeErrorMessage(`Tavily API error (${response.status}): ${errText}`);
          if (attempt < maxRetries && response.status >= 500) {
            await new Promise((resolve) =>
              setTimeout(resolve, 800 * Math.pow(2, attempt))
            );
            continue;
          }
          break;
        }

        const data = await response.json();
        const rawResults: Array<{
          title?: string;
          url: string;
          content?: string;
          score?: number;
          published_date?: string;
        }> = data.results || [];

        // Normalize data
        const normalizedResults: NormalizedSearchResult[] = rawResults.map(
          (item, idx) => {
            const url = item.url;
            const title = item.title || "Facebook Public Content";
            const snippet = item.content || "";
            const contentType = classifyFacebookUrl(url);
            const { pageName, pageUsername } = extractPageInfoFromUrl(
              url,
              title
            );

            return {
              id: `tavily-${idx}-${Math.abs(hashString(url))}`,
              title,
              snippet,
              url,
              pageName,
              pageUsername,
              pageAvatar:
                "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
              pageVerified: false,
              publishedAt:
                item.published_date || new Date().toISOString(),
              contentType,
              provider: this.name,
              providerName: this.displayName,
              score: item.score,
              commentCount: 0,
              reactionsCount: 0,
              sharesCount: 0,
              dataAccessStatus: "public",
              raw: item,
            };
          }
        );

        return {
          provider: this.name,
          providerName: this.displayName,
          results: normalizedResults,
          totalFound: normalizedResults.length,
          executionTimeMs: Date.now() - startTime,
          quotaCost,
        };
      } catch (err: unknown) {
        lastError = sanitizeErrorMessage(
          err instanceof Error ? err.message : "Network/timeout error"
        );
        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, 500 * (attempt + 1))
          );
        }
      }
    }

    return {
      provider: this.name,
      providerName: this.displayName,
      results: [],
      totalFound: 0,
      executionTimeMs: Date.now() - startTime,
      quotaCost: 0,
      error: lastError || "Failed to complete Tavily search request.",
    };
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
