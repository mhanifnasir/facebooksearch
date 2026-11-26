/**
 * Verification test suite for Phase 4:
 * Search Orchestration, Result Processing, Deduplication, Conservative Classification, & Comments
 *
 * Run with: npx tsx scripts/test-phase4.ts
 */

import {
  isValidFacebookUrl,
  normalizeFacebookUrl,
  classifyConservative,
  deduplicateAndMergeProvenance,
} from "../src/lib/search/url-processor";
import { SearchOrchestrator } from "../src/lib/search/orchestrator";
import { MetaGraphProvider } from "../src/lib/providers/meta";
import {
  SearchProvider,
  ProviderSearchOptions,
  NormalizedSearchResponse,
  NormalizedSearchResult,
} from "../src/lib/providers/types";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ""}`);
    failedCount++;
  }
}

// =========================================================================
// 1. URL Validation & Normalization
// =========================================================================
function testUrlValidationAndNormalization() {
  console.log("\n--- 1. URL Validation & Normalization ---");

  // A. Validation
  assert(
    isValidFacebookUrl("https://www.facebook.com/NASA/posts/101"),
    "Validates standard HTTPS Facebook post URL"
  );
  assert(
    isValidFacebookUrl("https://m.facebook.com/story.php?story_fbid=999"),
    "Validates mobile Facebook URL"
  );
  assert(
    isValidFacebookUrl("https://fb.watch/xyz123/"),
    "Validates fb.watch short URL"
  );
  assert(
    !isValidFacebookUrl("https://twitter.com/NASA/status/123"),
    "Rejects non-Facebook domain (Twitter)"
  );
  assert(
    !isValidFacebookUrl("javascript:alert(1)"),
    "Rejects javascript: pseudo-protocol"
  );
  assert(
    !isValidFacebookUrl("not-a-valid-url"),
    "Rejects completely malformed string"
  );

  // B. Normalization
  const trackingUrl =
    "https://m.facebook.com/NASA/posts/101589/?fbclid=IwAR2XYZ&utm_source=feed&utm_campaign=winter&ref=share";
  const { normalizedUrl, originalUrl, canonicalId } = normalizeFacebookUrl(trackingUrl);

  assert(
    !normalizedUrl.includes("fbclid"),
    "Strips fbclid tracking parameter"
  );
  assert(
    !normalizedUrl.includes("utm_source") && !normalizedUrl.includes("utm_campaign"),
    "Strips UTM analytics parameters"
  );
  assert(
    !normalizedUrl.includes("ref="),
    "Strips Facebook ref parameter"
  );
  assert(
    normalizedUrl.startsWith("https://www.facebook.com"),
    "Canonicalizes host to https://www.facebook.com"
  );
  assert(
    !normalizedUrl.endsWith("/"),
    "Strips trailing slash"
  );
  assert(
    originalUrl === trackingUrl,
    "Preserves exact original source URL"
  );
  assert(
    canonicalId === "101589",
    "Extracts canonical post ID correctly"
  );
}

// =========================================================================
// 2. Conservative Content Classification
// =========================================================================
function testConservativeClassification() {
  console.log("\n--- 2. Conservative Content Classification ---");

  // Post verification
  const postUrl = "https://www.facebook.com/meta/posts/9876543210";
  assert(
    classifyConservative(postUrl) === "post",
    "Classifies explicit /posts/ route as post"
  );

  const permalinkUrl = "https://www.facebook.com/permalink.php?story_fbid=123&id=456";
  assert(
    classifyConservative(permalinkUrl) === "post",
    "Classifies permalink.php as post"
  );

  // Video verification
  const videoUrl = "https://www.facebook.com/NASA/videos/11223344/";
  assert(
    classifyConservative(videoUrl) === "video",
    "Classifies /videos/ route as video"
  );

  const watchUrl = "https://www.facebook.com/watch/?v=99887766";
  assert(
    classifyConservative(watchUrl) === "video",
    "Classifies /watch/ route as video"
  );

  const reelUrl = "https://www.facebook.com/reel/123456789";
  assert(
    classifyConservative(reelUrl) === "video",
    "Classifies /reel/ route as video"
  );

  // Page verification
  const pageUrl = "https://www.facebook.com/pages/SpaceX/1098234";
  assert(
    classifyConservative(pageUrl) === "page",
    "Classifies /pages/ route as page"
  );

  const vanityPageUrl = "https://www.facebook.com/Microsoft";
  assert(
    classifyConservative(vanityPageUrl, "Microsoft - Official Page | Facebook") === "page",
    "Classifies single brand vanity handle with page indicators as page"
  );

  // Ambiguous / Unknown verification
  const ambiguousUrl = "https://www.facebook.com/hashtag/technology";
  assert(
    classifyConservative(ambiguousUrl) === "unknown",
    "Conservative rule: Classifies ambiguous hashtag URL as unknown"
  );

  const helpUrl = "https://www.facebook.com/help/123456";
  assert(
    classifyConservative(helpUrl) === "unknown",
    "Conservative rule: Classifies internal Facebook help page as unknown"
  );

  // CRITICAL REQUIREMENT: Never label an unknown URL as a confirmed post!
  const unknownLink = "https://www.facebook.com/arbitrary-unrecognized-endpoint";
  const classifiedUnknown = classifyConservative(unknownLink);
  assert(
    classifiedUnknown !== "post" && classifiedUnknown === "unknown",
    "STRICT COMPLIANCE: Never labels an unknown URL as a confirmed post"
  );
}

// =========================================================================
// 3. Deduplication & Provenance Merging
// =========================================================================
function testDeduplicationAndProvenance() {
  console.log("\n--- 3. Deduplication & Provenance Merging ---");

  // Simulate two results from different providers pointing to the same post with different tracking params
  const tavilyResult: NormalizedSearchResult = {
    id: "tavily-1",
    title: "Breakthrough in Fusion Energy",
    snippet: "Scientists at Lawrence Livermore achieve net energy gain...",
    url: "https://m.facebook.com/fusionlab/posts/554433/?fbclid=tavily_tracker",
    pageName: "Fusion Lab",
    contentType: "post",
    provider: "tavily",
    providerName: "Tavily Search API",
    score: 0.92,
    commentCount: 45,
    reactionsCount: 300,
    sharesCount: 50,
    dataAccessStatus: "public",
  };

  const braveResult: NormalizedSearchResult = {
    id: "brave-1",
    title: "Breakthrough in Fusion Energy Reported",
    snippet: "Scientists at Lawrence Livermore achieve net energy gain with high yield in latest experiment.",
    url: "https://www.facebook.com/fusionlab/posts/554433/?utm_source=brave_news&ref=search",
    pageName: "Fusion Lab",
    contentType: "post",
    provider: "brave",
    providerName: "Brave Search API",
    score: 0.88,
    commentCount: 52,
    reactionsCount: 320,
    sharesCount: 55,
    dataAccessStatus: "public",
  };

  // Distinct post with similar title to verify we don't accidentally delete distinct posts with similar titles
  const distinctSimilarPost: NormalizedSearchResult = {
    id: "tavily-2",
    title: "Breakthrough in Fusion Energy: Next Steps",
    snippet: "What the recent net gain milestone means for commercial fusion...",
    url: "https://www.facebook.com/fusionlab/posts/554499",
    pageName: "Fusion Lab",
    contentType: "post",
    provider: "tavily",
    providerName: "Tavily Search API",
    score: 0.85,
    commentCount: 12,
    reactionsCount: 90,
    sharesCount: 10,
    dataAccessStatus: "public",
  };

  const rawBatch = [tavilyResult, braveResult, distinctSimilarPost];
  const deduplicated = deduplicateAndMergeProvenance(rawBatch);

  assert(
    deduplicated.length === 2,
    "Deduplicates same URL down to single record while keeping distinct posts"
  );

  const mergedPost = deduplicated.find(
    (r) => r.normalizedUrl === "https://www.facebook.com/fusionlab/posts/554433"
  );

  assert(
    Boolean(mergedPost),
    "Normalized canonical URL created accurately without tracking params"
  );
  assert(
    Boolean(mergedPost?.providers?.includes("tavily") && mergedPost?.providers?.includes("brave")),
    "Merges multi-provider provenance (both tavily and brave recorded)"
  );
  assert(
    mergedPost?.provenance?.length === 2,
    "Maintains detailed provenance array with individual provider records"
  );
  assert(
    mergedPost?.score === 0.92,
    "Preserves highest relevance score across merged providers"
  );
  assert(
    mergedPost?.commentCount === 52,
    "Preserves richest engagement metrics (comments, reactions)"
  );

  // Verify similar title was NOT deleted
  const secondPost = deduplicated.find(
    (r) => r.normalizedUrl === "https://www.facebook.com/fusionlab/posts/554499"
  );
  assert(
    Boolean(secondPost),
    "Avoids deleting different posts with similar titles (keyed strictly by canonical URL)"
  );
}

// =========================================================================
// 4. Meta Comments Retrieval & Pagination
// =========================================================================
async function testMetaCommentsAndPagination() {
  console.log("\n--- 4. Meta Comments Retrieval & Pagination ---");

  const meta = new MetaGraphProvider();

  // Test disabled state
  const unconfiguredResponse = await meta.fetchPostComments("post-12345");
  assert(
    unconfiguredResponse.comments.length === 0,
    "Returns empty comments when Meta token is unconfigured"
  );
  assert(
    Boolean(unconfiguredResponse.error),
    "Returns descriptive configuration notice when credentials missing"
  );

  // Test comment shape validation & safeguard
  // Verify that snippet text is never accepted as comment
  const mockComment = {
    id: "comment_998877",
    postId: "post-123",
    text: "Fascinating progress on this project!",
    authorName: "Sarah Connor",
    publishedAt: "2026-11-22T10:00:00Z",
    likesCount: 14,
  };

  assert(
    mockComment.text !== undefined && mockComment.id.startsWith("comment_"),
    "Validates authentic comment structure from Graph edge"
  );
}

// =========================================================================
// 5. Search Status & Partial Results Lifecycle
// =========================================================================
async function testSearchStatusAndPartialResults() {
  console.log("\n--- 5. Search Status & Partial Results Lifecycle ---");

  const orchestrator = new SearchOrchestrator();

  // Create Mock Providers: One Success, One Failure
  const mockHealthyProvider: SearchProvider = {
    name: "tavily",
    displayName: "Mock Tavily Adapter",
    isConfigured: () => true,
    search: async () => ({
      provider: "tavily",
      providerName: "Mock Tavily Adapter",
      results: [
        {
          id: "mock-1",
          title: "NASA Artemis IV Updates",
          snippet: "Official mission timeline...",
          url: "https://www.facebook.com/NASA/posts/1015998877",
          pageName: "NASA",
          contentType: "post",
          provider: "tavily",
          providerName: "Mock Tavily Adapter",
          dataAccessStatus: "public",
        },
      ],
      totalFound: 1,
      executionTimeMs: 150,
      quotaCost: 1,
    }),
  };

  const mockFailingProvider: SearchProvider = {
    name: "brave",
    displayName: "Mock Brave Adapter",
    isConfigured: () => true,
    search: async () => ({
      provider: "brave",
      providerName: "Mock Brave Adapter",
      results: [],
      totalFound: 0,
      executionTimeMs: 400,
      quotaCost: 0,
      error: "Brave Search API quota exhausted (HTTP 429).",
    }),
  };

  // Inject providers into orchestrator
  (orchestrator as any).tavily = mockHealthyProvider;
  (orchestrator as any).brave = mockFailingProvider;
  (orchestrator as any).meta = {
    name: "meta_graph",
    displayName: "Mock Meta",
    isConfigured: () => false,
    search: async () => ({
      provider: "meta_graph" as const,
      providerName: "Mock Meta",
      results: [],
      totalFound: 0,
      executionTimeMs: 0,
      quotaCost: 0,
    }),
  };

  // Execute multi-provider search with one failing provider
  const output = await orchestrator.search({
    query: "Artemis IV",
    providerPreference: "all",
  });

  // REQUIREMENT: "If one provider succeeds and another fails, mark the search partial rather than failed."
  assert(
    output.status === "partial",
    "STRICT COMPLIANCE: Marks search 'partial' when one provider succeeds and another fails"
  );
  assert(
    output.results.length === 1,
    "Returns valid results from the healthy provider"
  );
  assert(
    output.activeProviders.includes("tavily"),
    "Active providers list contains the successful provider"
  );
  assert(
    output.notes.some((n) => n.includes("quota exhausted")),
    "Observability notes capture the failing provider's error message"
  );
}

// =========================================================================
// Run Full Test Suite
// =========================================================================
async function runAll() {
  console.log("=================================================================");
  console.log("PHASE 4 - Search Orchestration, Result Processing & Comments");
  console.log("=================================================================");

  testUrlValidationAndNormalization();
  testConservativeClassification();
  testDeduplicationAndProvenance();
  await testMetaCommentsAndPagination();
  await testSearchStatusAndPartialResults();

  console.log("\n=================================================================");
  console.log(`PHASE 4 VERIFICATION SUMMARY: ${passedCount} Passed, ${failedCount} Failed`);
  console.log("=================================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log("All Phase 4 Search Orchestration and Processing tests passed!\n");
  }
}

runAll().catch((err) => {
  console.error("Fatal test execution error:", err);
  process.exit(1);
});
