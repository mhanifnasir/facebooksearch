import React from "react";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  description?: string;
  progressPercent?: number;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel = "vs last month",
  icon: Icon,
  iconColor = "text-blue-600",
  iconBg = "bg-blue-50",
  description,
  progressPercent,
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className="hover:border-slate-300 transition-all shadow-xs">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {title}
            </p>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">
              {value}
            </h3>
          </div>
          <div className={cn("p-2.5 rounded-xl shrink-0", iconBg)}>
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
        </div>

        {progressPercent !== undefined ? (
          <div className="mt-3.5 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{description || "Quota Consumed"}</span>
              <span className="font-semibold text-slate-800">
                {progressPercent.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  progressPercent > 85 ? "bg-amber-500" : "bg-blue-600"
                )}
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-xs">
            {change !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded",
                  isPositive
                    ? "text-emerald-700 bg-emerald-50"
                    : "text-rose-700 bg-rose-50"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {isPositive ? "+" : ""}
                {change}%
              </span>
            )}
            <span className="text-slate-500 truncate">
              {description || changeLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
