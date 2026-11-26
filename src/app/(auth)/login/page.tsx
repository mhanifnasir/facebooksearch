"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, Mail, ArrowRight, Key, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { signIn } from "@/app/auth/actions";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "demo.analyst@fbsearch.io",
      password: "demoPassword123!",
      rememberMe: true,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setAuthError(null);

    const result = await signIn({
      email: data.email,
      password: data.password,
      rememberMe: data.rememberMe,
    });

    setLoading(false);

    if (result.success) {
      router.push(redirectTo);
    } else {
      setAuthError(result.error || "Authentication failed.");
    }
  };

  const handleFillDemo = () => {
    setValue("email", "demo.analyst@fbsearch.io");
    setValue("password", "demoPassword123!");
    setAuthError(null);
  };

  return (
    <Card className="bg-white/95 backdrop-blur-md border-slate-700/50 shadow-2xl">
      <CardHeader className="p-6 pb-2 text-center">
        <CardTitle className="text-xl font-bold text-slate-900">
          Sign In to Your Workspace
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 mt-1">
          Access social intelligence, search history, and multi-provider APIs
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 pt-4 space-y-4">
        {/* Error Notification */}
        {authError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        {/* Demo Credentials Helper Pill */}
        <div className="bg-blue-50 border border-blue-200/80 rounded-lg p-3 text-xs text-blue-900 flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <p className="font-semibold flex items-center gap-1.5 text-blue-800">
              <Key className="w-3.5 h-3.5" /> Demo Analyst Account
            </p>
            <p className="text-[11px] text-blue-700/80">
              demo.analyst@fbsearch.io • Click below to prefill
            </p>
          </div>
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline shrink-0 cursor-pointer"
          >
            Fill Demo
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="email"
                {...register("email")}
                placeholder="name@company.com"
                className="pl-9.5 text-sm"
                error={!!errors.email}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-rose-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 block">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] text-blue-600 hover:underline cursor-pointer"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="password"
                {...register("password")}
                placeholder="••••••••••••"
                className="pl-9.5 text-sm"
                error={!!errors.password}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-rose-500">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
              <input
                type="checkbox"
                {...register("rememberMe")}
                className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300"
              />
              <span>Remember this session</span>
            </label>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm gap-2 mt-2"
          >
            <span>{loading ? "Authenticating with Supabase..." : "Sign In to Platform"}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-500 border-t border-slate-100">
          <span>Don&apos;t have an account? </span>
          <Link
            href="/register"
            className="font-semibold text-blue-600 hover:underline"
          >
            Create free trial
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading sign-in...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
