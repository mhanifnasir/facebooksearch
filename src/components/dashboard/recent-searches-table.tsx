"use client";

import React from "react";
import Link from "next/link";
import { SearchHistoryItem } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { ArrowUpRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function RecentSearchesTable({
  searches,
}: {
  searches: SearchHistoryItem[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
            <th className="py-2.5 px-3">Search Query</th>
            <th className="py-2.5 px-3">Filters Applied</th>
            <th className="py-2.5 px-3">Results</th>
            <th className="py-2.5 px-3">Provider</th>
            <th className="py-2.5 px-3">Executed</th>
            <th className="py-2.5 px-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {searches.map((item) => (
            <tr
              key={item.id}
              className="hover:bg-slate-50/80 transition-colors group"
            >
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {item.query}
                    </span>
                    {item.exactPhrase && (
                      <span className="ml-1.5 text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200">
                        Exact
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                {item.filtersSummary}
              </td>
              <td className="py-3 px-3 font-medium text-slate-900">
                {item.resultsCount.toLocaleString()}
              </td>
              <td className="py-3 px-3">
                <Badge variant="secondary" className="text-[10px]">
                  {item.provider}
                </Badge>
              </td>
              <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                {formatRelativeTime(item.executedAt)}
              </td>
              <td className="py-3 px-3 text-right">
                <Link
                  href={`/search/results?q=${encodeURIComponent(
                    item.query
                  )}&provider=${encodeURIComponent(item.provider)}`}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 px-2"
                  >
                    <span>View</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
