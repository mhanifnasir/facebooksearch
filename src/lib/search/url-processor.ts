import {
  NormalizedContentType,
  NormalizedSearchResult,
  ProviderName,
  ProviderProvenance,
} from "@/lib/providers/types";

/**
 * List of tracking and analytics query parameters stripped during normalization.
 */
const TRACKING_PARAMS = new Set([
  "fbclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "fref",
  "__tn__",
  "__cft__",
  "extid",
  "paipv",
  "epa",
  "notif_id",
  "notif_t",
  "eid",
  "hc_ref",
  "hc_location",
  "checkpoint_src",
  "refid",
  "rc",
]);

/**
 * Validates whether a given URL is a legitimate Facebook resource.
 * Rejects non-HTTP(S) schemes, malformed URLs, and non-Facebook domains.
 */
export function isValidFacebookUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;

  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:")) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const host = parsed.hostname.toLowerCase();
    return (
      host === "facebook.com" ||
      host.endsWith(".facebook.com") ||
      host === "fb.watch" ||
      host.endsWith(".fb.watch") ||
      host === "fb.me" ||
      host.endsWith(".fb.me")
    );
  } catch {
    return false;
  }
}

/**
 * Normalizes a Facebook URL by stripping tracking parameters, normalizing protocol
 * to HTTPS, canonicalizing hostnames (m.facebook.com -> www.facebook.com),
 * and stripping trailing slashes.
 */
export function normalizeFacebookUrl(rawUrl: string): {
  normalizedUrl: string;
  originalUrl: string;
  canonicalId?: string;
} {
  const originalUrl = rawUrl.trim();

  if (!isValidFacebookUrl(originalUrl)) {
    return { normalizedUrl: originalUrl, originalUrl };
  }

  try {
    const parsed = new URL(originalUrl);

    // Force https
    parsed.protocol = "https:";

    // Canonicalize host
    const host = parsed.hostname.toLowerCase();
    if (host.includes("facebook.com")) {
      parsed.hostname = "www.facebook.com";
    }

    // Strip tracking parameters
    const paramsToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      const lowerKey = key.toLowerCase();
      if (
        TRACKING_PARAMS.has(lowerKey) ||
        lowerKey.startsWith("utm_") ||
        lowerKey.startsWith("__")
      ) {
        paramsToDelete.push(key);
      }
    });

    for (const key of paramsToDelete) {
      parsed.searchParams.delete(key);
    }

    // Sort remaining query params for canonical consistency
    parsed.searchParams.sort();

    // Normalize path by stripping trailing slashes (except root "/")
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;

    // Remove hash/fragment
    parsed.hash = "";

    // Extract canonical ID if available
    let canonicalId: string | undefined;
    const postMatch = pathname.match(/\/posts\/([a-zA-Z0-9_\-]+)/);
    if (postMatch) canonicalId = postMatch[1];

    const permalinkId = parsed.searchParams.get("story_fbid") || parsed.searchParams.get("id");
    if (permalinkId) canonicalId = permalinkId;

    const videoMatch = pathname.match(/\/(?:videos|watch)\/([a-zA-Z0-9_\-]+)/);
    if (videoMatch) canonicalId = videoMatch[1];

    const finalUrl = parsed.toString();
    return {
      normalizedUrl: finalUrl,
      originalUrl,
      canonicalId,
    };
  } catch {
    return { normalizedUrl: originalUrl, originalUrl };
  }
}

/**
 * Conservative Content Classifier.
 * Classifies Facebook content into: "post" | "page" | "video" | "unknown".
 *
 * CRITICAL RULE:
 * Classification must be conservative. Never label an unknown URL as a confirmed post.
 */
