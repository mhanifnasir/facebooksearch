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
import { sanitizeErrorMessage } from "@/lib/security";

export class BraveProvider implements SearchProvider {
  public readonly name = "brave" as const;
  public readonly displayName = "Brave Search API";

  private get apiKey(): string | undefined {
    return process.env.BRAVE_API_KEY || process.env.BRAVE_SEARCH_API_KEY;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public async search(
    options: ProviderSearchOptions
  ): Promise<NormalizedSearchResponse> {
    const startTime = Date.now();

    if (!this.isConfigured()) {
      return {
        provider: this.name,
        providerName: this.displayName,
        results: [],
        totalFound: 0,
        executionTimeMs: Date.now() - startTime,
        quotaCost: 0,
        error: "Brave Search API key is not configured (BRAVE_SEARCH_API_KEY).",
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

    const maxResults = Math.min(options.limit || 10, 20);
    const timeoutMs = options.timeoutMs || 8000;

    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", targetQuery);
    url.searchParams.set("count", maxResults.toString());
    url.searchParams.set("safesearch", "moderate");

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": this.apiKey!,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.status === 429) {
        return {
          provider: this.name,
          providerName: this.displayName,
          results: [],
          totalFound: 0,
          executionTimeMs: Date.now() - startTime,
          quotaCost: 0,
          error:
            "Brave Search monthly rate limit / quota exhausted (429). Paid automatic top-ups are disabled.",
        };
      }

      if (!response.ok) {
        const errText = await response.text();
        return {
          provider: this.name,
          providerName: this.displayName,
          results: [],
          totalFound: 0,
          executionTimeMs: Date.now() - startTime,
          quotaCost: 0,
          error: sanitizeErrorMessage(
            `Brave Search API error (${response.status}): ${errText}`
          ),
        };
      }

      const data = await response.json();
      const rawResults: Array<{
        title?: string;
        url: string;
        description?: string;
        page_age?: string;
      }> = data?.web?.results || [];

      const normalizedResults: NormalizedSearchResult[] = rawResults.map(
        (item, idx) => {
          const itemUrl = item.url;
          const title = item.title || "Facebook Public Result";
          const snippet = item.description || "";
          const contentType = classifyFacebookUrl(itemUrl);
          const { pageName, pageUsername } = extractPageInfoFromUrl(
            itemUrl,
            title
          );

          return {
            id: `brave-${idx}-${Math.abs(hashString(itemUrl))}`,
            title,
            snippet,
            url: itemUrl,
            pageName,
            pageUsername,
            pageAvatar:
              "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=100&auto=format&fit=crop&q=80",
            pageVerified: false,
            publishedAt: item.page_age || new Date().toISOString(),
            contentType,
            provider: this.name,
            providerName: this.displayName,
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
        quotaCost: 1,
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Brave request timeout or network failure";
      return {
        provider: this.name,
        providerName: this.displayName,
        results: [],
        totalFound: 0,
        executionTimeMs: Date.now() - startTime,
        quotaCost: 0,
        error: sanitizeErrorMessage(message),
      };
    }
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
