import React from "react";
import Link from "next/link";
import { Radio, ShieldCheck } from "lucide-react";
import { DemoBanner } from "@/components/layout/demo-banner";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between">
      <DemoBanner />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md">
          {/* Logo Brand */}
          <div className="text-center mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <span className="font-extrabold text-lg text-white block tracking-tight">
                  FB Search Pro
                </span>
                <span className="text-xs text-slate-400 block -mt-1 font-medium">
                  Public Content Intelligence
                </span>
              </div>
            </Link>
          </div>

          {children}
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-800">
        <p>Facebook Public Content Search • Demonstration Environment</p>
      </footer>
    </div>
  );
}
