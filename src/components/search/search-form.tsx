"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Search,
  Calendar,
  MessageSquare,
  Cpu,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockProviders } from "@/lib/mock-data";

const searchSchema = z.object({
  keyword: z.string().min(2, "Please enter at least 2 characters to search"),
  exactPhrase: z.boolean(),
  includePosts: z.boolean(),
  includePages: z.boolean(),
  includeVideos: z.boolean(),
  requireComments: z.boolean(),
  dateFilter: z.enum(["all", "24h", "7d", "30d", "custom"]),
  provider: z.string(),
  limit: z.string(),
});

export type SearchFormData = z.infer<typeof searchSchema>;

interface SearchFormProps {
  initialValues?: Partial<SearchFormData>;
  isCompact?: boolean;
}

export function SearchForm({
  initialValues,
  isCompact = false,
}: SearchFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      keyword: initialValues?.keyword || "",
      exactPhrase: initialValues?.exactPhrase ?? false,
      includePosts: initialValues?.includePosts ?? true,
      includePages: initialValues?.includePages ?? true,
      includeVideos: initialValues?.includeVideos ?? true,
      requireComments: initialValues?.requireComments ?? false,
      dateFilter: initialValues?.dateFilter || "all",
      provider: initialValues?.provider || "all",
      limit: initialValues?.limit || "20",
    },
  });

  const onSubmit = (data: SearchFormData) => {
    const params = new URLSearchParams();
    params.set("q", data.keyword.trim());
    if (data.exactPhrase) params.set("exact", "true");
    if (!data.includePosts) params.set("posts", "false");
    if (!data.includePages) params.set("pages", "false");
    if (!data.includeVideos) params.set("videos", "false");
    if (data.requireComments) params.set("has_comments", "true");
    if (data.dateFilter !== "all") params.set("date", data.dateFilter);
    if (data.provider !== "all") params.set("provider", data.provider);
    if (data.limit !== "20") params.set("limit", data.limit);

    router.push(`/search/results?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white rounded-xl border border-slate-200/90 p-5 md:p-6 shadow-xs space-y-5"
    >
      {/* Top Search Input Row */}
      <div className="space-y-2">
        <label
          htmlFor="keyword-input"
          className="block text-xs font-bold uppercase tracking-wider text-slate-700"
        >
          Facebook Public Search Query
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="keyword-input"
              {...register("keyword")}
              placeholder="Enter keywords, topics, organizations, or hashtags (e.g., Llama 4, NASA Artemis, Quantum)..."
              className="pl-10 h-11 text-sm bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-slate-300"
              error={!!errors.keyword}
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shrink-0 gap-2"
          >
            <Search className="w-4 h-4" />
            <span>Search Public Content</span>
          </Button>
        </div>
        {errors.keyword && (
          <p className="text-xs text-rose-500 font-medium">
            {errors.keyword.message}
          </p>
        )}
      </div>

      {/* Filter Row 1: Content Type and Exact Phrase */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-3 border-t border-slate-100">
        {/* Exact phrase toggle */}
        <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
          <input
            type="checkbox"
            id="exactPhrase"
            {...register("exactPhrase")}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
          />
          <label
            htmlFor="exactPhrase"
            className="text-xs font-medium text-slate-700 cursor-pointer select-none"
          >
            Exact phrase match <span className="text-slate-400 font-normal">(&ldquo;quote&rdquo;)</span>
          </label>
        </div>

        {/* Comments availability toggle */}
        <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
          <input
            type="checkbox"
            id="requireComments"
            {...register("requireComments")}
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
          />
          <label
            htmlFor="requireComments"
            className="text-xs font-medium text-slate-700 cursor-pointer select-none flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            <span>Available comments</span>
          </label>
        </div>

        {/* Date Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date Range
          </label>
          <select
            {...register("dateFilter")}
            className="w-full h-9.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Anytime (All records)</option>
            <option value="24h">Past 24 Hours</option>
            <option value="7d">Past 7 Days</option>
            <option value="30d">Past 30 Days</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {/* Provider Selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-slate-400" /> Search Provider
          </label>
          <select
            {...register("provider")}
            className="w-full h-9.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Configured Providers</option>
            {mockProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.status})
              </option>
            ))}
          </select>
        </div>

        {/* Maximum Results Limit */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" /> Max Results
          </label>
          <select
            {...register("limit")}
            className="w-full h-9.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="10">10 results</option>
            <option value="20">20 results</option>
            <option value="50">50 results</option>
            <option value="100">100 results</option>
          </select>
        </div>
      </div>

      {/* Filter Row 2: Content types checkboxes */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Include Content:
          </span>
          <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              {...register("includePosts")}
              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
            />
            <span>Public Posts</span>
          </label>
          <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              {...register("includePages")}
              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
            />
            <span>Facebook Pages</span>
          </label>
          <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              {...register("includeVideos")}
              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
            />
            <span>Videos & Reels</span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => reset()}
          className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 hover:underline cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Filters</span>
        </button>
      </div>
    </form>
  );
}
