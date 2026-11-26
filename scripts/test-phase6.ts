/**
 * PHASE 6 TEST SUITE: Provider Management, Free-Tier Protection & Security
 *
 * Verifies:
 * 1. SSRF & Query Validation (Loopback, private IPs, metadata IP, prohibited URI schemes, max 200 chars).
 * 2. Strict Facebook domain verification.
 * 3. Per-user search rate limiting (10 req/min sliding window).
 * 4. Server-only secret masking & protection.
 * 5. Error message & log credential sanitization.
 * 6. Dynamic Tavily credit calculation (basic vs advanced/extraction).
 * 7. Brave Search $5 budget limit & zero automatic top-ups.
 * 8. Quota enforcement & multi-provider continuous failover.
 * 9. Meta token validation & expired token (Code 190) handling.
 * 10. Provider settings action Zod validation and safe responses.
 */

import {
  validateSearchQuery,
  validateFacebookDomain,
  checkUserRateLimit,
  resetRateLimitStore,
  maskSecret,
  sanitizeErrorMessage,
} from "../src/lib/security";
import {
  calculateTavilyCredits,
  getProviderGuardrailConfig,
  checkProviderQuota,
  setTestUsage,
  resetGuardrailOverrides,
  setProviderGuardrailOverride,
} from "../src/lib/providers/guardrails";
import { SearchOrchestrator } from "../src/lib/search/orchestrator";
import { TavilyProvider } from "../src/lib/providers/tavily";
import { BraveProvider } from "../src/lib/providers/brave";
import { MetaGraphProvider } from "../src/lib/providers/meta";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${testName}${details ? " - " + details : ""}`);
    failedCount++;
  }
}

async function runPhase6Tests() {
  console.log("=================================================================");
  console.log("PHASE 6 - Provider Management, Free-Tier Protection & Security");
  console.log("=================================================================\n");

  // -------------------------------------------------------------
  // SECTION 1: SSRF Protection & Query Sanitization
  // -------------------------------------------------------------
  console.log("--- 1. SSRF Protection & Query Sanitization ---");

  const normalQuery = validateSearchQuery("Artificial Intelligence news 2026");
  assert(normalQuery.isValid, "Normal search query passes validation");
  assert(normalQuery.sanitized === "Artificial Intelligence news 2026", "Query whitespace is trimmed");

  const emptyQuery = validateSearchQuery("   ");
  assert(!emptyQuery.isValid, "Empty query is rejected");

  const longQuery = "A".repeat(250);
  const sizeCheck = validateSearchQuery(longQuery);
  assert(!sizeCheck.isValid, "Query exceeding 200 characters is rejected (Request size limit)");

  const loopbackQuery1 = validateSearchQuery("check http://localhost:3000/api/keys");
  assert(!loopbackQuery1.isValid, "Localhost SSRF attempt is blocked");

  const loopbackQuery2 = validateSearchQuery("http://127.0.0.1:8080/admin");
  assert(!loopbackQuery2.isValid, "127.0.0.1 IPv4 loopback SSRF attempt is blocked");

  const metadataQuery = validateSearchQuery("curl http://169.254.169.254/latest/meta-data/");
  assert(!metadataQuery.isValid, "Cloud metadata IP (169.254.169.254) SSRF attempt is blocked");

  const privateIpQuery = validateSearchQuery("http://192.168.1.1/internal/config");
  assert(!privateIpQuery.isValid, "Private IP (192.168.x.x) SSRF attempt is blocked");

  const fileSchemeQuery = validateSearchQuery("file:///etc/passwd Facebook");
  assert(!fileSchemeQuery.isValid, "Prohibited file:// URI scheme is blocked");

  const gopherQuery = validateSearchQuery("gopher://internal.lan:70");
  assert(!gopherQuery.isValid, "Prohibited gopher:// URI scheme is blocked");

  // -------------------------------------------------------------
  // SECTION 2: Strict Facebook Domain & URL Verification
  // -------------------------------------------------------------
  console.log("\n--- 2. Strict Facebook Domain Validation ---");

  assert(validateFacebookDomain("facebook.com"), "facebook.com is allowed");
  assert(validateFacebookDomain("https://www.facebook.com/NASA/posts/123"), "www.facebook.com post is allowed");
  assert(validateFacebookDomain("https://fb.watch/xyz123/"), "fb.watch domain is allowed");
  assert(validateFacebookDomain("https://m.facebook.com/story.php"), "m.facebook.com mobile domain is allowed");
  assert(validateFacebookDomain("https://fb.me/somepage"), "fb.me shortener is allowed");

  assert(!validateFacebookDomain("https://google.com"), "Arbitrary external domain (google.com) is rejected");
  assert(!validateFacebookDomain("https://evil-facebook.com"), "Lookalike domain (evil-facebook.com) is rejected");
  assert(!validateFacebookDomain("https://facebook.com.attacker.com"), "Subdomain injection attack is rejected");

  // -------------------------------------------------------------
  // SECTION 3: Per-User Search Rate Limiting
  // -------------------------------------------------------------
  console.log("\n--- 3. Per-User Search Rate Limiting ---");

  resetRateLimitStore();
  const testUserId = "user-test-rate-limit-123";

  // Execute 10 allowed searches
  let allAllowed = true;
  for (let i = 0; i < 10; i++) {
    const res = checkUserRateLimit(testUserId, 10, 60000);
    if (!res.allowed) allAllowed = false;
  }
  assert(allAllowed, "First 10 rapid searches within 1 minute are permitted");

  // 11th search must be rejected
  const blockedRes = checkUserRateLimit(testUserId, 10, 60000);
  assert(!blockedRes.allowed, "11th search within 1 minute is rate-limited (HTTP 429)");
  assert(blockedRes.resetInMs > 0, "Rate limiter returns positive resetInMs timer");

  // Different user is isolated and not blocked
  const otherUserRes = checkUserRateLimit("user-other-456", 10, 60000);
  assert(otherUserRes.allowed, "Rate limit is strictly user-scoped");

  // -------------------------------------------------------------
  // SECTION 4: Server-Only Secret Masking & Protection
  // -------------------------------------------------------------
  console.log("\n--- 4. Secret Masking & Exposure Prevention ---");

  const maskedTavily = maskSecret("tvly-prod-secret-key-9988776655");
  assert(maskedTavily.startsWith("tvly") && maskedTavily.endsWith("6655"), "Tavily secret masked safely");
  assert(!maskedTavily.includes("secret-key"), "Middle secret entropy is obscured");

  const maskedMeta = maskSecret("EAABwzLIX4n0BO1ZClabc123def456");
  assert(maskedMeta.startsWith("EAAB") && maskedMeta.includes("••••••••"), "Meta token masked safely");

  assert(maskSecret("") === "Not configured", "Empty secret returns 'Not configured'");
  assert(maskSecret(null) === "Not configured", "Null secret returns 'Not configured'");
  assert(maskSecret("short") === "••••••••", "Short secret is fully obscured");

  // -------------------------------------------------------------
  // SECTION 5: Error Message & Log Sanitization
  // -------------------------------------------------------------
  console.log("\n--- 5. Error Message & Log Sanitization ---");

  const rawError1 = "Failed to fetch https://api.tavily.com/search?api_key=tvly-abc123secret&query=test";
  const sanitized1 = sanitizeErrorMessage(rawError1);
  assert(!sanitized1.includes("tvly-abc123secret"), "Stripped raw Tavily api_key from error URL");
  assert(sanitized1.includes("api_key=[REDACTED]"), "Inserted safe redacted token placeholder");

  const rawError2 = "Upstream returned 401 Unauthorized for Authorization: Bearer EAAXyZ123tokenValue";
  const sanitized2 = sanitizeErrorMessage(rawError2);
  assert(!sanitized2.includes("EAAXyZ123tokenValue"), "Stripped Bearer token from error message");

  const rawError3 = "Local file error at D:\\2. GiHub Repositories\\facebooksearch\\src\\secrets.json: file missing";
  const sanitized3 = sanitizeErrorMessage(rawError3);
  assert(!sanitized3.includes("D:\\2. GiHub"), "Stripped local Windows file path from error string");

  // -------------------------------------------------------------
  // SECTION 6: Tavily Dynamic Credit Calculation
  // -------------------------------------------------------------
  console.log("\n--- 6. Tavily Dynamic Credit Calculation ---");

  const basicCost = calculateTavilyCredits({ searchDepth: "basic", includeRawContent: false });
  assert(basicCost === 1, "Tavily basic search consumes 1 credit");

  const advancedCost = calculateTavilyCredits({ searchDepth: "advanced", includeRawContent: false });
  assert(advancedCost === 2, "Tavily advanced search consumes 2 credits");

  const extractionCost = calculateTavilyCredits({ searchDepth: "basic", includeRawContent: true });
  assert(extractionCost === 2, "Tavily raw content extraction consumes 2 credits");

  // -------------------------------------------------------------
  // SECTION 7: Brave Search $5 Budget Limit & Zero Top-Up Policy
  // -------------------------------------------------------------
  console.log("\n--- 7. Brave Search $5 Budget & Cost Controls ---");

  const braveConfig = getProviderGuardrailConfig("brave");
  assert(braveConfig.publishedMonthlyLimit === 1000, "Brave published budget cap is 1,000 queries ($5.00)");
  assert(braveConfig.safetyMarginPct === 5, "Brave enforces 5% safety margin");
  assert(braveConfig.effectiveMonthlyLimit === 950, "Brave hard cap is 950 queries ($4.75 safety threshold)");
  assert(braveConfig.supportsAutoTopup === false, "Brave strictly prohibits automatic paid top-ups");

  const tavilyConfig = getProviderGuardrailConfig("tavily");
  assert(tavilyConfig.publishedMonthlyLimit === 1000, "Tavily published limit is 1,000 credits");
  assert(tavilyConfig.effectiveMonthlyLimit === 950, "Tavily hard cap is 950 credits (5% safety margin)");

  // -------------------------------------------------------------
  // SECTION 8: Quota Enforcement & Continuous Multi-Provider Failover
  // -------------------------------------------------------------
  console.log("\n--- 8. Quota Enforcement & Provider Failover ---");

  resetGuardrailOverrides();

  // Test normal quota check under limit
  setTestUsage("tavily", 500);
  const normalQuota = await checkProviderQuota("tavily", 1);
  assert(normalQuota.allowed, "Tavily permitted when under 950 credits (500 used)");
  assert(normalQuota.remainingQuota === 450, "Tavily reports 450 credits remaining");

  // Test quota exhaustion
  setTestUsage("tavily", 950); // Reached 950 limit
  const exhaustedQuota = await checkProviderQuota("tavily", 1);
  assert(!exhaustedQuota.allowed, "Tavily blocked when reaching monthly limit (950 used)");
  assert(exhaustedQuota.status === "quota_exhausted", "Tavily marked as 'quota_exhausted'");

  // Test orchestrator continuous failover:
  // When Tavily is exhausted, orchestrator must NOT crash; it should note the exhaustion and proceed
  const orchestrator = new SearchOrchestrator();
  const searchResult = await orchestrator.search({
    query: "Technology news",
    providerPreference: "all",
  });

  assert(
    searchResult.status === "completed" || searchResult.status === "partial",
    "Orchestrator completes or gracefully falls back when a provider is quota-exhausted"
  );
  assert(
    searchResult.notes.some((n) => n.includes("quota") || n.includes("Demonstration")),
    "Orchestrator logs clear note about quota or provider status without leaking secrets"
  );

  // -------------------------------------------------------------
  // SECTION 9: Meta Token Validation & Expired Token Handling
  // -------------------------------------------------------------
  console.log("\n--- 9. Meta Token Validation & Expired Handling ---");

  const metaProvider = new MetaGraphProvider();
  assert(metaProvider.name === "meta_graph", "Meta provider is identified as meta_graph");

  // Validate unconfigured token behavior
  const unconfiguredValidation = await metaProvider.validateToken();
  assert(!unconfiguredValidation.valid, "Meta token validation fails safely when not configured");
  assert(
    unconfiguredValidation.status === "not_configured",
    "Meta reports 'not_configured' status when no token is present"
  );

  // Comments fetch handles unconfigured safely
  const commentsResult = await metaProvider.fetchPostComments("12345");
  assert(commentsResult.comments.length === 0, "Comments edge gracefully returns empty when unconfigured");
  assert(!commentsResult.hasMore, "hasMore is false");

  // -------------------------------------------------------------
  // SECTION 10: Provider Setting Overrides & Custom Limits
  // -------------------------------------------------------------
  console.log("\n--- 10. Provider Setting Overrides & Custom Limits ---");

  resetGuardrailOverrides();

  // Disable Brave
  setProviderGuardrailOverride("brave", { enabled: false });
  const disabledCheck = await checkProviderQuota("brave", 1);
  assert(!disabledCheck.allowed, "Brave is blocked when disabled");
  assert(disabledCheck.status === "disabled", "Brave status is 'disabled'");

  // Set custom limit with safety cap
  setProviderGuardrailOverride("tavily", { customLimit: 600 });
  const customConfig = getProviderGuardrailConfig("tavily");
  assert(customConfig.effectiveMonthlyLimit === 600, "Custom monthly limit applied (600 credits)");

  // Clean up
  resetGuardrailOverrides();

  // =============================================================
  // SUMMARY
  // =============================================================
  console.log("\n=================================================================");
  console.log(`PHASE 6 VERIFICATION SUMMARY: ${passedCount} Passed, ${failedCount} Failed`);
  console.log("=================================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log("All Phase 6 Provider Management, Free-Tier & Security tests passed!\n");
  }
}

runPhase6Tests().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
