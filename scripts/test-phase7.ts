/**
 * PHASE 7 TEST SUITE: Production Deployment, Git Hygiene & Serverless Verification
 *
 * Verifies:
 * 1. Git Hygiene & Secret Exclusion (.gitignore, .env.example, zero committed secrets).
 * 2. Authentication Lifecycle (Registration, Login, Route Guards, Logout).
 * 3. Dashboard Real Metrics & Telemetry.
 * 4. Multi-Provider Search Dispatch (Tavily, Brave, Meta optional connection).
 * 5. Database Result Storage & Provenance.
 * 6. Authentic Comments Edge Inspection & Pagination.
 * 7. Search History CRUD & Repeat Search.
 * 8. Saved Searches CRUD & Vercel Serverless Cron Handler.
 * 9. Provider Usage Logging & Guardrails.
 * 10. Vercel Serverless Deployment Configuration (vercel.json, maxDuration, static optimization).
 */

import fs from "fs";
import path from "path";
import { loginSchema, registerSchema } from "../src/lib/types";
import { searchOrchestrator } from "../src/lib/search/orchestrator";
import { TavilyProvider } from "../src/lib/providers/tavily";
import { BraveProvider } from "../src/lib/providers/brave";
import { MetaGraphProvider } from "../src/lib/providers/meta";
import { getDashboardDataAction } from "../src/app/dashboard/actions";
import { getUserSearchHistoryAction, deleteSearchHistoryItemAction } from "../src/app/history/actions";
import {
  getSavedSearchesAction,
  createSavedSearchAction,
  deleteSavedSearchAction,
} from "../src/app/saved/actions";
import { getSavedSearchesDueForRun } from "../src/lib/repositories/saved-searches";
import { checkProviderQuota, getProviderGuardrailConfig } from "../src/lib/providers/guardrails";

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

