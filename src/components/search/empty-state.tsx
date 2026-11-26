import React from "react";
import Link from "next/link";
import { SearchX, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title = "No Public Facebook Content Found",
  description = "No posts or pages matched your exact filter criteria. Try broadening your keywords, unchecking exact match, or switching search providers.",
  actionHref = "/search",
  actionLabel = "Modify Search Filters",
}: {
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-xs">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        <SearchX className="w-7 h-7" />
      </div>
      <h3 className="font-bold text-lg text-slate-900 mb-2">{title}</h3>
      <p className="text-xs md:text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      <Link href={actionHref}>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{actionLabel}</span>
        </Button>
      </Link>
    </div>
  );
}
