"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FacebookPost } from "@/lib/types";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  ExternalLink,
  MessageCircle,
  ThumbsUp,
  Share2,
  CheckCircle,
  Copy,
  Check,
  Shield,
  Layers,
  Video,
  FileText,
  Clock,
  Radio,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ResultCardProps {
  post: FacebookPost;
}

export function ResultCard({ post }: ResultCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(post.facebookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge variant="success" className="text-[10px] gap-1">
            <CheckCircle className="w-2.5 h-2.5" /> Verified Public
          </Badge>
        );
      case "restricted":
        return (
          <Badge variant="warning" className="text-[10px] gap-1">
            <Shield className="w-2.5 h-2.5" /> Rate Limited
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="secondary" className="text-[10px]">
            Archived Snapshot
          </Badge>
        );
      default:
        return (
          <Badge variant="default" className="text-[10px] gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Public Access
          </Badge>
        );
    }
  };

  return (
    <article className="bg-white rounded-xl border border-slate-200/90 hover:border-blue-400/80 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between group">
      <div>
        {/* Top Header: Page Name, Avatar, Content Type & Access Status */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-200 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.pageAvatar}
                alt={post.pageName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs md:text-sm text-slate-900 truncate">
                  {post.pageName}
                </span>
                {post.pageVerified && (
                  <CheckCircle className="w-3.5 h-3.5 text-blue-600 fill-blue-600/20 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {formatDate(post.publishedAt)}
                </span>
                <span>•</span>
                <span>{formatRelativeTime(post.publishedAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {getStatusBadge(post.dataAccessStatus)}
            <Badge
              variant="navy"
              className="text-[10px] uppercase tracking-wider font-semibold"
            >
              {post.contentType}
            </Badge>
          </div>
        </div>

        {/* Post Title */}
        <Link
          href={`/posts/${post.id}`}
          className="block group-hover:text-blue-600 transition-colors"
        >
          <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors mb-2 leading-snug">
            {post.title}
          </h3>
        </Link>

        {/* Snippet */}
        <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-3 line-clamp-3">
          {post.snippet}
        </p>

        {/* Media Thumbnail if video */}
        {post.videoThumbnail && (
          <div className="mb-3 rounded-lg overflow-hidden relative max-h-48 bg-slate-900 group/media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.videoThumbnail}
              alt={post.title}
              className="w-full h-48 object-cover opacity-90 group-hover/media:opacity-100 transition-opacity"
            />
            {post.videoDuration && (
              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono font-medium">
                {post.videoDuration}
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg group-hover/media:scale-110 transition-transform">
                <Video className="w-5 h-5 text-blue-600 fill-blue-600" />
              </div>
            </div>
          </div>
        )}

        {/* Provider and Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[11px] font-medium text-slate-400">
            Source Provider:
          </span>
          <Badge variant="secondary" className="text-[11px] bg-slate-100 text-slate-700">
            <Radio className="w-3 h-3 text-blue-500 mr-1" />
            {post.providers && post.providers.length > 1
              ? `Multi-Source (${post.providers.map(p => p.toUpperCase()).join(" + ")})`
              : post.providerName}
          </Badge>

          {post.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Card Footer: Metrics and Actions */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Engagement counts */}
        <div className="flex items-center gap-3 text-slate-600">
          <div className="flex items-center gap-1.5 bg-blue-50/80 text-blue-700 px-2 py-1 rounded-md font-medium border border-blue-100">
            <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>{post.commentCount.toLocaleString()} Available Comments</span>
          </div>

          <span className="flex items-center gap-1 text-slate-500">
            <ThumbsUp className="w-3.5 h-3.5" />
            {post.reactionsCount.toLocaleString()}
          </span>

          <span className="flex items-center gap-1 text-slate-500 hidden sm:flex">
            <Share2 className="w-3.5 h-3.5" />
            {post.sharesCount.toLocaleString()}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyUrl}
            title="Copy Facebook post link"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          <Link href={`/posts/${post.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium text-slate-700 hover:text-slate-900"
            >
              View Details
            </Button>
          </Link>

          {/* Open Original Facebook Post action */}
          <a
            href={post.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Button
              size="sm"
              className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-2xs"
            >
              <span>Open Original Facebook Post</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
      </div>
    </article>
  );
}
