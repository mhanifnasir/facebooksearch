import crypto from "crypto";
import {
  SearchProvider,
  ProviderSearchOptions,
  NormalizedSearchResponse,
  NormalizedSearchResult,
  MetaCommentItem,
  MetaCommentsResponse,
} from "./types";
import { normalizeFacebookUrl } from "@/lib/search/url-processor";
import { sanitizeErrorMessage } from "@/lib/security";

export interface MetaPagePost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
  shares?: { count: number };
  reactions?: { summary: { total_count: number } };
  comments?: { summary: { total_count: number } };
}

export interface MetaComment {
  id: string;
  message: string;
  created_time: string;
  from?: { name: string; id: string };
  like_count?: number;
}

export class MetaGraphProvider implements SearchProvider {
  public readonly name = "meta_graph" as const;
  public readonly displayName = "Meta Graph API v21.0";

  private get accessToken(): string | undefined {
    return process.env.META_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN;
  }

  private get appSecret(): string | undefined {
    return process.env.META_APP_SECRET;
  }

  private get apiVersion(): string {
    return process.env.META_GRAPH_API_VERSION || "v21.0";
  }

  /**
   * Generates appsecret_proof HMAC-SHA256 for enhanced server-side API security.
   */
  private getAppSecretProof(): string | undefined {
    if (!this.accessToken || !this.appSecret) return undefined;
    try {
      return crypto
        .createHmac("sha256", this.appSecret)
        .update(this.accessToken)
        .digest("hex");
    } catch {
      return undefined;
    }
  }

  /**
   * Connector remains disabled unless valid credentials and permissions exist.
   */
  public isConfigured(): boolean {
    return Boolean(this.accessToken && this.accessToken.trim().length > 10);
  }