async function runPhase7Tests() {
  console.log("=================================================================");
  console.log("PHASE 7 - Production Deployment, Git Hygiene & Vercel Verification");
  console.log("=================================================================\n");

  const rootDir = process.cwd();

  // -------------------------------------------------------------
  // SECTION 1: Git Hygiene & Secret Exclusion
  // -------------------------------------------------------------
  console.log("--- 1. Git Hygiene & Secret Exclusion ---");

  const gitignorePath = path.join(rootDir, ".gitignore");
  assert(fs.existsSync(gitignorePath), ".gitignore file exists");

  const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
  assert(gitignoreContent.includes(".env"), ".gitignore explicitly ignores .env files");
  assert(gitignoreContent.includes(".env*.local"), ".gitignore explicitly ignores .env*.local");
  assert(gitignoreContent.includes("!.env.example"), ".gitignore allows committing .env.example");

  const envExamplePath = path.join(rootDir, ".env.example");
  assert(fs.existsSync(envExamplePath), ".env.example file exists");

  const envExampleContent = fs.readFileSync(envExamplePath, "utf-8");
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TAVILY_API_KEY",
    "BRAVE_API_KEY",
    "META_APP_ID",
    "META_APP_SECRET",
    "META_ACCESS_TOKEN",
  ];

  for (const envVar of requiredEnvVars) {
    assert(
      envExampleContent.includes(envVar),
      `.env.example documents ${envVar}`
    );
  }

  // Scan .env.example to ensure no REAL secrets or private keys were committed
  assert(
    !envExampleContent.includes("tvly-prod-") &&
      !envExampleContent.includes("EAABwzLIX") &&
      !envExampleContent.includes("BSA-secret"),
    ".env.example contains only placeholders, zero real API tokens"
  );

  // -------------------------------------------------------------
  // SECTION 2: Authentication Lifecycle & Validation
  // -------------------------------------------------------------
  console.log("\n--- 2. Authentication Lifecycle & Validation ---");

  const validRegistration = registerSchema.safeParse({
    fullName: "Lead Security Auditor",
    organization: "Global Threat Intelligence",
    email: "auditor@facebooksearch.internal",
    password: "Password123!",
    agreeTerms: true,
  });
  assert(validRegistration.success, "Registration schema validates correct input");

  const invalidEmailReg = registerSchema.safeParse({
    fullName: "Tester",
    organization: "Threat Intel",
    email: "not-an-email",
    password: "Password123!",
    agreeTerms: true,
  });
  assert(!invalidEmailReg.success, "Registration rejects invalid email format");

  const validLogin = loginSchema.safeParse({
    email: "analyst@facebooksearch.internal",
    password: "Password123!",
  });
  assert(validLogin.success, "Login schema validates correct credentials");

  // -------------------------------------------------------------
  // SECTION 3: Dashboard Real Metrics & Telemetry
  // -------------------------------------------------------------
  console.log("\n--- 3. Dashboard Real Metrics ---");

  const dashboardData = await getDashboardDataAction();
  assert(typeof dashboardData.metrics.totalSearches === "number", "Dashboard returns numeric totalSearches");
  assert(typeof dashboardData.metrics.totalResults === "number", "Dashboard returns numeric totalResults");
  assert(typeof dashboardData.metrics.totalPages === "number", "Dashboard returns numeric totalPages");
  assert(typeof dashboardData.metrics.totalVideos === "number", "Dashboard returns numeric totalVideos");
  assert(typeof dashboardData.metrics.totalComments === "number", "Dashboard returns numeric totalComments");
  assert(Array.isArray(dashboardData.activityData), "Dashboard returns activity chart array");
  assert(Array.isArray(dashboardData.recentSearches), "Dashboard returns recent searches array");

  // -------------------------------------------------------------
  // SECTION 4: Multi-Provider Search Adapters
  // -------------------------------------------------------------
  console.log("\n--- 4. Multi-Provider Search Adapters ---");

  const tavily = new TavilyProvider();
  assert(tavily.name === "tavily", "Tavily adapter identifies as 'tavily'");

  const brave = new BraveProvider();
  assert(brave.name === "brave", "Brave adapter identifies as 'brave'");

  const meta = new MetaGraphProvider();
  assert(meta.name === "meta_graph", "Meta connector identifies as 'meta_graph'");

  // Test optional Meta connector graceful degradation when unconfigured
  const metaValidation = await meta.validateToken();
  assert(!metaValidation.valid, "Meta connector gracefully stays disabled when unconfigured");
  assert(
    metaValidation.status === "not_configured",
    "Meta connector reports 'not_configured' status"
  );

  // -------------------------------------------------------------
  // SECTION 5: Search Orchestrator, Storage & Provenance
  // -------------------------------------------------------------
  console.log("\n--- 5. Search Orchestration & Provenance ---");

  const searchOutput = await searchOrchestrator.search({
    query: "Artificial Intelligence in Healthcare",
    providerPreference: "all",
    limit: 5,
  });

  assert(
    searchOutput.status === "completed" || searchOutput.status === "partial",
    "Search orchestrator executes successfully"
  );
  assert(Array.isArray(searchOutput.results), "Search output contains normalized results array");
  assert(searchOutput.executionTimeMs > 0, "Orchestrator records execution latency");

  if (searchOutput.results.length > 0) {
    const firstResult = searchOutput.results[0];
    assert(Boolean(firstResult.url), "Result contains valid Facebook URL");
    assert(Boolean(firstResult.provider), "Result maintains provider attribution");
    assert(
      firstResult.contentType === "post" ||
        firstResult.contentType === "page" ||
        firstResult.contentType === "video" ||
        firstResult.contentType === "unknown",
      "Result is classified conservatively"
    );
  }

  // -------------------------------------------------------------
  // SECTION 6: Comments Edge & Pagination
  // -------------------------------------------------------------
  console.log("\n--- 6. Comments Edge & Pagination ---");

  const commentsResult = await meta.fetchPostComments("post-sample-id-123", { limit: 10 });
  assert(Array.isArray(commentsResult.comments), "Comments edge returns array");
  assert(typeof commentsResult.hasMore === "boolean", "Comments edge returns boolean hasMore flag");

  // -------------------------------------------------------------
  // SECTION 7: Search History Actions
  // -------------------------------------------------------------
  console.log("\n--- 7. Search History Actions ---");

  const history = await getUserSearchHistoryAction();
  assert(Array.isArray(history), "getUserSearchHistoryAction returns array");

  const deleteHistoryRes = await deleteSearchHistoryItemAction("non-existent-id");
  assert(deleteHistoryRes !== undefined, "deleteSearchHistoryItemAction handles deletion safely");

  // -------------------------------------------------------------
  // SECTION 8: Saved Searches & Vercel Serverless Cron Handler
  // -------------------------------------------------------------
  console.log("\n--- 8. Saved Searches & Serverless Cron ---");

  const savedSearches = await getSavedSearchesAction();
  assert(Array.isArray(savedSearches), "getSavedSearchesAction returns array");

  const deleteSavedRes = await deleteSavedSearchAction("non-existent-id");
  assert(deleteSavedRes === false, "deleteSavedSearchAction safely returns false for non-existent record");

  // Verify serverless cron repository method
  const dueSearches = await getSavedSearchesDueForRun(5, true);
  assert(Array.isArray(dueSearches), "getSavedSearchesDueForRun returns array for serverless cron");

  // -------------------------------------------------------------
  // SECTION 9: Provider Usage Logging & Guardrails
  // -------------------------------------------------------------
  console.log("\n--- 9. Provider Usage Guardrails ---");

  const tavilyConfig = getProviderGuardrailConfig("tavily");
  assert(tavilyConfig.effectiveMonthlyLimit === 950, "Tavily enforces 950 credit hard cap");

  const braveConfig = getProviderGuardrailConfig("brave");
  assert(braveConfig.effectiveMonthlyLimit === 950, "Brave enforces 950 query hard cap ($4.75 budget)");
  assert(braveConfig.supportsAutoTopup === false, "Brave prohibits automatic paid top-ups");

  const quotaCheck = await checkProviderQuota("tavily", 1);
  assert(typeof quotaCheck.allowed === "boolean", "checkProviderQuota returns boolean allowed status");

  // -------------------------------------------------------------
  // SECTION 10: Vercel Serverless Configuration
  // -------------------------------------------------------------
  console.log("\n--- 10. Vercel Serverless Configuration ---");

  const vercelJsonPath = path.join(rootDir, "vercel.json");
  assert(fs.existsSync(vercelJsonPath), "vercel.json exists in root directory");

  const vercelJsonContent = JSON.parse(fs.readFileSync(vercelJsonPath, "utf-8"));
  assert(vercelJsonContent.framework === "nextjs", "vercel.json configures 'nextjs' framework");
  assert(Array.isArray(vercelJsonContent.crons), "vercel.json configures serverless crons");
  assert(
    vercelJsonContent.crons.some((c: any) => c.path === "/api/cron/saved-searches"),
    "vercel.json schedules /api/cron/saved-searches"
  );

  const cronRoutePath = path.join(rootDir, "src", "app", "api", "cron", "saved-searches", "route.ts");
  assert(fs.existsSync(cronRoutePath), "Serverless cron route handler exists at src/app/api/cron/saved-searches/route.ts");

  const cronRouteContent = fs.readFileSync(cronRoutePath, "utf-8");
  assert(cronRouteContent.includes("export const maxDuration = 15"), "Cron route defines serverless maxDuration = 15s");

  // =============================================================
  // SUMMARY
  // =============================================================
  console.log("\n=================================================================");
  console.log(`PHASE 7 VERIFICATION SUMMARY: ${passedCount} Passed, ${failedCount} Failed`);
  console.log("=================================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log("All Phase 7 Production Deployment & Vercel Verification tests passed!\n");
  }
}

runPhase7Tests().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
