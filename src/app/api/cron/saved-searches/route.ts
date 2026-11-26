import { NextResponse } from "next/server";
import { searchOrchestrator } from "@/lib/search/orchestrator";
import { getSavedSearchesDueForRun, updateSavedSearchRun } from "@/lib/repositories/saved-searches";

export const maxDuration = 15; // Enforce function duration within Vercel Hobby plan limit

/**
 * Vercel Serverless Cron Handler for Saved Search Monitoring.
 * 
 * Scheduled in vercel.json for periodic execution (e.g., daily at 00:00 UTC).
 * Does NOT assume a persistent background server or continuous worker thread.
 * Enforces bearer token verification via CRON_SECRET for security.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Verify CRON_SECRET if configured in production environment
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized cron trigger" },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    // Fetch a bounded batch (max 5) of saved searches to execute within serverless timeout
    const dueSearches = await getSavedSearchesDueForRun(5, true);

    if (dueSearches.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No saved search monitors currently due for execution.",
        processed: 0,
        durationMs: Date.now() - startTime,
      });
    }

    const executionResults = [];

    for (const monitor of dueSearches) {
      try {
        const searchRes = await searchOrchestrator.search({
          query: monitor.query,
          exactPhrase: monitor.exact_phrase,
          userId: monitor.user_id,
          limit: 10,
          timeoutMs: 5000,
        });

        await updateSavedSearchRun(monitor.id, searchRes.totalFound, true);

        executionResults.push({
          id: monitor.id,
          name: monitor.name,
          totalFound: searchRes.totalFound,
          status: searchRes.status,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Execution failed";
        executionResults.push({
          id: monitor.id,
          name: monitor.name,
          error: msg,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: dueSearches.length,
      results: executionResults,
      durationMs: Date.now() - startTime,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unexpected cron error";
    return NextResponse.json(
      { error: errorMsg, durationMs: Date.now() - startTime },
      { status: 500 }
    );
  }
}
