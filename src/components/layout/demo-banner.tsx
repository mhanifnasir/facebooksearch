import React from 'react';
import { AlertCircle, ShieldCheck } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between border-b border-blue-800/60 shadow-xs">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold tracking-wide uppercase text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded border border-blue-400/40">
          Phase 1 Prototype
        </span>
        <span className="text-slate-200 hidden sm:inline">
          Demonstration Environment: All feeds and metrics display realistic structured mock data.
        </span>
        <span className="text-slate-200 sm:hidden">
          Mock Data Demo Mode
        </span>
      </div>
      <div className="flex items-center gap-3 text-slate-300">
        <span className="flex items-center gap-1 text-[11px] text-blue-200/90">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> External APIs Disconnected
        </span>
        <span className="text-slate-500 hidden md:inline">|</span>
        <span className="hidden md:inline text-[11px] text-slate-300">
          Facebook Public Content Search v1.0.0
        </span>
      </div>
    </div>
  );
}
