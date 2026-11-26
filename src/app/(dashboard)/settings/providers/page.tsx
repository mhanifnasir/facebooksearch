"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Clock,
  Sliders,
  ExternalLink,
  Lock,
  DollarSign,
  AlertOctagon,
  Ban,
  Check,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  getProviderSettingsAction,
  testProviderConnectionAction,
  updateProviderSettingsAction,
  ProviderSettingView,
} from "@/app/settings/providers/actions";
import { ProviderName } from "@/lib/providers/types";

export default function ApiProviderSettingsPage() {
  const [providers, setProviders] = useState<ProviderSettingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { success: boolean; message: string; latencyMs: number }>
  >({});
  const [editingLimitId, setEditingLimitId] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState<string>("");
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load real provider settings on mount
  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const res = await getProviderSettingsAction();
      if (res.providers) {
        setProviders(res.providers);
      }
      if (res.error) {
        setFeedbackBanner({ type: "error", message: res.error });
      }
    } catch {
      setFeedbackBanner({
        type: "error",
        message: "Failed to connect to provider management service.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (id: ProviderName) => {
    setTestingId(id);
    try {
      const res = await testProviderConnectionAction(id);
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          success: res.success,
          message: res.message,
          latencyMs: res.latencyMs,
        },
      }));

      // Refresh provider status
      const updated = await getProviderSettingsAction();
      if (updated.providers) {
        setProviders(updated.providers);
      }
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          success: false,
          message: "Failed to execute connection ping.",
          latencyMs: 0,
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleEnabled = async (provider: ProviderName, currentEnabled: boolean) => {
    const nextState = !currentEnabled;
    try {
      const res = await updateProviderSettingsAction({
        provider,
        enabled: nextState,
      });

      if (res.success) {
        setProviders((prev) =>
          prev.map((p) =>
            p.id === provider
              ? {
                  ...p,
                  enabled: nextState,
                  status: nextState ? "operational" : "disabled",
                }
              : p
          )
        );
        showBanner("success", res.message);
      } else {
        showBanner("error", res.message);
      }
    } catch {
      showBanner("error", "Failed to update provider status.");
    }
  };

  const handleSaveCustomLimit = async (provider: ProviderName) => {
    const parsedLimit = parseInt(limitInput, 10);
    if (isNaN(parsedLimit) || parsedLimit < 10) {
      showBanner("error", "Please enter a valid monthly limit (minimum 10).");
      return;
    }

    try {
      const res = await updateProviderSettingsAction({
        provider,
        customLimit: parsedLimit,
      });

      if (res.success) {
        setEditingLimitId(null);
        showBanner("success", res.message);
        loadProviders();
      } else {
        showBanner("error", res.message);
      }
    } catch {
      showBanner("error", "Failed to update provider monthly limit.");
    }
  };

  const showBanner = (type: "success" | "error", message: string) => {
    setFeedbackBanner({ type, message });
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return (
          <Badge variant="success" className="bg-emerald-100 text-emerald-800 text-[11px] gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Operational
          </Badge>
        );
      case "quota_exhausted":
        return (
          <Badge variant="destructive" className="bg-rose-100 text-rose-800 text-[11px] gap-1">
            <AlertOctagon className="w-3 h-3 text-rose-600" />
            Quota Exhausted
          </Badge>
        );
      case "token_expired":
        return (
          <Badge variant="destructive" className="bg-amber-100 text-amber-800 text-[11px] gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Token Expired
          </Badge>
        );
      case "disabled":
        return (
          <Badge variant="secondary" className="bg-slate-200 text-slate-700 text-[11px] gap-1">
            <Ban className="w-3 h-3 text-slate-500" />
            Disabled
          </Badge>
        );
      case "not_configured":
      default:
        return (
          <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[11px] gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            Not Configured
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Provider Management & Free-Tier Protection
            </h1>
            <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50 text-[11px]">
              Phase 6 Production
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Configure search adapters, track monthly quota consumption, and enforce free-tier cost guardrails.
          </p>
        </div>

        <Button
          onClick={loadProviders}
          size="sm"
          variant="outline"
          disabled={loading}
          className="text-xs gap-1.5 self-start shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Quotas</span>
        </Button>
      </div>

      {/* Security & Free-Tier Guardrails Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-800 text-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-semibold text-sm text-blue-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Automatic Cost-Control & Free Usage Guardrails Active</span>
          </div>
          <p className="text-xs text-slate-300 max-w-3xl">
            Tavily is capped at 1,000 monthly credits with a 5% safety margin buffer. Brave Search operates on a strict $5.00 monthly credit budget with zero automatic top-ups. If a provider reaches its quota, it safely pauses while remaining providers continue search execution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Badge className="bg-blue-950/80 border border-blue-500/40 text-blue-200 text-[11px] py-1 px-2.5">
            Auto-Topup: Prohibited
          </Badge>
          <Badge className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-[11px] py-1 px-2.5">
            5% Safety Buffer
          </Badge>
        </div>
      </div>

      {feedbackBanner && (
        <div
          className={`p-3 text-xs rounded-xl flex items-center gap-2 ${
            feedbackBanner.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {feedbackBanner.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedbackBanner.message}</span>
        </div>
      )}

      {/* Provider List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {providers.map((p) => {
            const isTesting = testingId === p.id;
            const ping = testResults[p.id];
            const usagePct =
              p.monthlyLimit > 0
                ? Math.min(Math.round((p.usedQuota / p.monthlyLimit) * 100), 100)
                : 0;

            const isExhausted = p.status === "quota_exhausted" || usagePct >= 100;
            const isEditing = editingLimitId === p.id;

            return (
              <Card
                key={p.id}
                className={`border transition-all shadow-xs overflow-hidden ${
                  isExhausted
                    ? "border-rose-300 bg-rose-50/20"
                    : p.enabled
                    ? "border-slate-200 hover:border-slate-300 bg-white"
                    : "border-slate-200 bg-slate-50/60 opacity-80"
                }`}
              >
                <CardContent className="p-5 md:p-6 space-y-4">
                  {/* Top Bar: Name, Status, Switch, Docs */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          p.id === "tavily"
                            ? "bg-blue-900 text-blue-300"
                            : p.id === "brave"
                            ? "bg-amber-900 text-amber-300"
                            : "bg-indigo-900 text-indigo-300"
                        }`}
                      >
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-slate-900">{p.name}</h3>
                          {getStatusBadge(p.status)}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {p.id === "tavily"
                            ? "Primary search discovery with Facebook domain restriction and dynamic credit weighting."
                            : p.id === "brave"
                            ? "Secondary independent web index capped at $5.00 monthly budget (no auto-renewal)."
                            : "Direct authorized Page retrieval and authentic comment edge verification."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <a
                        href={p.documentationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>Docs</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <Button
                        size="sm"
                        variant={p.enabled ? "default" : "outline"}
                        onClick={() => handleToggleEnabled(p.id, p.enabled)}
                        className={`text-xs gap-1.5 h-8 ${
                          p.enabled
                            ? "bg-slate-900 hover:bg-slate-800 text-white"
                            : "text-slate-600 border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        {p.enabled ? "Enabled" : "Disabled"}
                      </Button>
                    </div>
                  </div>

                  {/* Quota Progress Bar & Cost Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                    {/* Left 2 Cols: Key info, Quota slider, and Ping */}
                    <div className="lg:col-span-2 space-y-3">
                      {/* Server-Only Secret Display */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs">
                        <div className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="font-medium text-slate-700">Server Secret:</span>
                          <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {p.maskedSecret}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 italic">
                          Protected server-side via environment variables
                        </span>
                      </div>

                      {/* Quota Meter */}
                      <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-700 flex items-center gap-1">
                            <span>Monthly Consumption</span>
                            <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                              {p.unit}
                            </Badge>
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {p.usedQuota.toLocaleString()} / {p.monthlyLimit.toLocaleString()}
                            </span>
                            <span
                              className={`text-[11px] font-semibold ${
                                usagePct > 90
                                  ? "text-rose-600"
                                  : usagePct > 70
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              ({usagePct}%)
                            </span>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              usagePct > 90
                                ? "bg-rose-500"
                                : usagePct > 70
                                ? "bg-amber-500"
                                : "bg-blue-600"
                            }`}
                            style={{ width: `${usagePct}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                          <span>
                            Remaining Quota:{" "}
                            <strong className="text-slate-800 font-semibold">
                              {p.remainingQuota.toLocaleString()} {p.unit.split(" ")[0]}
                            </strong>
                          </span>
                          <span className="text-slate-400">
                            Published Limit: {p.publishedLimit.toLocaleString()} (Safety Margin: {p.safetyMarginPct}%)
                          </span>
                        </div>
                      </div>

                      {/* Connection Test Action & Result */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isTesting}
                          onClick={() => handleTestConnection(p.id)}
                          className="text-xs gap-1.5 shrink-0 h-8 text-blue-700 border-blue-200 hover:bg-blue-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
                          <span>{isTesting ? "Testing Ping..." : "Test Connection"}</span>
                        </Button>

                        {ping && (
                          <div
                            className={`text-xs p-1.5 px-3 rounded-lg flex items-center gap-1.5 ${
                              ping.success
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {ping.success ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            )}
                            <span className="truncate">{ping.message}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Col: Telemetry, Limits & Recent Errors */}
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                          <span className="text-slate-500">Last Successful:</span>
                          <span className="font-medium text-slate-800">
                            {p.lastSuccessfulRequest
                              ? new Date(p.lastSuccessfulRequest).toLocaleString()
                              : "No queries this period"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                          <span className="text-slate-500">Cost Estimate:</span>
                          <span className="font-semibold text-slate-900">{p.costEstimate}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Custom Limit:</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={limitInput}
                                onChange={(e) => setLimitInput(e.target.value)}
                                className="w-20 h-7 text-xs font-mono"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSaveCustomLimit(p.id)}
                                className="h-7 px-2 text-xs bg-blue-600 text-white"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingLimitId(p.id);
                                setLimitInput(p.monthlyLimit.toString());
                              }}
                              className="text-blue-600 hover:underline font-medium flex items-center gap-1"
                            >
                              <span>{p.monthlyLimit}</span>
                              <Sliders className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Recent Errors */}
                      {p.recentErrors.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60 space-y-1">
                          <span className="text-[11px] font-semibold text-rose-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Recent Error
                          </span>
                          <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded border border-rose-200 break-words">
                            {p.recentErrors[0].message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
