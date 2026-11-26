import React from "react";

export function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 animate-pulse shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-3 w-20 bg-slate-200 rounded" />
              </div>
            </div>
            <div className="h-6 w-16 bg-slate-200 rounded-full" />
          </div>

          <div className="space-y-2">
            <div className="h-5 w-3/4 bg-slate-200 rounded" />
            <div className="h-4 w-full bg-slate-200 rounded" />
            <div className="h-4 w-5/6 bg-slate-200 rounded" />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-8 w-44 bg-slate-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
