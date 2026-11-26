"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  Search,
  ArrowUpRight,
  Download,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  RefreshCw,
  Cpu,
  CheckCircle,
  Inbox,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  getUserSearchHistoryAction,
  deleteSearchHistoryItemAction,
  clearAllSearchHistoryAction,
} from "@/app/history/actions";
import { SearchRecord } from "@/lib/repositories/searches";

export default function SearchHistoryPage() {
  const [historyItems, setHistoryItems] = useState<SearchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState("");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      try {
        const items = await getUserSearchHistoryAction();
        if (isMounted) setHistoryItems(items);
      } catch (err) {
        console.error("Failed to load search history:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredHistory = historyItems.filter(
    (h) =>
      h.query.toLowerCase().includes(filterTerm.toLowerCase()) ||
      h.provider.toLowerCase().includes(filterTerm.toLowerCase()) ||
      (h.filters_summary || "").toLowerCase().includes(filterTerm.toLowerCase())
  );

  const handleDeleteItem = async (id: string) => {
    setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    await deleteSearchHistoryItemAction(id);
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear your search audit history?")) {
      setHistoryItems([]);
      await clearAllSearchHistoryAction();
    }
  };

  const handleExport = (format: "csv" | "json") => {
    const dataStr =
      format === "json"
        ? "data:text/json;charset=utf-8," +
          encodeURIComponent(JSON.stringify(historyItems, null, 2))
        : "data:text/csv;charset=utf-8," +
          encodeURIComponent(
            "ID,Query,Exact,Filters,Results,Provider,ExecutedAt\n" +
              historyItems
                .map(
                  (h) =>
                    `"${h.id}","${h.query}","${h.exact_phrase}","${h.filters_summary || ""}","${h.results_count}","${h.provider}","${h.executed_at}"`
                )
                .join("\n")
          );

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `facebook-search-history-${new Date().toISOString().slice(0, 10)}.${format}`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setExportNotice(`Exported ${historyItems.length} records as ${format.toUpperCase()}`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Search History & Audit Log
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Complete audit trail of all Facebook public queries executed by your account
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {historyItems.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("csv")}
                className="gap-1.5 text-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </Button>
            </>
          )}

          <Link href="/search">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs cursor-pointer">
              <Search className="w-3.5 h-3.5" />
              <span>New Search</span>
            </Button>
          </Link>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            placeholder="Filter history by keyword, provider or filter summary..."
            className="pl-9.5 text-xs bg-slate-50/50"
          />
        </div>
      </div>

      {/* History Table Card */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <span>Loading your search audit history...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Inbox className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-700">No search history recorded</p>
              <p className="mt-1 text-slate-400">Queries you run will appear here with execution timestamps and result counts.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Query</th>
                    <th className="py-3 px-4">Filters</th>
                    <th className="py-3 px-4">Results</th>
                    <th className="py-3 px-4">Engine</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Executed</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <Search className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {item.query}
                            </span>
                            {item.exact_phrase && (
                              <Badge variant="outline" className="ml-1.5 text-[9px] py-0 px-1 border-blue-300 text-blue-700">
                                Exact
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate text-[11px]">
                        {item.filters_summary || "Default Filters"}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {item.results_count.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {item.provider}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            item.status === "completed"
                              ? "success"
                              : item.status === "partial"
                              ? "warning"
                              : "destructive"
                          }
                          className="text-[10px] capitalize"
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {formatRelativeTime(item.executed_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Repeat Action */}
                          <Link
                            href={`/search/results?q=${encodeURIComponent(item.query)}&provider=${item.provider}&exact=${item.exact_phrase}`}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] gap-1 cursor-pointer"
                              title="Repeat this search query"
                            >
                              <Play className="w-3 h-3 text-blue-600" />
                              <span>Repeat</span>
                            </Button>
                          </Link>

                          {/* Delete Action */}
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Delete this history entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
