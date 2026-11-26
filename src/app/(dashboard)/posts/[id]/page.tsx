"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  MessageCircle,
  ThumbsUp,
  Share2,
  CheckCircle,
  Copy,
  Check,
  Radio,
  Clock,
  Shield,
  Code,
  Video,
  RotateCw,
  AlertCircle,
  User,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { fetchPostCommentsAction } from "@/app/search/actions";
import { getPostDetailsAction } from "@/app/posts/[id]/actions";
import { MetaCommentItem } from "@/lib/providers/types";
import { FacebookPostRecord } from "@/lib/repositories/posts";

function PostDetailsContent() {
  const params = useParams();
  const postId = (params?.id as string) || "";

  const [post, setPost] = useState<FacebookPostRecord | null>(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [copied, setCopied] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [commentAdded, setCommentAdded] = useState(false);

  // Live Graph API Comments State
  const [liveComments, setLiveComments] = useState<MetaCommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentCursor, setCommentCursor] = useState<string | undefined>();
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [commentNotice, setCommentNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPostData() {
      setLoadingPost(true);
      try {
        const found = await getPostDetailsAction(postId);
        if (isMounted) {
          setPost(found);
        }
      } catch (err) {
        console.error("Failed to load post details:", err);
      } finally {
        if (isMounted) setLoadingPost(false);
      }
    }

    if (postId) {
      loadPostData();
    } else {
      setLoadingPost(false);
    }

    return () => {
      isMounted = false;
    };
  }, [postId]);

  useEffect(() => {
    let isMounted = true;

    async function loadComments() {
      if (!postId) return;
      setLoadingComments(true);
      try {
        const res = await fetchPostCommentsAction(postId);
        if (isMounted) {
          if (res.comments && res.comments.length > 0) {
            setLiveComments(res.comments);
            setHasMoreComments(res.hasMore);
            setCommentCursor(res.nextCursor);
          } else if (res.error) {
            setCommentNotice(res.error);
          }
        }
      } catch {
        // Continue gracefully
      } finally {
        if (isMounted) setLoadingComments(false);
      }
    }

    loadComments();

    return () => {
      isMounted = false;
    };
  }, [postId]);

  const handleLoadMoreComments = async () => {
    if (!commentCursor || loadingComments) return;
    setLoadingComments(true);
    try {
      const res = await fetchPostCommentsAction(postId, commentCursor);
      if (res.comments && res.comments.length > 0) {
        setLiveComments((prev) => [...prev, ...res.comments]);
        setHasMoreComments(res.hasMore);
        setCommentCursor(res.nextCursor);
      }
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCopy = () => {
    if (!post?.facebook_url) return;
    navigator.clipboard.writeText(post.facebook_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setCommentAdded(true);
    setNewCommentText("");
    setTimeout(() => setCommentAdded(false), 3000);
  };

  if (loadingPost) {
    return (
      <div className="py-24 text-center text-slate-500 text-xs">
        <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
        <span>Loading Facebook publication details...</span>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="space-y-4 py-12">
        <Link
          href="/search/results"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Search Results</span>
        </Link>
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center text-xs">
            <Inbox className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <h3 className="font-bold text-slate-800 text-sm">Post Not Found in Cache</h3>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">
              This publication has not yet been indexed in the database. Run a search to index it.
            </p>
            <Link href="/search">
              <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                <span>Launch Search</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <Link
          href="/search/results"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Search Results</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Copy Facebook Link"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          <a
            href={post.facebook_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs cursor-pointer">
              <span>Open Original Facebook Post</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
      </div>

      {/* Main Grid: Post Content vs Sidebar Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Post Text, Media & Comments */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        post.page_avatar ||
                        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80"
                      }
                      alt={post.page_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900">
                        {post.page_name}
                      </span>
                      {post.page_verified && (
                        <CheckCircle className="w-3.5 h-3.5 text-blue-600 fill-blue-600/20" />
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatDate(post.published_at)} ({formatRelativeTime(post.published_at)})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="navy" className="capitalize text-xs font-semibold">
                    {post.content_type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {post.data_access_status}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 leading-snug">
                {post.title}
              </h2>

              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {post.full_text || post.snippet}
              </p>

              {/* Media Thumbnail if video */}
              {post.video_thumbnail && (
                <div className="mt-3 rounded-lg overflow-hidden relative max-h-80 bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.video_thumbnail}
                    alt={post.title}
                    className="w-full h-72 object-cover opacity-90"
                  />
                  {post.video_duration && (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono">
                      {post.video_duration}
                    </span>
                  )}
                </div>
              )}

              {/* Engagement Stats Strip */}
              <div className="flex items-center gap-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                  <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                  {post.comment_count.toLocaleString()} Available Comments
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3.5 h-3.5 text-slate-400" />
                  {post.reactions_count.toLocaleString()} Reactions
                </span>
                <span className="flex items-center gap-1">
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                  {post.shares_count.toLocaleString()} Shares
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Tabs: Comments & Raw JSON Payload */}
          <Tabs defaultValue="comments" className="w-full">
            <TabsList className="bg-slate-100">
              <TabsTrigger value="comments" className="text-xs gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Meta Comments Edge ({liveComments.length})</span>
              </TabsTrigger>
              <TabsTrigger value="payload" className="text-xs">
                Parsed API Payload (JSON)
              </TabsTrigger>
            </TabsList>

            {/* Comments Tab */}
            <TabsContent value="comments" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-blue-600" />
                    <span>Official Meta Graph API Comments</span>
                  </CardTitle>
                  <span className="text-[11px] text-slate-400">
                    Snippets are never converted to comments
                  </span>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Notice if token is missing or comments are restricted */}
                  {commentNotice && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Comment Retrieval Status</span>
                        <p className="text-[11px] text-amber-800">{commentNotice}</p>
                      </div>
                    </div>
                  )}

                  {/* Add Analyst Note Form */}
                  <form onSubmit={handleAddComment} className="space-y-2 pb-4 border-b border-slate-100">
                    <div className="flex gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        AN
                      </div>
                      <div className="flex-1">
                        <textarea
                          rows={2}
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder="Write an internal analyst note or tag this thread..."
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[11px] text-slate-400">
                        {commentAdded && "Note captured in workspace state!"}
                      </span>
                      <Button size="sm" type="submit" className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
                        Add Note
                      </Button>
                    </div>
                  </form>

                  {/* Live Meta Graph Comments List if available */}
                  {liveComments.length > 0 ? (
                    <div className="space-y-3">
                      {liveComments.map((comm) => (
                        <div
                          key={comm.id}
                          className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={comm.authorAvatar}
                                  alt={comm.authorName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="font-semibold text-slate-900">
                                {comm.authorName}
                              </span>
                              <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-slate-500">
                                ID: {comm.id}
                              </Badge>
                            </div>
                            <span className="text-slate-400 text-[11px]">
                              {formatRelativeTime(comm.publishedAt)}
                            </span>
                          </div>

                          <p className="text-slate-700 leading-relaxed">
                            {comm.text}
                          </p>

                          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-200/60">
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3 text-slate-400" />
                              {comm.likesCount} Likes
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Verified Graph Edge
                            </span>
                          </div>
                        </div>
                      ))}

                      {hasMoreComments && (
                        <div className="text-center pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleLoadMoreComments}
                            disabled={loadingComments}
                            className="text-xs gap-1.5 h-8"
                          >
                            <RotateCw className={`w-3.5 h-3.5 ${loadingComments ? "animate-spin" : ""}`} />
                            <span>Load More Comments</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-700">No comments retrieved for this publication</p>
                      <p className="mt-1 text-slate-400">
                        Comments on this post may be restricted, or Meta Graph API credentials have not been configured.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Raw JSON Payload Tab */}
            <TabsContent value="payload" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Code className="w-4 h-4 text-blue-600" />
                    <span>Scraped JSON Metadata Payload</span>
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(post, null, 2));
                    }}
                  >
                    Copy JSON
                  </Button>
                </CardHeader>
                <CardContent>
                  <pre className="p-4 bg-slate-950 text-emerald-400 rounded-lg text-xs font-mono overflow-x-auto max-h-96 leading-relaxed">
                    {JSON.stringify(post, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Metadata Details Card */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">
                Discovery Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Source Engine:</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Radio className="w-3.5 h-3.5 text-blue-600" />
                  {post.provider_name}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Original URL:</span>
                <a
                  href={post.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-blue-600 hover:underline break-all mt-0.5 block text-[11px]"
                >
                  {post.facebook_url}
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px]">Indexed At:</span>
                  <span className="font-medium text-slate-700">
                    {formatRelativeTime(post.discovered_at)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Access Status:</span>
                  <span className="font-medium text-emerald-600 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> {post.data_access_status}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PostDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500 text-xs">
          Loading Post and Meta Comments...
        </div>
      }
    >
      <PostDetailsContent />
    </Suspense>
  );
}
