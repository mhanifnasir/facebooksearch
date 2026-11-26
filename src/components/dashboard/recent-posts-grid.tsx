"use client";

import React from "react";
import Link from "next/link";
import { FacebookPost } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import {
  MessageCircle,
  ThumbsUp,
  CheckCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function RecentPostsGrid({ posts }: { posts: FacebookPost[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className="bg-white border border-slate-200/90 rounded-xl p-4 flex flex-col justify-between hover:border-blue-300 hover:shadow-xs transition-all group"
        >
          <div>
            {/* Page Header */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden shrink-0 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.pageAvatar}
                    alt={post.pageName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-xs text-slate-900 truncate">
                      {post.pageName}
                    </span>
                    {post.pageVerified && (
                      <CheckCircle className="w-3 h-3 text-blue-600 fill-blue-600/20 shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    {formatRelativeTime(post.publishedAt)}
                  </span>
                </div>
              </div>

              <Badge
                variant={
                  post.contentType === "video" || post.contentType === "reel"
                    ? "navy"
                    : "secondary"
                }
                className="text-[10px] uppercase tracking-wider py-0 px-1.5"
              >
                {post.contentType}
              </Badge>
            </div>

            {/* Post Title & Snippet */}
            <Link
              href={`/posts/${post.id}`}
              className="block group-hover:text-blue-600 transition-colors"
            >
              <h4 className="font-semibold text-sm text-slate-900 line-clamp-1 mb-1.5 leading-snug">
                {post.title}
              </h4>
            </Link>
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {post.snippet}
            </p>
          </div>

          {/* Footer Metrics */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3.5 h-3.5 text-slate-400" />
                {post.reactionsCount.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-blue-600 font-medium">
                <MessageCircle className="w-3.5 h-3.5" />
                {post.commentCount.toLocaleString()}
              </span>
            </div>

            <Link
              href={`/posts/${post.id}`}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 hover:underline"
            >
              Details
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
