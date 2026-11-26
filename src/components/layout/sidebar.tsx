"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  FileText,
  Users,
  Video,
  MessageSquare,
  History,
  Bookmark,
  Cpu,
  Settings,
  LogOut,
  Database,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, getCurrentUser } from "@/app/auth/actions";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "blue" | "emerald" | "amber" | "slate";
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: "INTELLIGENCE",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Global Search",
        href: "/search",
        icon: Search,
        badge: "Core",
        badgeVariant: "blue",
      },
      {
        title: "Search Results",
        href: "/search/results",
        icon: FileText,
      },
    ],
  },
  {
    title: "PUBLIC CONTENT",
    items: [
      {
        title: "Facebook Pages",
        href: "/pages",
        icon: Users,
        badge: "1.2K",
      },
      {
        title: "Videos & Reels",
        href: "/videos",
        icon: Video,
      },
      {
        title: "Public Comments",
        href: "/comments",
        icon: MessageSquare,
        badge: "140K",
      },
    ],
  },
  {
    title: "AUDIT & SAVED",
    items: [
      {
        title: "Search History",
        href: "/history",
        icon: History,
      },
      {
        title: "Saved Searches",
        href: "/saved",
        icon: Bookmark,
        badge: "3 Active",
        badgeVariant: "emerald",
      },
    ],
  },
  {
    title: "SETTINGS & APIS",
    items: [
      {
        title: "API Providers",
        href: "/settings/providers",
        icon: Cpu,
        badge: "4 Active",
        badgeVariant: "blue",
      },
      {
        title: "Account Settings",
        href: "/settings/account",
        icon: Settings,
      },
    ],
  },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [user, setUser] = useState<{
    fullName: string;
    organization: string;
    email?: string;
    isDemo?: boolean;
  } | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const u = await getCurrentUser();
        if (u) {
          setUser({
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
    loadUser();
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "JS";

  return (
    <aside
      className={cn(
        "w-64 bg-[#0b1329] text-slate-300 flex flex-col shrink-0 border-r border-[#1a2649] select-none h-screen sticky top-0",
        className
      )}
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-[#1a2649] flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-white group-hover:text-blue-400 transition-colors">
              FB Search Pro
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Public Content Intel
            </span>
          </div>
        </Link>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    item.href !== "/search" &&
                    pathname.startsWith(item.href));

                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group",
                      isActive
                        ? "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30"
                        : "text-slate-300 hover:text-white hover:bg-[#162244]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isActive
                            ? "text-white"
                            : "text-slate-400 group-hover:text-blue-400"
                        )}
                      />
                      <span className="truncate">{item.title}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={cn(
                          "px-1.5 py-0.5 text-[10px] font-bold rounded shrink-0",
                          isActive
                            ? "bg-blue-700/80 text-white"
                            : item.badgeVariant === "emerald"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : item.badgeVariant === "blue"
                            ? "bg-blue-950 text-blue-400 border border-blue-800"
                            : "bg-[#1f2d53] text-slate-300"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Provider Status Indicator */}
      <div className="p-3 mx-3 mb-2 rounded-lg bg-[#111c38] border border-[#1d2d5a] text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-400" /> Database & APIs
          </span>
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Supabase RLS
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Monthly Quota: 68.4K / 100K used
        </p>
        <div className="w-full bg-[#1b2a52] h-1.5 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-blue-500 h-full rounded-full"
            style={{ width: "68.4%" }}
          />
        </div>
      </div>

      {/* User / Logout Footer */}
      <div className="p-3 border-t border-[#1a2649] bg-[#0d1630]">
        <div className="flex items-center justify-between p-1.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-500/30">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">
                {user?.fullName || "Analyst Session"}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {user?.isDemo
                  ? "Demo Mode"
                  : user?.organization || "Authenticated"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out of Supabase session"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#1a2649] rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
