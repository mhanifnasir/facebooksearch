import React from "react";
import { AlertTriangle, RefreshCw, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Search Provider Timeout / Rate Limit",
  message = "The selected search engine took too long to query indexed public Facebook feeds. Please try again or switch to another provider.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-rose-50/50 rounded-xl border border-rose-200 p-8 text-center flex flex-col items-center justify-center max-w-xl mx-auto">
      <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="font-bold text-base text-rose-950 mb-1">{title}</h3>
      <p className="text-xs text-rose-800/80 max-w-md mb-5 leading-relaxed">
        {message}
      </p>
      <div className="flex items-center gap-3">
        {onRetry && (
          <Button
            size="sm"
            onClick={onRetry}
            className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Query</span>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="border-rose-300 text-rose-800 hover:bg-rose-100"
        >
          Reload Interface
        </Button>
      </div>
    </div>
  );
}
