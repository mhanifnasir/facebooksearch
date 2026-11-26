import React from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, XCircle, ArrowUpRight, Zap, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiProvider } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProviderStatusCards({
  providers,
}: {
  providers: ApiProvider[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
      {providers.map((p) => {
        const isOperational = p.status === "operational";
        const isDegraded = p.status === "degraded";
        const usagePercent = Math.round((p.usedQuota / p.monthlyQuota) * 100);

        return (
          <div
            key={p.id}
            className="p-3.5 bg-white border border-slate-200/90 rounded-xl hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs group"
          >
            <div>
              <div className="flex items-start justify-between gap-1.5 mb-2">
                <span className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {p.name}
                </span>
                <Badge
                  variant={
                    isOperational ? "success" : isDegraded ? "warning" : "secondary"
                  }
                  className="capitalize text-[10px] px-1.5 py-0 shrink-0"
                >
                  {p.status}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-500 my-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {p.latencyMs}ms
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  {p.successRate}%
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Quota Usage</span>
                <span className="font-medium text-slate-700">
                  {usagePercent}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    usagePercent > 80 ? "bg-amber-500" : "bg-blue-600"
                  )}
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
