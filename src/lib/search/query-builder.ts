import { NormalizedContentType } from "@/lib/providers/types";

export interface TargetedFacebookQueries {
  general: string;
  posts: string;
  pages: string;
  videos: string;
}

/**
 * Builds specialized search queries for search engine providers (Tavily, Brave),
 * targeting distinct Facebook content surfaces via domain restrictions & URL patterns.
 */
export function buildTargetedFacebookQueries(
  rawKeyword: string,
  options?: { exactPhrase?: boolean }
): TargetedFacebookQueries {
  const cleanKeyword = rawKeyword.trim();
  const queryTerm = options?.exactPhrase ? `"${cleanKeyword}"` : cleanKeyword;

  return {
    // 1. General Facebook Content
    general: `site:facebook.com ${queryTerm}`,

    // 2. Facebook Posts (Timeline updates, permalinks, photo posts)
    posts: `site:facebook.com (inurl:posts OR inurl:photos OR inurl:permalink.php OR inurl:story.php) ${queryTerm}`,

    // 3. Facebook Pages (Organizations, brands, public figures)
    pages: `site:facebook.com (inurl:pages OR inurl:/p/) ${queryTerm} -inurl:posts -inurl:videos -inurl:reel`,

    // 4. Facebook Videos & Reels
    videos: `site:facebook.com (inurl:videos OR inurl:watch OR inurl:reel) ${queryTerm}`,
  };
}

/**
 * Accurately classifies a Facebook URL into its content type.
 * Ensures results are not blindly assumed to be posts.
 */
export function classifyFacebookUrl(rawUrl: string): NormalizedContentType {
  if (!rawUrl) return "general";

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return "general";
  }

  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();

  // Non-facebook URLs
  if (!hostname.includes("facebook.com") && !hostname.includes("fb.watch")) {
    return "general";
  }

  // Videos and Reels
  if (
    hostname.includes("fb.watch") ||
    pathname.includes("/watch") ||
    pathname.includes("/videos/") ||
    pathname.includes("/reel/") ||
    pathname.includes("/reels/")
  ) {
    return pathname.includes("/reel") ? "reel" : "video";
  }

  // Posts and Updates
  if (
    pathname.includes("/posts/") ||
    pathname.includes("/photos/") ||
    pathname.includes("/permalink.php") ||
    pathname.includes("/story.php") ||
    pathname.includes("/groups/") ||
    url.searchParams.has("story_fbid")
  ) {
    return "post";
  }

  // Pages
  if (
    pathname.includes("/pages/") ||
    pathname.startsWith("/p/") ||
    pathname.includes("/about") ||
    (pathname.split("/").filter(Boolean).length === 1 && !pathname.includes(".php"))
  ) {
    return "page";
  }

  // Comments edge or discussion anchors
  if (pathname.includes("/comment/") || url.searchParams.has("comment_id")) {
    return "comment";
  }

  return "general";
}

/**
 * Extracts page name and username handle from a Facebook URL and search title.
 */
export function extractPageInfoFromUrl(
  rawUrl: string,
  rawTitle?: string
): { pageName: string; pageUsername?: string } {
  let pageName = "Facebook Public Page";
  let pageUsername: string | undefined = undefined;

  // 1. Try extracting page name from title (e.g. "NASA - Home | Facebook" or "TechCrunch | Facebook")
  if (rawTitle) {
    const cleaned = rawTitle
      .replace(/\s*[-|•]\s*Facebook.*$/i, "")
      .replace(/\s*[-|•]\s*Videos.*$/i, "")
      .replace(/\s*[-|•]\s*Home.*$/i, "")
      .replace(/\s*[-|•]\s*Posts.*$/i, "")
      .trim();

    if (cleaned.length > 0 && cleaned.length < 80) {
      pageName = cleaned;
    }
  }

  // 2. Try parsing username slug from URL path
  try {
    const url = new URL(rawUrl);
    const segments = url.pathname.split("/").filter(Boolean);

    if (segments.length > 0) {
      const first = segments[0].toLowerCase();
      // Ignore generic Facebook paths
      const reserved = [
        "pages",
        "watch",
        "videos",
        "groups",
        "events",
        "profile.php",
        "permalink.php",
        "story.php",
        "reel",
        "reels",
      ];
      if (!reserved.includes(first)) {
        pageUsername = `@${segments[0]}`;
        if (pageName === "Facebook Public Page") {
          pageName = segments[0]
            .replace(/[._-]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
        }
      }
    }
  } catch {
    // Ignore URL parse error
  }

  return { pageName, pageUsername };
}