  /**
   * Validates server-configured Meta access token with the Graph API.
   * Checks for token expiration, revocation, and scope permissions.
   */
  public async validateToken(): Promise<{
    valid: boolean;
    status: "operational" | "token_expired" | "not_configured" | "degraded";
    error?: string;
    details?: Record<string, unknown>;
  }> {
    if (!this.isConfigured()) {
      return {
        valid: false,
        status: "not_configured",
        error: "Meta access token is not configured (META_PAGE_ACCESS_TOKEN).",
      };
    }

    const proof = this.getAppSecretProof();
    const proofParam = proof ? `&appsecret_proof=${proof}` : "";
    const endpoint = `https://graph.facebook.com/${this.apiVersion}/me?fields=id,name&access_token=${this.accessToken}${proofParam}`;

    try {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorData = data.error || {};
        const code = errorData.code;

        if (code === 190) {
          return {
            valid: false,
            status: "token_expired",
            error: "Meta access token has expired or was revoked (Code 190).",
          };
        }

        return {
          valid: false,
          status: "degraded",
          error: sanitizeErrorMessage(
            errorData.message || `Meta verification error (${response.status})`
          ),
        };
      }

      return {
        valid: true,
        status: "operational",
        details: { id: data.id, name: data.name },
      };
    } catch (err: unknown) {
      return {
        valid: false,
        status: "degraded",
        error: sanitizeErrorMessage(
          err instanceof Error ? err.message : "Meta connection check timeout"
        ),
      };
    }
  }

  /**
   * Searches permitted/authorized Page posts matching keywords,
   * or fetches permitted post feeds from verified Facebook Pages.
   *
   * COMPLIANCE NOTE:
   * As per Meta Developer Policies, the Graph API does not support unrestricted
   * global keyword web scraping of private user profiles. It provides authorized
   * Page post retrieval, metrics, and official comment edge inspection.
   */
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
        error:
          "Meta Graph API connector is disabled. Requires META_PAGE_ACCESS_TOKEN with Page public content permissions.",
      };
    }

    const proof = this.getAppSecretProof();
    const proofParam = proof ? `&appsecret_proof=${proof}` : "";

    const endpoint = `https://graph.facebook.com/${this.apiVersion}/me/posts?fields=id,message,created_time,permalink_url,shares,reactions.summary(true),comments.summary(true)&limit=${
      options.limit || 10
    }&access_token=${this.accessToken}${proofParam}`;

    try {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(options.timeoutMs || 8000),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorData = data.error || {};
        let errMessage = errorData.message || `Meta Graph API error (${response.status})`;

        if (errorData.code === 190) {
          errMessage =
            "Meta access token has expired or is invalid (Code 190). Please re-authenticate.";
        } else if (errorData.code === 200 || errorData.code === 10) {
          errMessage =
            "Insufficient Meta permissions for public page access. Please verify app permissions.";
        }

        return {
          provider: this.name,
          providerName: this.displayName,
          results: [],
          totalFound: 0,
          executionTimeMs: Date.now() - startTime,
          quotaCost: 1,
          error: sanitizeErrorMessage(errMessage),
        };
      }

      const posts: MetaPagePost[] = data.data || [];

      // Filter posts matching query keyword if query is provided
      const queryLower = options.query.toLowerCase().trim();
      const filteredPosts =
        queryLower === "all" || !queryLower
          ? posts
          : posts.filter((p) => p.message?.toLowerCase().includes(queryLower));

      const normalizedResults: NormalizedSearchResult[] = filteredPosts.map(
        (post) => {
          const snippet = post.message || "Facebook Page Publication";
          const firstLine = snippet.split("\n")[0] || snippet;
          const title =
            firstLine.length > 70
              ? `${firstLine.substring(0, 67)}...`
              : firstLine;

          const rawUrl =
            post.permalink_url ||
            `https://www.facebook.com/${post.id.replace("_", "/posts/")}`;
          const { normalizedUrl, originalUrl } = normalizeFacebookUrl(rawUrl);

          return {
            id: `meta-${post.id}`,
            title,
            snippet,
            fullText: post.message,
            url: normalizedUrl,
            originalUrl,
            normalizedUrl,
            canonicalPostId: post.id,
            pageName: "Authorized Business Page",
            pageAvatar:
              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
            pageVerified: true,
            publishedAt: post.created_time,
            contentType: "post",
            provider: this.name,
            providers: [this.name],
            provenance: [
              {
                provider: this.name,
                score: 1.0,
                originalUrl,
                foundAt: post.created_time,
              },
            ],
            providerName: this.displayName,
            commentCount: post.comments?.summary?.total_count || 0,
            reactionsCount: post.reactions?.summary?.total_count || 0,
            sharesCount: post.shares?.count || 0,
            dataAccessStatus: "verified",
            raw: post as unknown as Record<string, unknown>,
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
        err instanceof Error ? err.message : "Meta Graph API request timeout";
      return {
        provider: this.name,
        providerName: this.displayName,
        results: [],
        totalFound: 0,
        executionTimeMs: Date.now() - startTime,
        quotaCost: 0,
        error: message,
      };
    }
  }

  /**
   * Enriches supported post records through Meta when authorized.
   * Extracts official reaction counts, shares, and verified comment totals.
   */
  public async enrichPostDetails(
    postIdOrUrl: string
  ): Promise<Partial<NormalizedSearchResult> | null> {
    if (!this.isConfigured()) return null;

    let targetId = postIdOrUrl.replace("meta-", "").trim();

    // If a full Facebook URL was provided, attempt extracting ID
    if (targetId.includes("facebook.com")) {
      const { canonicalId } = normalizeFacebookUrl(targetId);
      if (canonicalId) targetId = canonicalId;
    }

    if (!targetId || targetId.length < 3) return null;

    const proof = this.getAppSecretProof();
    const proofParam = proof ? `&appsecret_proof=${proof}` : "";
    const endpoint = `https://graph.facebook.com/${this.apiVersion}/${targetId}?fields=id,message,created_time,shares,reactions.summary(true),comments.summary(true)&access_token=${this.accessToken}${proofParam}`;

    try {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return null;

      const data: MetaPagePost = await response.json();
      return {
        commentCount: data.comments?.summary?.total_count,
        reactionsCount: data.reactions?.summary?.total_count,
        sharesCount: data.shares?.count,
        fullText: data.message,
        dataAccessStatus: "verified",
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetches public comments for a specific Facebook Post via the official Graph edge.
   * Implements cursor-based pagination and enforces that search snippets are NEVER
   * mistaken for actual comments.
   */
  public async fetchPostComments(
    postId: string,
    options?: { limit?: number; after?: string }
  ): Promise<MetaCommentsResponse> {
    if (!this.isConfigured()) {
      return {
        comments: [],
        hasMore: false,
        error:
          "Meta Graph API connector is not configured. Valid page access token required.",
      };
    }

    const cleanPostId = postId.replace("meta-", "").trim();
    const limit = Math.min(options?.limit || 25, 100);
    const afterParam = options?.after ? `&after=${encodeURIComponent(options.after)}` : "";
    const proof = this.getAppSecretProof();
    const proofParam = proof ? `&appsecret_proof=${proof}` : "";

    const url = `https://graph.facebook.com/${this.apiVersion}/${cleanPostId}/comments?fields=id,message,created_time,from,like_count&limit=${limit}${afterParam}&access_token=${this.accessToken}${proofParam}&summary=true`;

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(7000),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorData = data.error || {};
        const code = errorData.code;
        const isTokenExpired = code === 190;
        const isRestricted = code === 200 || code === 10 || code === 100;

        let errorMsg = errorData.message || `Meta Graph API error (${response.status})`;
        if (isTokenExpired) {
          errorMsg = "Meta access token has expired (Code 190).";
        } else if (isRestricted) {
          errorMsg = "Comments on this post are restricted or require permission.";
        }

        return {
          comments: [],
          hasMore: false,
          error: sanitizeErrorMessage(errorMsg),
          isTokenExpired,
          isRestricted,
        };
      }

      const rawComments: MetaComment[] = data.data || [];
      const totalCount = data.summary?.total_count;
      const nextCursor = data.paging?.cursors?.after;
      const hasMore = Boolean(data.paging?.next && nextCursor);

      // Map to normalized MetaCommentItem (verifies these are authentic Graph comments, not search snippets)
      const comments: MetaCommentItem[] = rawComments
        .filter((c) => c && c.message && c.message.trim().length > 0)
        .map((c) => ({
          id: c.id,
          postId: cleanPostId,
          text: c.message,
          authorName: c.from?.name || "Facebook Contributor",
          authorId: c.from?.id,
          authorAvatar: `https://images.unsplash.com/photo-${1535713875002 + (c.id.charCodeAt(0) % 500)}?w=80&auto=format&fit=crop&q=80`,
          publishedAt: c.created_time,
          likesCount: c.like_count || 0,
        }));

      return {
        comments,
        totalCount: totalCount ?? comments.length,
        hasMore,
        nextCursor,
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Meta comments fetch timeout";
      return {
        comments: [],
        hasMore: false,
        error: sanitizeErrorMessage(message),
      };
    }
  }

  /**
   * Backward-compatible simple comments list getter.
   */
  public async getPostComments(postId: string, limit = 25): Promise<MetaComment[]> {
    const res = await this.fetchPostComments(postId, { limit });
    return res.comments.map((c) => ({
      id: c.id,
      message: c.text,
      created_time: c.publishedAt,
      from: { name: c.authorName, id: c.authorId || "anon" },
      like_count: c.likesCount,
    }));
  }
}
