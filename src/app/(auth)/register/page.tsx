"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, Mail, User, Building, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { signUp } from "@/app/auth/actions";

const registerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  organization: z.string().min(2, "Organization name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  agreeTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Terms of Service",
  }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      organization: "",
      password: "",
      agreeTerms: true,
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setAuthError(null);
    setSuccessMessage(null);

    const result = await signUp({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      organization: data.organization,
    });

    setLoading(false);

    if (result.success) {
      if (result.message && result.message.includes("check your email")) {
        setSuccessMessage(result.message);
      } else {
        router.push("/dashboard");
      }
    } else {
      setAuthError(result.error || "Failed to create account.");
    }
  };

  return (
    <Card className="bg-white/95 backdrop-blur-md border-slate-700/50 shadow-2xl">
      <CardHeader className="p-6 pb-2 text-center">
        <CardTitle className="text-xl font-bold text-slate-900">
          Create SaaS Analyst Account
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 mt-1">
          14-day full access to multi-engine Facebook public search
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 pt-4 space-y-4">
        {authError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        {successMessage ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs space-y-3 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="font-semibold text-sm">Account Created</p>
            <p className="text-emerald-700 text-xs leading-relaxed">
              {successMessage}
            </p>
            <div className="pt-2">
              <Link href="/login">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  Proceed to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  {...register("fullName")}
                  placeholder="Jane Doe"
                  className="pl-9.5 text-sm"
                  error={!!errors.fullName}
                />
              </div>
              {errors.fullName && (
                <p className="text-xs text-rose-500">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  {...register("email")}
                  placeholder="jane@organization.com"
                  className="pl-9.5 text-sm"
                  error={!!errors.email}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Company or Agency
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  {...register("organization")}
                  placeholder="Vertex Media / Intelligence Group"
                  className="pl-9.5 text-sm"
                  error={!!errors.organization}
                />
              </div>
              {errors.organization && (
                <p className="text-xs text-rose-500">
                  {errors.organization.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="password"
                  {...register("password")}
                  placeholder="Minimum 8 characters"
                  className="pl-9.5 text-sm"
                  error={!!errors.password}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-rose-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1 pt-1">
              <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  {...register("agreeTerms")}
                  className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 mt-0.5"
                />
                <span>
                  I agree to the Terms of Service, Acceptable Scraping Policy, and Privacy Agreement.
                </span>
              </label>
              {errors.agreeTerms && (
                <p className="text-xs text-rose-500">
                  {errors.agreeTerms.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm gap-2 mt-3"
            >
              <span>{loading ? "Registering User in Supabase..." : "Create Free Account"}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        )}

        <div className="text-center pt-2 text-xs text-slate-500 border-t border-slate-100">
          <span>Already registered? </span>
          <Link
            href="/login"
            className="font-semibold text-blue-600 hover:underline"
          >
            Sign in here
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
