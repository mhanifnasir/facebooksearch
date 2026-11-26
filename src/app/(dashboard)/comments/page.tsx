"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  ThumbsUp,
  ExternalLink,
  Filter,
  CheckCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Inbox,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getDiscoveredCommentsAction } from "@/app/comments/actions";
import { FacebookCommentRecord } from "@/lib/repositories/facebook-comments";
import { formatRelativeTime } from "@/lib/utils";

export default function CommentsPage() {
  const [comments, setComments] = useState<FacebookCommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSentiment, setSelectedSentiment] = useState<string>("all");

  useEffect(() => {
    let isMounted = true;

    async function loadComments() {
      try {
        const res = await getDiscoveredCommentsAction();
        if (isMounted) setComments(res);
      } catch (err) {
        console.error("Failed to load comments:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadComments();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredComments = comments.filter((c) => {
    const matchesSearch =
      c.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.author_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.post_title || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSentiment =
      selectedSentiment === "all" || c.sentiment === selectedSentiment;

    return matchesSearch && matchesSentiment;
  });

  const positiveCount = comments.filter((c) => c.sentiment === "positive").length;
  const neutralCount = comments.filter((c) => c.sentiment === "neutral").length;
  const negativeCount = comments.filter((c) => c.sentiment === "negative").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Facebook Public Comments Explorer
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Search and inspect authentic public discussion comments extracted via the official Graph API comments edge
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs">
            {comments.length} Comments Retrieved
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Official Graph Edge Only
          </Badge>
        </div>
      </div>

      {/* Sentiment Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Positive Sentiment
            </span>
            <span className="text-2xl font-bold text-emerald-900">
              {positiveCount}
            </span>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md font-medium">
            Active
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
              Neutral / Objective
            </span>
            <span className="text-2xl font-bold text-slate-900">
              {neutralCount}
            </span>
          </div>
          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-md font-medium">
            Standard
          </span>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">
              Critical / Concerns
            </span>
            <span className="text-2xl font-bold text-rose-900">
              {negativeCount}
            </span>
          </div>
          <span className="text-xs bg-rose-100 text-rose-800 px-2 py-1 rounded-md font-medium">
            Alerts
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search comments by text, author or post topic..."
            className="pl-9.5 text-xs bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            type="button"
            onClick={() => setSelectedSentiment("all")}
            className={`px-3 py-2 rounded-lg font-medium cursor-pointer transition-colors ${
              selectedSentiment === "all"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All Sentiments
          </button>
          <button
            type="button"
            onClick={() => setSelectedSentiment("positive")}
            className={`px-3 py-2 rounded-lg font-medium cursor-pointer transition-colors ${
              selectedSentiment === "positive"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Positive
          </button>
          <button
            type="button"
            onClick={() => setSelectedSentiment("neutral")}
            className={`px-3 py-2 rounded-lg font-medium cursor-pointer transition-colors ${
              selectedSentiment === "neutral"
                ? "bg-slate-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Neutral
          </button>
          <button
            type="button"
            onClick={() => setSelectedSentiment("negative")}
            className={`px-3 py-2 rounded-lg font-medium cursor-pointer transition-colors ${
              selectedSentiment === "negative"
                ? "bg-rose-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Negative
          </button>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          <span>Loading extracted discussion comments...</span>
        </div>
      ) : filteredComments.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center text-xs">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <h3 className="font-bold text-slate-800 text-sm">No Comments Retrieved Yet</h3>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">
              When posts with available comments are discovered through the Meta Graph API comments edge, authentic comment threads will appear here.
            </p>
            <Link href="/search?has_comments=true">
              <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                <Search className="w-3.5 h-3.5" />
                <span>Find Posts with Comments</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {filteredComments.map((comment) => (
            <Card
              key={comment.id}
              className="border-slate-200/90 hover:border-blue-300 transition-all p-4.5 space-y-3 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        comment.author_avatar ||
                        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80"
                      }
                      alt={comment.author_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {comment.author_name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ID: {comment.id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      comment.sentiment === "positive"
                        ? "success"
                        : comment.sentiment === "negative"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-[10px] capitalize"
                  >
                    {comment.sentiment}
                  </Badge>
                  <span className="text-slate-400 text-[11px]">
                    {formatRelativeTime(comment.published_at)}
                  </span>
                </div>
              </div>

              <p className="text-xs md:text-sm text-slate-700 leading-relaxed pl-10.5">
                {comment.text}
              </p>

              <div className="pl-10.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <ThumbsUp className="w-3 h-3 text-slate-400" />
                    {comment.likes_count} Likes
                  </span>
                  <span>{comment.replies_count} Replies</span>
                </div>

                <Link
                  href={`/posts/${comment.post_id}`}
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium text-[11px]"
                >
                  <span>View Parent Post</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
