import React from "react";
import Link from "next/link";
import {
  Search,
  Sliders,
  Sparkles,
  HelpCircle,
  FileText,
  Bookmark,
  TrendingUp,
  Shield,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchForm } from "@/components/search/search-form";
import { mockSavedSearches } from "@/lib/mock-data";

export default function GlobalSearchPage() {
  const suggestedKeywords = [
    { label: "Meta Llama 4", category: "AI Models" },
    { label: "NASA Artemis IV", category: "Space" },
    { label: "Solid State Battery", category: "CleanTech" },
    { label: "Galápagos Corals", category: "Nature" },
    { label: "Quantum Display", category: "Hardware" },
    { label: "CBDC Settlement", category: "Finance" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Universal Content Discovery Engine</span>
        </div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
          Global Facebook Public Search
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl">
          Search across public Facebook pages, posts, videos, and comments. Filter by date, provider, content type, and exact phrase matching.
        </p>
      </div>

      {/* Main Search Interface Component */}
      <SearchForm />

      {/* Suggested & Quick Queries */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-slate-500 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          Suggested queries:
        </span>
        {suggestedKeywords.map((item) => (
          <Link
            key={item.label}
            href={`/search/results?q=${encodeURIComponent(item.label)}`}
            className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <span>{item.label}</span>
            <span className="text-[10px] text-slate-400">({item.category})</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Saved Search Shortcuts */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-blue-600" />
                <span>Saved Search Profiles</span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Run pre-configured monitoring filters with a single click
              </p>
            </div>
            <Link
              href="/saved"
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Manage all ({mockSavedSearches.length})
            </Link>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {mockSavedSearches.map((s) => (
              <div
                key={s.id}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200 flex items-center justify-between transition-colors text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {s.query}
                  </p>
                </div>
                <Link
                  href={`/search/results?q=${encodeURIComponent(
                    s.query.replace(/"/g, "")
                  )}`}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-white text-blue-600 hover:bg-blue-50 border-blue-200 gap-1"
                  >
                    <span>Run Query</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Search Operators Tips Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span>Search Syntax Cheatsheet</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <div>
              <code className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono font-medium">
                &ldquo;exact phrase&rdquo;
              </code>
              <p className="text-[11px] text-slate-500 mt-1">
                Matches the exact word order without stemming variations.
              </p>
            </div>

            <div>
              <code className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono font-medium">
                from:NASA
              </code>
              <p className="text-[11px] text-slate-500 mt-1">
                Restricts search to posts authored by a specific Facebook page.
              </p>
            </div>

            <div>
              <code className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono font-medium">
                has:video
              </code>
              <p className="text-[11px] text-slate-500 mt-1">
                Filters results to public posts containing video content.
              </p>
            </div>

            <div>
              <code className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-mono font-medium">
                min_comments:100
              </code>
              <p className="text-[11px] text-slate-500 mt-1">
                Only returns posts with rich public discussion threads.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
