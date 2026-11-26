"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  CheckCircle,
  ExternalLink,
  Globe,
  FileText,
  Clock,
  RefreshCw,
  Inbox,
  ArrowUpRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getFacebookPagesAction } from "@/app/pages/actions";
import { FacebookPageRecord } from "@/lib/repositories/pages";
import { formatRelativeTime } from "@/lib/utils";

export default function FacebookPagesPage() {
  const [pages, setPages] = useState<FacebookPageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    let isMounted = true;

    async function loadPages() {
      try {
        const res = await getFacebookPagesAction();
        if (isMounted) setPages(res);
      } catch (err) {
        console.error("Failed to load Facebook pages:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPages();
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = [
    "all",
    "Software & Technology Company",
    "Government Organization / Aerospace",
    "Media & Technology Journalism",
    "Science, Nature & Exploration",
    "Colleges & Universities",
    "Financial News & Analytics",
  ];

  const filteredPages = pages.filter((page) => {
    const matchesSearch =
      page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (page.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (page.about || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || page.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Discovered Facebook Pages
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Directory of indexed public organizations, media outlets, and brand pages
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs">
            {pages.length} Discovered Pages
          </Badge>
          <Link href="/search">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs">
              <Search className="w-3.5 h-3.5" />
              <span>Discover Pages</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter pages by name, username or topics..."
            className="pl-9.5 text-xs bg-slate-50/50"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-10 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.filter((c) => c !== "all").map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Pages Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          <span>Loading indexed Facebook Pages directory...</span>
        </div>
      ) : filteredPages.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center text-xs">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <h3 className="font-bold text-slate-800 text-sm">No Facebook Pages Discovered Yet</h3>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">
              Execute searches targeting Facebook Pages or brand names to populate the directory.
            </p>
            <Link href="/search">
              <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                <Search className="w-3.5 h-3.5" />
                <span>Run Page Search</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPages.map((page) => (
            <Card
              key={page.id}
              className="border-slate-200 hover:border-blue-300 transition-all flex flex-col justify-between group shadow-xs"
            >
              <div>
                <CardHeader className="pb-3 flex flex-row items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        page.avatar_url ||
                        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80"
                      }
                      alt={page.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {page.name}
                      </CardTitle>
                      {page.verified && (
                        <CheckCircle className="w-3.5 h-3.5 text-blue-600 fill-blue-600/20 shrink-0" />
                      )}
                    </div>
                    {page.username && (
                      <span className="text-xs text-slate-500 font-mono block">
                        @{page.username}
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0 text-xs">
                  {page.category && (
                    <Badge variant="secondary" className="text-[10px]">
                      {page.category}
                    </Badge>
                  )}

                  <p className="text-slate-600 line-clamp-3 leading-relaxed">
                    {page.about || "Public Facebook Organization Page"}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Followers</span>
                      <span className="font-semibold text-slate-800">
                        {page.followers_count.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Posts Discovered</span>
                      <span className="font-semibold text-slate-800">
                        {page.posts_discovered.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Card Footer: External link */}
              <div className="p-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                {page.website ? (
                  <a
                    href={page.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-blue-600 flex items-center gap-1 text-[11px]"
                  >
                    <Globe className="w-3 h-3" />
                    <span>Website</span>
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400">Verified Organization</span>
                )}

                <a
                  href={page.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 cursor-pointer">
                    <span>Open Facebook Page</span>
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
