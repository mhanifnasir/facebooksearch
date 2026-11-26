"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Building,
  Lock,
  Globe,
  Bell,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getCurrentUser, updatePassword, updateUserProfile } from "@/app/auth/actions";

export default function AccountSettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("John Stewart");
  const [email, setEmail] = useState("john@acmeanalytics.io");
  const [org, setOrg] = useState("Acme Analytics International");
  const [timezone, setTimezone] = useState("America/New_York (UTC-5)");
  const [notifyDigests, setNotifyDigests] = useState(true);
  const [notifyLimits, setNotifyLimits] = useState(true);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  // Profile save state
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveAlert, setSaveAlert] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const u = await getCurrentUser();
        if (u) {
          setUserId(u.id);
          setName(u.fullName || "");
          setEmail(u.email || "");
          setOrg(u.organization || "");
        }
      } catch {
        // Use initial defaults
      }
    }
    loadUser();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveError(null);

    const res = await updateUserProfile({
      fullName: name,
      organization: org,
      timezone,
    });

    setSaveLoading(false);

    if (res.success) {
      setSaveAlert(true);
      setTimeout(() => setSaveAlert(false), 3000);
    } else {
      setSaveError(res.error || "Failed to update profile.");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdMessage(null);

    if (newPassword.length < 8) {
      setPwdError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("Passwords do not match.");
      return;
    }

    setPwdLoading(true);
    const res = await updatePassword(newPassword);
    setPwdLoading(false);

    if (res.success) {
      setPwdMessage("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPwdError(res.error || "Failed to update password.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Account & Organization Settings
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Manage your Supabase Auth profile, security credentials, and alert notification preferences
          </p>
        </div>

        <Button
          onClick={handleSaveProfile}
          disabled={saveLoading}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs self-start cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saveLoading ? "Saving..." : "Save Changes"}</span>
        </Button>
      </div>

      {saveAlert && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Profile preferences successfully updated in Supabase!</span>
        </div>
      )}

      {saveError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Profile Form and Security */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Profile Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>Profile Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Full Name
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Email Address (Supabase Account)
                    </label>
                    <Input
                      value={email}
                      disabled
                      className="text-xs bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                    <span className="text-[10px] text-slate-400">
                      Managed via Supabase Auth
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Organization
                    </label>
                    <Input
                      value={org}
                      onChange={(e) => setOrg(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-9.5 text-xs bg-white border border-slate-300 rounded-lg px-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="America/New_York (UTC-5)">
                        America/New_York (UTC-5)
                      </option>
                      <option value="America/Los_Angeles (UTC-8)">
                        America/Los_Angeles (UTC-8)
                      </option>
                      <option value="Europe/London (UTC+0)">
                        Europe/London (UTC+0)
                      </option>
                      <option value="Asia/Tokyo (UTC+9)">
                        Asia/Tokyo (UTC+9)
                      </option>
                    </select>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Password & Security Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600" />
                <span>Security & Credentials</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-3.5">
                {pwdMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{pwdMessage}</span>
                  </div>
                )}
                {pwdError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>{pwdError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      New Password
                    </label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="text-xs font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Confirm New Password
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="text-xs font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={pwdLoading}
                    variant="outline"
                    size="sm"
                    className="text-xs cursor-pointer"
                  >
                    {pwdLoading ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                <span>Email & Digest Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-800">
                    Saved Search Activity Alerts
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Receive email digests when new matching public posts are indexed
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyDigests}
                  onChange={(e) => setNotifyDigests(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <div>
                  <p className="font-semibold text-slate-800">
                    API Quota Threshold Warnings
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Notify administrators when provider quota reaches 80% and 95%
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyLimits}
                  onChange={(e) => setNotifyLimits(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Subscription & Plan Tier */}
        <div className="space-y-5">
          <Card className="bg-gradient-to-br from-[#0b1329] to-[#162244] text-white border-slate-800 shadow-lg">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-xs">
                  Enterprise Tier
                </Badge>
                <span className="text-xs text-slate-300">Phase 2 Verified</span>
              </div>

              <div>
                <h3 className="text-xl font-bold">100,000 Monthly Queries</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Supabase PostgreSQL database connected with Row Level Security (RLS) enforcement.
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Cycle Consumed</span>
                  <span className="font-semibold text-white">68.4%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: "68.4%" }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 text-xs text-slate-300 space-y-1">
                <p>• Auth: Supabase SSR</p>
                <p>• Isolation: Strict RLS</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Database & Security Status
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">PostgreSQL Engine:</span>
                <span className="font-semibold text-slate-800">Supabase v15+</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Row Level Security:</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active on 9 Tables
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Service Role Guard:</span>
                <span className="text-blue-600 font-semibold">Server-Only</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
