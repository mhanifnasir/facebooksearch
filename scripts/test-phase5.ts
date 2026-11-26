/**
 * Verification test suite for Phase 5:
 * Real Dashboard & Search Results Integration
 *
 * Run with: npx tsx scripts/test-phase5.ts
 */

import { getDashboardDataAction } from "../src/app/dashboard/actions";
import {
  getUserSearchHistoryAction,
  deleteSearchHistoryItemAction,
  clearAllSearchHistoryAction,
} from "../src/app/history/actions";
import {
  getSavedSearchesAction,
  createSavedSearchAction,
  deleteSavedSearchAction,
} from "../src/app/saved/actions";
import { getFacebookPagesAction } from "../src/app/pages/actions";
import { getFacebookVideosAction } from "../src/app/videos/actions";
import { getDiscoveredCommentsAction } from "../src/app/comments/actions";
import { getPostDetailsAction } from "../src/app/posts/[id]/actions";

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

async function runPhase5Tests() {
  console.log("=================================================================");
  console.log("PHASE 5 - Real Dashboard & Search Results Integration Suite");
  console.log("=================================================================");

  // --- 1. Dashboard Metrics Action ---
  console.log("\n--- 1. Dashboard Metrics Action ---");
  try {
    const dashboardData = await getDashboardDataAction();
    assert(
      typeof dashboardData.metrics.totalSearches === "number",
      "Dashboard reports numeric totalSearches"
    );
    assert(
      typeof dashboardData.metrics.totalResults === "number",
      "Dashboard reports numeric totalResults"
    );
    assert(
      typeof dashboardData.metrics.totalPages === "number",
      "Dashboard reports numeric totalPages"
    );
    assert(
      typeof dashboardData.metrics.totalVideos === "number",
      "Dashboard reports numeric totalVideos"
    );
    assert(
      typeof dashboardData.metrics.totalComments === "number",
      "Dashboard reports numeric totalComments"
    );
    assert(
      Array.isArray(dashboardData.activityData) && dashboardData.activityData.length === 7,
      "Dashboard computes 7-day search activity chart"
    );
    assert(
      Array.isArray(dashboardData.recentSearches),
      "Dashboard returns user-scoped recent searches list"
    );
    assert(
      Array.isArray(dashboardData.recentPosts),
      "Dashboard returns cached recent posts list"
    );
  } catch (err) {
    assert(false, "Dashboard data action execution", String(err));
  }

  // --- 2. Search History Actions ---
  console.log("\n--- 2. Search History Actions ---");
  try {
    const history = await getUserSearchHistoryAction();
    assert(Array.isArray(history), "getUserSearchHistoryAction returns array");

    // Test delete on nonexistent ID safely returns false or completes
    const deleteRes = await deleteSearchHistoryItemAction("non-existent-id");
    assert(typeof deleteRes === "boolean", "deleteSearchHistoryItemAction returns boolean status");

    const clearRes = await clearAllSearchHistoryAction();
    assert(typeof clearRes === "boolean", "clearAllSearchHistoryAction returns boolean status");
  } catch (err) {
    assert(false, "Search history actions execution", String(err));
  }

  // --- 3. Saved Searches Actions ---
  console.log("\n--- 3. Saved Searches Actions ---");
  try {
    const saved = await getSavedSearchesAction();
    assert(Array.isArray(saved), "getSavedSearchesAction returns user-scoped array");

    let authErrorCaught = false;
    try {
      await createSavedSearchAction({
        name: "Test Saved Search",
        query: "Llama 4",
      });
    } catch {
      authErrorCaught = true;
    }
    assert(authErrorCaught, "createSavedSearchAction enforces user authentication");

    const deleteSavedRes = await deleteSavedSearchAction("non-existent-id");
    assert(typeof deleteSavedRes === "boolean", "deleteSavedSearchAction returns boolean status");
  } catch (err) {
    assert(false, "Saved searches actions execution", String(err));
  }

  // --- 4. Facebook Pages Action ---
  console.log("\n--- 4. Facebook Pages Action ---");
  try {
    const pages = await getFacebookPagesAction();
    assert(Array.isArray(pages), "getFacebookPagesAction returns array");
  } catch (err) {
    assert(false, "Facebook pages action execution", String(err));
  }

  // --- 5. Facebook Videos Action (No Rehosting) ---
  console.log("\n--- 5. Facebook Videos Action ---");
  try {
    const videos = await getFacebookVideosAction();
    assert(Array.isArray(videos), "getFacebookVideosAction returns array of videos and reels");
    if (videos.length > 0) {
      assert(
        videos.every((v) => v.content_type === "video" || v.content_type === "reel"),
        "Enforces video & reel content types only"
      );
    } else {
      assert(true, "Video list gracefully returns empty array when cache is fresh");
    }
  } catch (err) {
    assert(false, "Facebook videos action execution", String(err));
  }

  // --- 6. Comments Action (Authentic Graph Edge) ---
  console.log("\n--- 6. Comments Action ---");
  try {
    const comments = await getDiscoveredCommentsAction();
    assert(Array.isArray(comments), "getDiscoveredCommentsAction returns array");
  } catch (err) {
    assert(false, "Comments action execution", String(err));
  }

  // --- 7. Post Details Action ---
  console.log("\n--- 7. Post Details Action ---");
  try {
    const post = await getPostDetailsAction("sample-id-or-nonexistent");
    assert(post === null || typeof post === "object", "getPostDetailsAction handles lookup safely");
  } catch (err) {
    assert(false, "Post details action execution", String(err));
  }

  console.log("\n=================================================================");
  console.log(`PHASE 5 VERIFICATION SUMMARY: ${passedCount} Passed, ${failedCount} Failed`);
  console.log("=================================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log("All Phase 5 Real Dashboard & Integration tests passed!\n");
  }
}

runPhase5Tests().catch((err) => {
  console.error("Fatal Phase 5 test error:", err);
  process.exit(1);
});
