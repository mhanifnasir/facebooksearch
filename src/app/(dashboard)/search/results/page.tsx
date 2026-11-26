"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  BookmarkPlus,
  SlidersHorizontal,
  FileText,
  Video,
  MessageSquare,
  Sparkles,
  Cpu,
  Info,
  AlertTriangle,
  RotateCw,
  HelpCircle,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ResultCard } from "@/components/search/result-card";
import { LoadingSkeleton } from "@/components/search/loading-skeleton";
import { EmptyState } from "@/components/search/empty-state";
import { ErrorState } from "@/components/search/error-state";
import { executeSearchAction, retryProviderJobAction } from "@/app/search/actions";
import { createSavedSearchAction } from "@/app/saved/actions";
import {
  NormalizedSearchResult,
  SearchStatus,
  ProviderJobSummary,
} from "@/lib/providers/types";
import { FacebookPost } from "@/lib/types";

function SearchResultsContent() {
  const searchParams = useSearchParams();

  const query = searchParams.get("q") || "";
  const providerParam = searchParams.get("provider") || "all";
  const exactParam = searchParams.get("exact") === "true";
  const hasCommentsParam = searchParams.get("has_comments") === "true";
  const limitParam = parseInt(searchParams.get("limit") || "20", 10);
  const dateParam = (searchParams.get("date") as any) || "all";

  // State controls
  const [activeTab, setActiveTab] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [innerFilterTerm, setInnerFilterTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;
  const [savedSearchAlert, setSavedSearchAlert] = useState(false);

  // Live search state
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<NormalizedSearchResult[]>([]);
  const [activeProviders, setActiveProviders] = useState<string[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("completed");
  const [jobSummaries, setJobSummaries] = useState<ProviderJobSummary[]>([]);
  const [executionTime, setExecutionTime] = useState<number>(342);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function performSearch() {
      setLoading(true);
      try {
        const output = await executeSearchAction({
          query: query || "all",
          exactPhrase: exactParam,
          requireComments: hasCommentsParam,
          provider: providerParam,
          limit: limitParam,
          dateFilter: dateParam,
        });

        if (isMounted) {
          setResults(output.results);
          setActiveProviders(output.activeProviders);
          setSearchStatus(output.status);
          setJobSummaries(output.jobSummaries || []);
          setExecutionTime(output.executionTimeMs);
          setIsFallback(output.isFallback);
          setNotes(output.notes);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error("Search execution error:", err);
        if (isMounted) setSearchStatus("failed");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    performSearch();

    return () => {
      isMounted = false;
    };
  }, [query, providerParam, exactParam, hasCommentsParam, limitParam, dateParam]);

  // Handler to retry a specific failed provider
  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      const retryOutput = await retryProviderJobAction(jobId);
      if (retryOutput && retryOutput.results.length > 0) {
        setResults((prev) => [...retryOutput.results, ...prev]);
        setSearchStatus("completed");
      }
    } catch (err) {
      console.error("Failed to retry provider job:", err);
    } finally {
      setRetryingJobId(null);
    }
  };

  // Convert normalized results to FacebookPost type
  const formattedPosts: FacebookPost[] = useMemo(() => {
    let posts: FacebookPost[] = results.map((r) => ({
      id: r.id,
      title: r.title,
      snippet: r.snippet,
      fullText: r.fullText || r.snippet,
      pageName: r.pageName,
      pageId: r.pageUsername?.replace("@", "") || "facebook-page",
      pageAvatar:
        r.pageAvatar ||
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
      pageVerified: r.pageVerified ?? false,
      pageFollowers: 0,
      facebookUrl: r.url,
      originalUrl: r.originalUrl,
      provider: r.provider,
      providers: r.providers?.map((p) => p.toString()) || [r.provider],
      providerName: r.providerName,
      publishedAt: r.publishedAt || new Date().toISOString(),
      discoveredAt: new Date().toISOString(),
      contentType: r.contentType as any,
      dataAccessStatus: r.dataAccessStatus,
      commentCount: r.commentCount || 0,
      reactionsCount: r.reactionsCount || 0,
      sharesCount: r.sharesCount || 0,
      tags: ["Facebook", r.contentType, r.pageName.split(" ")[0]],
      rawPayload: r.raw,
    }));

    // Filter by Tab
    if (activeTab === "posts") {
      posts = posts.filter((p) => p.contentType === "post");
    } else if (activeTab === "pages") {
      posts = posts.filter((p) => p.contentType === "page");
    } else if (activeTab === "videos") {
      posts = posts.filter((p) => p.contentType === "video" || p.contentType === "reel");
    } else if (activeTab === "with_comments") {
      posts = posts.filter((p) => p.commentCount > 0);
    }

    // Filter within retrieved results by search keyword
    if (innerFilterTerm.trim()) {
      const term = innerFilterTerm.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.snippet.toLowerCase().includes(term) ||
          p.pageName.toLowerCase().includes(term)
      );
    }

    // Sorting
    if (sortBy === "comments_desc") {
      posts.sort((a, b) => b.commentCount - a.commentCount);
    } else if (sortBy === "reactions_desc") {
      posts.sort((a, b) => b.reactionsCount - a.reactionsCount);
    } else if (sortBy === "date_desc") {
      posts.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }

    return posts;
  }, [results, activeTab, innerFilterTerm, sortBy]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(formattedPosts.length / pageSize));
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return formattedPosts.slice(start, start + pageSize);
  }, [formattedPosts, currentPage, pageSize]);

  const handleSaveSearch = async () => {
    try {
      await createSavedSearchAction({
        name: query || "Custom Facebook Search",
        query: query || "all",
        exactPhrase: exactParam,
      });
      setSavedSearchAlert(true);
      setTimeout(() => setSavedSearchAlert(false), 3000);
    } catch {
      setSavedSearchAlert(true);
      setTimeout(() => setSavedSearchAlert(false), 3000);
    }
  };

  const failedJobs = jobSummaries.filter((j) => j.status === "failed");

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="default" className="text-xs">
                Multi-Provider Orchestrator
              </Badge>
              {searchStatus === "completed" && (
                <Badge variant="success" className="text-xs">
                  Status: Completed
                </Badge>
              )}
              {searchStatus === "partial" && (
                <Badge variant="warning" className="text-xs font-semibold">
                  Status: Partial Results
                </Badge>
              )}
              {searchStatus === "failed" && (
                <Badge variant="destructive" className="text-xs">
                  Status: Failed
                </Badge>
              )}
              {exactParam && (
                <Badge variant="outline" className="text-xs border-blue-400 text-blue-700">
                  Exact Match
                </Badge>
              )}
              {providerParam !== "all" && (
                <Badge variant="secondary" className="text-xs capitalize">
                  Provider: {providerParam.replace("_", " ")}
                </Badge>
              )}
              {activeProviders.length > 0 && (
                <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300 bg-emerald-50">
                  Engines: {activeProviders.join(", ")}
                </Badge>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              {query ? `Results for “${query}”` : "All Discovered Public Facebook Content"}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Showing {formattedPosts.length} indexed records • Execution: {executionTime}ms • Limit: {limitParam}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveSearch}
              className="gap-1.5 text-xs text-slate-700 cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>{savedSearchAlert ? "Search Saved!" : "Save Search"}</span>
            </Button>

            <Link href="/search">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs cursor-pointer">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Refine Query</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Partial Results Alert with Inline Retry Action */}
        {searchStatus === "partial" && failedJobs.length > 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Partial Search Results Notice</span>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  One or more providers encountered an error or reached rate limits (
                  {failedJobs.map((j) => `${j.provider.toUpperCase()}: ${j.errorMessage || "Failed"}`).join(" • ")}
                  ). Other providers completed successfully and returned valid results.
                </p>
              </div>
            </div>
            {failedJobs.map((job) =>
              job.id ? (
                <Button
                  key={job.id}
                  size="sm"
                  variant="outline"
                  onClick={() => handleRetryJob(job.id!)}
                  disabled={retryingJobId === job.id}
                  className="shrink-0 h-8 text-xs font-semibold border-amber-300 bg-white hover:bg-amber-100 text-amber-900 gap-1.5 cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${retryingJobId === job.id ? "animate-spin" : ""}`} />
                  <span>Retry {job.provider.toUpperCase()}</span>
                </Button>
              ) : null
            )}
          </div>
        )}

        {/* Informational Notes Banner */}
        {isFallback && notes.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-lg text-blue-900 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Multi-Provider Live Discovery Engine Active</span>
              <p className="text-blue-800 text-[11px] leading-relaxed">
                {notes[0]} Add <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-950 font-mono text-[10px]">TAVILY_API_KEY</code> or <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-950 font-mono text-[10px]">BRAVE_SEARCH_API_KEY</code> in <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-950 font-mono text-[10px]">.env.local</code> for real-time external web indexing.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs, Search Within Results, and Sort Controls */}
      <div className="space-y-3 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Content filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => { setActiveTab("all"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              All Content ({results.length})
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("posts"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === "posts"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Posts</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("pages"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === "pages"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Pages</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("videos"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === "videos"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Video className="w-3 h-3" />
              <span>Videos</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("with_comments"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
                activeTab === "with_comments"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>With Comments</span>
            </button>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 text-xs shrink-0">
            <span className="text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              <option value="relevance">Most Relevant</option>
              <option value="date_desc">Newest First</option>
              <option value="comments_desc">Most Comments</option>
              <option value="reactions_desc">Most Reactions</option>
            </select>
          </div>
        </div>

        {/* Search Within Retrieved Results Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={innerFilterTerm}
            onChange={(e) => {
              setInnerFilterTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search within retrieved results (title, snippet, page name)..."
            className="pl-9 h-9 text-xs bg-white"
          />
        </div>
      </div>

      {/* Main Results Container Rendering States */}
      {loading ? (
        <LoadingSkeleton count={3} />
      ) : searchStatus === "failed" && formattedPosts.length === 0 ? (
        <ErrorState onRetry={() => window.location.reload()} />
      ) : formattedPosts.length === 0 ? (
        <EmptyState
          title={`No results matching "${query || "filters"}"`}
          description="Try removing restrictive filters, expanding the date range, or selecting another provider."
          actionHref="/search"
          actionLabel="Adjust Search Filters"
        />
      ) : (
        <div className="space-y-4">
          {paginatedPosts.map((post) => (
            <ResultCard key={post.id} post={post} />
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-800">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-800">
                  {Math.min(currentPage * pageSize, formattedPosts.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-800">
                  {formattedPosts.length}
                </span>{" "}
                results
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 text-xs gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </Button>

                <span className="px-3 py-1 font-semibold text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 text-xs gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500 text-xs">
          Loading Multi-Provider Search Results...
        </div>
      }
    >
      <SearchResultsContent />
    </Suspense>
  );
}
