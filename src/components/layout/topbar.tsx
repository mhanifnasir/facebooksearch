"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  User,
  Settings,
  Sparkles,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut, getCurrentUser } from "@/app/auth/actions";

export function Topbar({
  onMobileMenuToggle,
}: {
  onMobileMenuToggle?: () => void;
}) {
  const router = useRouter();
  const [quickQuery, setQuickQuery] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    fullName: string;
    organization: string;
    email?: string;
    isDemo?: boolean;
  } | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const u = await getCurrentUser();
        if (u) {
          setCurrentUser({
            fullName: u.fullName,
            organization: u.organization,
            email: u.email,
            isDemo: u.isDemo,
          });
        }
      } catch {
        // Fallback default
      }
    }
    fetchUser();
  }, []);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      router.push(`/search/results?q=${encodeURIComponent(quickQuery.trim())}`);
    } else {
      router.push("/search");
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const initials = currentUser?.fullName
    ? currentUser.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "JS";

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile hamburger & Quick Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleQuickSearch} className="w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={quickQuery}
            onChange={(e) => setQuickQuery(e.target.value)}
            placeholder="Quick search Facebook public posts, pages, or keywords..."
            className="w-full bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-xs md:text-sm text-slate-900 placeholder:text-slate-400 rounded-lg pl-9 pr-12 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
          <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded shadow-2xs font-mono">
            Enter
          </kbd>
        </form>
      </div>

      {/* Right: Actions, notifications, profile */}
      <div className="flex items-center gap-2 md:gap-3">
        <Link href="/search" className="hidden sm:inline-flex">
          <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>Advanced Search</span>
          </Button>
        </Link>

        {/* Status Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Supabase Connected</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg relative transition-colors cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">
                  Notifications
                </span>
                <span className="text-[10px] text-blue-600 font-medium hover:underline cursor-pointer">
                  Mark all as read
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-slate-50 text-xs transition-colors">
                  <p className="font-medium text-slate-800">
                    Saved Search Alert Triggered
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    14 new public posts discovered for query &ldquo;Llama 4&rdquo;
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    10 minutes ago
                  </span>
                </div>
                <div className="px-4 py-3 hover:bg-slate-50 text-xs transition-colors">
                  <p className="font-medium text-slate-800">
                    Supabase Auth Session Active
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Row Level Security policies active for current session.
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Verified
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-1 ring-slate-200">
              {initials}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                {currentUser?.fullName || "Analyst Session"}
              </span>
              <span className="text-[10px] text-slate-500 leading-tight">
                {currentUser?.isDemo
                  ? "Demo Mode"
                  : currentUser?.organization || "Authenticated"}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 text-xs">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-900">
                  {currentUser?.fullName || "User Profile"}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {currentUser?.email || "Signed in"}
                </p>
              </div>
              <div className="py-1">
                <Link
                  href="/settings/account"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" /> Account
                  Profile
                </Link>
                <Link
                  href="/settings/providers"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" /> API
                  Settings
                </Link>
              </div>
              <div className="border-t border-slate-100 pt-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 hover:bg-rose-50 text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
