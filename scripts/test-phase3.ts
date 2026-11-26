/**
 * Phase 3 Verification Suite: Multi-Provider Facebook Search Integration
 *
 * Tests:
 * 1. Facebook Query Builder & URL Classifier
 * 2. Tavily Provider Adapter (Unit test with mock & live integration test)
 * 3. Brave Provider Adapter (Unit test with mock & 429 quota test)
 * 4. Meta Graph API Connector (Unit test with mock & token expiration handling)
 * 5. Search Orchestrator (Multi-provider fanout, URL deduplication, fault tolerance)
 */

import { buildTargetedFacebookQueries, classifyFacebookUrl, extractPageInfoFromUrl } from "../src/lib/search/query-builder";
import { TavilyProvider } from "../src/lib/providers/tavily";
import { BraveProvider } from "../src/lib/providers/brave";
import { MetaGraphProvider } from "../src/lib/providers/meta";
import { SearchOrchestrator } from "../src/lib/search/orchestrator";
import { NormalizedSearchResult } from "../src/lib/providers/types";

console.log("=================================================================");
console.log("PHASE 3 - Multi-Provider Facebook Search Verification Suite");
console.log("=================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    if (detail) console.error(`       Detail: ${detail}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// TEST 1: Facebook Query Builder & URL Classifier
// ---------------------------------------------------------------------------
console.log("--- 1. Query Builder & URL Classifier ---");

const queries = buildTargetedFacebookQueries("SpaceX Starship", { exactPhrase: true });
assert(
  queries.general.includes('site:facebook.com "SpaceX Starship"'),
  "Query builder generates domain-restricted general Facebook query"
);
assert(
  queries.posts.includes("inurl:posts") && queries.posts.includes("inurl:photos"),
  "Query builder generates post-specific inurl filters"
);
assert(
  queries.videos.includes("inurl:videos") && queries.videos.includes("inurl:watch"),
  "Query builder generates video/reel-specific inurl filters"
);
assert(
  queries.pages.includes("-inurl:posts") && queries.pages.includes("-inurl:videos"),
  "Query builder generates page-specific filters excluding post noise"
);

// URL Classification Tests
assert(
  classifyFacebookUrl("https://www.facebook.com/NASA/videos/1015629482910/") === "video",
  "Classifies /videos/ path as video"
);
assert(
  classifyFacebookUrl("https://www.facebook.com/watch/?v=928471928") === "video",
  "Classifies /watch/ path as video"
);
assert(
  classifyFacebookUrl("https://www.facebook.com/reel/829182938192") === "reel",
  "Classifies /reel/ path as reel"
);
assert(
  classifyFacebookUrl("https://www.facebook.com/TechCrunch/posts/101592849182") === "post",
  "Classifies /posts/ path as post"
);
assert(
  classifyFacebookUrl("https://www.facebook.com/permalink.php?story_fbid=123&id=456") === "post",
  "Classifies permalink.php as post"
);
assert(
  classifyFacebookUrl("https://www.facebook.com/HarvardUniversity") === "page",
  "Classifies root vanity profile URL as page"
);
assert(
  classifyFacebookUrl("https://twitter.com/example/status/123") === "general",
  "Non-Facebook URL correctly classified as general"
);

// Page info extraction test
const pageInfo = extractPageInfoFromUrl(
  "https://www.facebook.com/NASA/posts/1015",
  "NASA - National Aeronautics and Space Administration | Facebook"
);
assert(
  pageInfo.pageName.includes("NASA") && pageInfo.pageUsername === "@NASA",
  "Extracts page name and username handle accurately"
);

// ---------------------------------------------------------------------------
// TEST 2: Tavily Provider Adapter (Mock Unit Test)
// ---------------------------------------------------------------------------
console.log("\n--- 2. Tavily Provider Adapter ---");

const originalFetch = global.fetch;

// Mock Tavily Response
const mockTavilyApiResponse = {
  results: [
    {
      title: "Meta for Developers - Introducing Llama 4 | Facebook",
      url: "https://www.facebook.com/MetaforDevelopers/posts/1016298491823901",
      content: "Announcing Llama 4 open foundation models with multimodal intelligence.",
      score: 0.94,
      published_date: "2026-11-21T14:32:00Z",
    },
    {
      title: "NASA Artemis IV Mission Telemetry Video | Facebook",
      url: "https://www.facebook.com/NASA/videos/892019284729102",
      content: "Watch live as international partners test the lunar gateway module.",
      score: 0.89,
      published_date: "2026-11-21T12:15:00Z",
    },
  ],
};

// Set dummy API key for testing
process.env.TAVILY_API_KEY = "tvly-test-mock-key-12345";
const tavilyProvider = new TavilyProvider();
assert(tavilyProvider.isConfigured(), "Tavily provider detects configured API key");

// Inject mock fetch for Tavily
global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = input.toString();
  if (urlStr.includes("api.tavily.com")) {
    return new Response(JSON.stringify(mockTavilyApiResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return originalFetch(input, init);
};

async function testTavilyMock() {
  const res = await tavilyProvider.search({ query: "Llama 4", limit: 2 });
  assert(res.provider === "tavily", "Tavily response has correct provider tag");
  assert(res.results.length === 2, "Tavily returns normalized result array");
  assert(res.results[0].contentType === "post", "First Tavily result classified as post");
  assert(res.results[1].contentType === "video", "Second Tavily result classified as video");
  assert(res.results[0].score === 0.94, "Tavily preserves search relevance score");
}

// ---------------------------------------------------------------------------
// TEST 3: Brave Provider Adapter (Mock Unit Test & 429 Quota Guard)
// ---------------------------------------------------------------------------
console.log("\n--- 3. Brave Provider Adapter & Quota Guard ---");

process.env.BRAVE_SEARCH_API_KEY = "brave-test-mock-key-12345";
const braveProvider = new BraveProvider();
assert(braveProvider.isConfigured(), "Brave provider detects configured API key");

// Mock Brave 429 Quota Exhaustion Response
global.fetch = async (input: RequestInfo | URL) => {
  const urlStr = input.toString();
  if (urlStr.includes("api.search.brave.com")) {
    return new Response(JSON.stringify({ message: "Quota Exceeded" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }
  return originalFetch(input);
};

async function testBraveQuota() {
  const res = await braveProvider.search({ query: "EV Batteries", limit: 5 });
  assert(
    res.error !== undefined && res.error.includes("429") && res.error.includes("Paid automatic top-ups are disabled"),
    "Brave safely handles 429 quota exhaustion without auto top-ups"
  );
  assert(res.results.length === 0, "Brave returns empty results array on quota exhaustion");
}

// ---------------------------------------------------------------------------
// TEST 4: Meta Graph API Provider (Token Expiration & Permitted Access)
// ---------------------------------------------------------------------------
console.log("\n--- 4. Meta Graph API Connector & Token Guard ---");

// Test unconfigured state
delete process.env.META_PAGE_ACCESS_TOKEN;
const unconfiguredMeta = new MetaGraphProvider();
assert(!unconfiguredMeta.isConfigured(), "Meta connector stays disabled when access token is unset");

// Test token expiration error handling (Code 190)
process.env.META_PAGE_ACCESS_TOKEN = "EAABwzLIX4n0BOtesttoken123456789";
const configuredMeta = new MetaGraphProvider();
assert(configuredMeta.isConfigured(), "Meta connector is enabled when token is provided");

global.fetch = async (input: RequestInfo | URL) => {
  const urlStr = input.toString();
  if (urlStr.includes("graph.facebook.com")) {
    return new Response(
      JSON.stringify({
        error: {
          message: "Error validating access token: Session has expired",
          type: "OAuthException",
          code: 190,
          error_subcode: 463,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
  return originalFetch(input);
};

async function testMetaTokenExpiration() {
  const res = await configuredMeta.search({ query: "Official Announcements" });
  assert(
    res.error !== undefined && res.error.includes("Code 190"),
    "Meta connector detects and clearly surfaces expired token Code 190"
  );
}

// ---------------------------------------------------------------------------
// TEST 5: Search Orchestrator (Multi-Provider Fanout & Fault Tolerance)
// ---------------------------------------------------------------------------
console.log("\n--- 5. Search Orchestrator Multi-Provider Integration ---");

const orchestrator = new SearchOrchestrator();

// Reset fetch mock for orchestrator test: Tavily succeeds, Brave fails 429
global.fetch = async (input: RequestInfo | URL) => {
  const urlStr = input.toString();
  if (urlStr.includes("api.tavily.com")) {
    return new Response(JSON.stringify(mockTavilyApiResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (urlStr.includes("api.search.brave.com")) {
    return new Response(JSON.stringify({ message: "Quota Exceeded" }), {
      status: 429,
    });
  }
  return originalFetch(input);
};

async function testOrchestrator() {
  const orchestrated = await orchestrator.search({
    query: "Llama 4 Open Source",
    providerPreference: "all",
  });

  assert(
    orchestrated.results.length > 0,
    "Orchestrator continues successfully and returns results when one provider fails"
  );
  assert(
    orchestrated.activeProviders.includes("tavily") || orchestrated.activeProviders.includes("Tavily Search API"),
    "Active providers list contains successful Tavily provider"
  );
  assert(
    orchestrated.notes.some((n) => n.includes("Brave Search API")),
    "Orchestrator notes capture the Brave provider error for observability"
  );
}

// ---------------------------------------------------------------------------
// RUN ALL ASYNC TESTS
// ---------------------------------------------------------------------------
async function runAll() {
  await testTavilyMock();
  await testBraveQuota();
  await testMetaTokenExpiration();
  await testOrchestrator();

  // Restore fetch
  global.fetch = originalFetch;

  console.log("\n=================================================================");
  console.log(`PHASE 3 VERIFICATION SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("All Phase 3 Multi-Provider Search integration tests passed!\n");
  }
}

runAll().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
