"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  FileText,
  Users,
  Video,
  MessageSquare,
  Cpu,
  RefreshCw,
  Sparkles,
  Inbox,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { SearchActivityChart } from "@/components/dashboard/search-activity-chart";
import { ProviderStatusCards } from "@/components/dashboard/provider-status-card";
import { RecentSearchesTable } from "@/components/dashboard/recent-searches-table";
import { RecentPostsGrid } from "@/components/dashboard/recent-posts-grid";
import { getDashboardDataAction, DashboardData } from "@/app/dashboard/actions";
import { mockProviders } from "@/lib/mock-data";
import { FacebookPost, SearchHistoryItem } from "@/lib/types";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const res = await getDashboardDataAction();
        if (isMounted) {
          setData(res);
        }
      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = data?.metrics || {
    totalSearches: 0,
    totalResults: 0,
    totalPages: 0,
    totalVideos: 0,
    totalComments: 0,
    apiUsagePercent: 0,
    apiCalls: 0,
  };

  // Convert raw recent searches to SearchHistoryItem
  const recentSearches: SearchHistoryItem[] = (data?.recentSearches || []).map((s) => ({
    id: s.id,
    query: s.query,
    exactPhrase: false,
    filtersSummary: `Provider: ${s.provider}`,
    resultsCount: s.resultsCount,
    provider: s.provider,
    executedAt: s.executedAt,
    executionTimeMs: 250,
    status: (s.status === "partial" ? "partial" : "completed") as "completed" | "partial",
  }));

  // Convert raw recent posts to FacebookPost
  const recentPosts: FacebookPost[] = (data?.recentPosts || []).map((p) => ({
    id: p.id,
    title: p.title,
    snippet: p.snippet,
    fullText: p.snippet,
    pageName: p.pageName,
    pageId: "facebook-page",
    pageAvatar:
      p.pageAvatar ||
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
    pageVerified: true,
    pageFollowers: 0,
    facebookUrl: p.facebookUrl,
    provider: "tavily",
    providerName: "Tavily Search API",
    publishedAt: p.publishedAt,
    discoveredAt: p.publishedAt,
    contentType: p.contentType as any,
    dataAccessStatus: "verified",
    commentCount: p.commentCount,
    reactionsCount: p.reactionsCount,
    sharesCount: 0,
    tags: ["Facebook", p.contentType],
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Social Intelligence Dashboard
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Real-time indexing metrics and discovered public Facebook content feeds
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/history">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Audit History</span>
            </Button>
          </Link>
          <Link href="/search">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs">
              <Search className="w-3.5 h-3.5" />
              <span>Launch New Search</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 6 Required Dashboard Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <StatCard
          title="Total Searches"
          value={loading ? "..." : metrics.totalSearches.toLocaleString()}
          change={metrics.totalSearches > 0 ? 12 : undefined}
          changeLabel="searches logged"
          icon={Search}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />

        <StatCard
          title="Total Results"
          value={loading ? "..." : metrics.totalResults.toLocaleString()}
          change={metrics.totalResults > 0 ? 8 : undefined}
          changeLabel="records cached"
          icon={FileText}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />

        <StatCard
          title="Facebook Pages"
          value={loading ? "..." : metrics.totalPages.toLocaleString()}
          changeLabel="monitored directory"
          icon={Users}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />

        <StatCard
          title="Videos Found"
          value={loading ? "..." : metrics.totalVideos.toLocaleString()}
          changeLabel="Watch & Reels"
          icon={Video}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />

        <StatCard
          title="Available Comments"
          value={loading ? "..." : metrics.totalComments.toLocaleString()}
          changeLabel="Graph Edge"
          icon={MessageSquare}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />

        <StatCard
          title="API Usage"
          value={loading ? "..." : `${metrics.apiUsagePercent}%`}
          changeLabel={`${metrics.apiCalls} calls`}
          icon={Cpu}
          iconColor="text-rose-600"
          iconBg="bg-rose-50"
        />
      </div>

      {/* Main Visuals Row: Chart & Provider Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SearchActivityChart data={data?.activityData || []} />
        </div>
        <div>
          <ProviderStatusCards providers={mockProviders} />
        </div>
      </div>

      {/* Bottom Row: Recent Searches Table and Recent Discovered Posts */}
      <div className="grid grid-cols-1 gap-6">
        {/* Recent Searches Table Card */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Recent Searches
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit trail of recent Facebook queries performed by your organization
              </p>
            </div>
            <Link href="/history">
              <Button variant="ghost" size="sm" className="text-xs text-blue-600 gap-1 hover:text-blue-700">
                <span>View Full Audit</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentSearches.length > 0 ? (
              <RecentSearchesTable searches={recentSearches} />
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">No searches performed yet</p>
                <p className="mt-1 text-slate-400">Launch a search above to populate your real-time audit trail.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Discovered Posts Grid Card */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Recently Discovered Public Posts
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Fresh content indexed across verified public brand feeds and timeline updates
              </p>
            </div>
            <Link href="/search/results?q=all">
              <Button variant="ghost" size="sm" className="text-xs text-blue-600 gap-1 hover:text-blue-700">
                <span>Explore All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentPosts.length > 0 ? (
              <RecentPostsGrid posts={recentPosts} />
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">No discovered posts in database cache</p>
                <p className="mt-1 text-slate-400">Run a search from the search console to index live public Facebook posts.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