export function classifyConservative(
  rawUrl: string,
  title?: string,
  snippet?: string
): "post" | "page" | "video" | "unknown" {
  if (!isValidFacebookUrl(rawUrl)) {
    return "unknown";
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return "unknown";
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();

  // 1. Confirmed Video Content (fb.watch, /watch, /videos/, /reel/, /reels/)
  if (
    hostname.includes("fb.watch") ||
    pathname.includes("/watch") ||
    pathname.includes("/videos/") ||
    pathname.includes("/reel/") ||
    pathname.includes("/reels/")
  ) {
    return "video";
  }

  // 2. Confirmed Post Content (explicit /posts/, /photos/, permalink.php, story.php, or story_fbid)
  if (
    pathname.includes("/posts/") ||
    pathname.includes("/photos/") ||
    pathname.includes("/permalink.php") ||
    pathname.includes("/story.php") ||
    parsed.searchParams.has("story_fbid")
  ) {
    return "post";
  }

  // 3. Confirmed Page Content (/pages/, /p/, /about/, /biz/)
  if (
    pathname.includes("/pages/") ||
    pathname.startsWith("/p/") ||
    pathname.includes("/about") ||
    pathname.includes("/biz/")
  ) {
    return "page";
  }

  // Root single slug (e.g. facebook.com/NASA or facebook.com/Microsoft):
  // Check if title or snippet confirms it is a Page
  const pathParts = pathname.split("/").filter(Boolean);
  if (pathParts.length === 1 && !pathname.includes(".php")) {
    const slug = pathParts[0];
    const reservedWords = new Set([
      "home",
      "login",
      "recover",
      "help",
      "privacy",
      "terms",
      "messages",
      "notifications",
      "settings",
      "marketplace",
      "groups",
      "gaming",
      "watch",
      "reels",
      "events",
      "hashtag",
    ]);

    if (!reservedWords.has(slug)) {
      const lowerTitle = (title || "").toLowerCase();
      const lowerSnippet = (snippet || "").toLowerCase();
      if (
        lowerTitle.includes("page") ||
        lowerTitle.includes("official") ||
        lowerSnippet.includes("page") ||
        lowerSnippet.includes("followers") ||
        lowerSnippet.includes("likes")
      ) {
        return "page";
      }
    }
  }

  // 4. Fallback: If not definitively confirmed, strictly label as "unknown"
  return "unknown";
}

/**
 * Deduplicates search results by normalized Facebook URL, merges provider provenance,
 * preserves original source URLs, and avoids deleting different posts with similar titles.
 */
export function deduplicateAndMergeProvenance(
  results: NormalizedSearchResult[]
): NormalizedSearchResult[] {
  const urlMap = new Map<string, NormalizedSearchResult>();

  for (const item of results) {
    const { normalizedUrl, originalUrl, canonicalId } = normalizeFacebookUrl(item.url);

    // Classification should be conservative
    const conservativeType = classifyConservative(normalizedUrl, item.title, item.snippet);

    const existing = urlMap.get(normalizedUrl);

    if (!existing) {
      // First time encountering this URL
      const initialProvenance: ProviderProvenance[] = [
        {
          provider: item.provider,
          score: item.score,
          originalUrl: originalUrl,
          foundAt: item.publishedAt || new Date().toISOString(),
        },
      ];

      urlMap.set(normalizedUrl, {
        ...item,
        url: normalizedUrl,
        originalUrl: originalUrl,
        normalizedUrl: normalizedUrl,
        canonicalPostId: canonicalId || item.id,
        contentType: conservativeType,
        providers: [item.provider],
        provenance: initialProvenance,
      });
    } else {
      // Duplicate URL from another provider (or same provider): merge provenance
      const existingProviders = new Set(existing.providers || [existing.provider]);
      existingProviders.add(item.provider);
      existing.providers = Array.from(existingProviders);

      const provenanceList = existing.provenance || [
        {
          provider: existing.provider,
          score: existing.score,
          originalUrl: existing.originalUrl || existing.url,
        },
      ];

      provenanceList.push({
        provider: item.provider,
        score: item.score,
        originalUrl: originalUrl,
        foundAt: item.publishedAt || new Date().toISOString(),
      });
      existing.provenance = provenanceList;

      // Merge metadata: keep highest score
      if (item.score !== undefined && (existing.score === undefined || item.score > existing.score)) {
        existing.score = item.score;
      }

      // Keep longer or richer snippet / full text
      if (item.fullText && (!existing.fullText || item.fullText.length > existing.fullText.length)) {
        existing.fullText = item.fullText;
      }
      if (item.snippet && item.snippet.length > existing.snippet.length) {
        existing.snippet = item.snippet;
      }

      // Keep verified avatar or page info if existing is missing it
      if (!existing.pageAvatar && item.pageAvatar) {
        existing.pageAvatar = item.pageAvatar;
      }
      if (!existing.pageVerified && item.pageVerified) {
        existing.pageVerified = true;
      }

      // Merge engagement counts if available
      if ((item.commentCount || 0) > (existing.commentCount || 0)) {
        existing.commentCount = item.commentCount;
      }
      if ((item.reactionsCount || 0) > (existing.reactionsCount || 0)) {
        existing.reactionsCount = item.reactionsCount;
      }
      if ((item.sharesCount || 0) > (existing.sharesCount || 0)) {
        existing.sharesCount = item.sharesCount;
      }
    }
  }

  return Array.from(urlMap.values());
}
