"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Video,
  Play,
  Eye,
  MessageCircle,
  ThumbsUp,
  ExternalLink,
  Clock,
  Sparkles,
  Search,
  Filter,
  CheckCircle,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getFacebookVideosAction } from "@/app/videos/actions";
import { FacebookPostRecord } from "@/lib/repositories/posts";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export default function VideosPage() {
  const [videos, setVideos] = useState<FacebookPostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadVideos() {
      try {
        const res = await getFacebookVideosAction();
        if (isMounted) setVideos(res);
      } catch (err) {
        console.error("Failed to load Facebook videos:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadVideos();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredVideos = videos.filter((v) =>
    v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.snippet.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.page_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Facebook Videos & Reels Explorer
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Browse discovered public video broadcasts, reels, tutorials, and press updates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="navy" className="text-xs">
            {videos.length} Videos Discovered
          </Badge>
          <Link href="/search?videos=true">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs">
              <Search className="w-3.5 h-3.5" />
              <span>Search Facebook Videos</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Compliance Notice Banner */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
        <span>
          Compliance policy: Facebook videos and reels are never downloaded or rehosted. Direct external links point to official Facebook Watch players.
        </span>
        <Badge variant="outline" className="text-[10px] text-slate-500">
          Official Player Links Only
        </Badge>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search videos by title, page or description..."
            className="pl-9.5 text-xs bg-slate-50/50"
          />
        </div>
      </div>

      {/* Videos Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          <span>Loading indexed Facebook videos...</span>
        </div>
      ) : filteredVideos.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center text-xs">
            <Video className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <h3 className="font-bold text-slate-800 text-sm">No Facebook Videos Discovered Yet</h3>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">
              Execute a search with the Video filter enabled to discover public broadcasts and reels.
            </p>
            <Link href="/search">
              <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                <Search className="w-3.5 h-3.5" />
                <span>Run Video Search</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredVideos.map((vid) => (
            <Card
              key={vid.id}
              className="overflow-hidden hover:border-blue-400 transition-all flex flex-col justify-between group shadow-xs"
            >
              <div>
                {/* Thumbnail Container */}
                <div className="relative aspect-video bg-black overflow-hidden group/vid">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      vid.video_thumbnail ||
                      "https://images.unsplash.com/photo-1579208575657-c595a05383b7?w=800&auto=format&fit=crop&q=80"
                    }
                    alt={vid.title}
                    className="w-full h-full object-cover opacity-85 group-hover/vid:opacity-95 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg group-hover/vid:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Badges on Thumbnail */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <Badge variant="navy" className="text-[10px] uppercase font-bold py-0.5">
                      {vid.content_type}
                    </Badge>
                  </div>

                  {vid.video_duration && (
                    <div className="absolute bottom-3 right-3 bg-black/80 text-white px-2 py-0.5 rounded text-[11px] font-mono">
                      {vid.video_duration}
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-3">
                  {/* Page Info */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            vid.page_avatar ||
                            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80"
                          }
                          alt={vid.page_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-semibold text-slate-800">
                        {vid.page_name}
                      </span>
                      {vid.page_verified && (
                        <CheckCircle className="w-3 h-3 text-blue-600 fill-blue-600/20 shrink-0" />
                      )}
                    </div>
                    <span className="text-slate-400 text-[11px]">
                      {formatRelativeTime(vid.published_at)}
                    </span>
                  </div>

                  {/* Title & Snippet */}
                  <div>
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1">
                      {vid.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {vid.snippet}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4 text-slate-500 text-[11px]">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {vid.reactions_count.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {vid.comment_count.toLocaleString()}
                  </span>
                </div>

                <a
                  href={vid.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-2xs">
                    <span>Watch on Facebook</span>
                    <ExternalLink className="w-3.5 h-3.5" />
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
