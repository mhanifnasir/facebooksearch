"use client";

import React, { useState, Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { DemoBanner } from "@/components/layout/demo-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Demo Mode Banner */}
      <DemoBanner />

      <div className="flex flex-1 min-h-0">
        {/* Desktop Navy Sidebar with Suspense boundary */}
        <Suspense fallback={<div className="w-64 bg-[#0b1329] hidden md:block" />}>
          <Sidebar className="hidden md:flex" />
        </Suspense>

        {/* Mobile Navigation Drawer with Suspense boundary */}
        <Suspense fallback={null}>
          <MobileNav
            isOpen={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
          />
        </Suspense>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar onMobileMenuToggle={() => setMobileNavOpen(true)} />

          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            <Suspense fallback={<div className="p-6 text-center text-xs text-slate-400">Loading workspace...</div>}>
              {children}
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
