"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { requestPasswordReset } from "@/app/auth/actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const res = await requestPasswordReset(email);
    setLoading(false);

    if (res.success) {
      setMessage(res.message || "Password reset instructions sent.");
    } else {
      setError(res.error || "Failed to send reset link.");
    }
  };

  return (
    <Card className="bg-white/95 backdrop-blur-md border-slate-700/50 shadow-2xl">
      <CardHeader className="p-6 pb-2 text-center">
        <CardTitle className="text-xl font-bold text-slate-900">
          Reset Your Password
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 mt-1">
          Enter your registered email address and we will send you a recovery link
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 pt-4 space-y-4">
        {message ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs space-y-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="font-semibold text-sm">Check your inbox</p>
            <p className="text-emerald-700 text-[11px] leading-relaxed">
              {message}
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button size="sm" variant="outline" className="text-xs">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Account Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@company.com"
                  className="pl-9.5 text-sm"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm gap-2"
            >
              <span>{loading ? "Sending Link..." : "Send Reset Link"}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="text-center pt-2 text-xs border-t border-slate-100">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
