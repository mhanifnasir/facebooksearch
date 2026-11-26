"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bookmark,
  Bell,
  Mail,
  Play,
  Trash2,
  Plus,
  Clock,
  Sparkles,
  Inbox,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  getSavedSearchesAction,
  createSavedSearchAction,
  updateSavedSearchAction,
  deleteSavedSearchAction,
} from "@/app/saved/actions";
import { SavedSearchRecord } from "@/lib/repositories/saved-searches";
import { formatRelativeTime } from "@/lib/utils";

export default function SavedSearchesPage() {
  const [savedItems, setSavedItems] = useState<SavedSearchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQuery, setNewQuery] = useState("");
  const [newFrequency, setNewFrequency] = useState<string>("daily");
  const [newNotify, setNewNotify] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSaved() {
      try {
        const items = await getSavedSearchesAction();
        if (isMounted) setSavedItems(items);
      } catch (err) {
        console.error("Failed to load saved searches:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSaved();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleNotify = async (id: string, currentVal: boolean) => {
    setSavedItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, notify_email: !currentVal } : item
      )
    );
    await updateSavedSearchAction(id, { notifyEmail: !currentVal });
  };

  const handleDelete = async (id: string) => {
    setSavedItems((prev) => prev.filter((item) => item.id !== id));
    await deleteSavedSearchAction(id);
  };

  const handleCreateSaved = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newQuery.trim() || creating) return;

    setCreating(true);
    try {
      const created = await createSavedSearchAction({
        name: newName.trim(),
        query: newQuery.trim(),
        alertFrequency: newFrequency,
        notifyEmail: newNotify,
      });

      if (created) {
        setSavedItems([created, ...savedItems]);
      }
      setShowCreateModal(false);
      setNewName("");
      setNewQuery("");
    } catch (err) {
      console.error("Failed to create saved search:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Saved Searches & Alert Monitors
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Persistent search configurations that monitor public Facebook content for your topics
          </p>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Saved Search</span>
        </Button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Create Saved Search Monitor
            </h3>
            <form onSubmit={handleCreateSaved} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Saved Monitor Name
                </label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Llama 4 Open Source Announcements"
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Facebook Search Query
                </label>
                <Input
                  value={newQuery}
                  onChange={(e) => setNewQuery(e.target.value)}
                  placeholder="e.g., Llama 4 Meta release"
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Alert Frequency
                </label>
                <select
                  value={newFrequency}
                  onChange={(e) => setNewFrequency(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="daily">Daily Summary</option>
                  <option value="weekly">Weekly Digest</option>
                  <option value="realtime">Continuous Stream</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="notifyEmail"
                  checked={newNotify}
                  onChange={(e) => setNewNotify(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="notifyEmail" className="text-slate-700 cursor-pointer">
                  Send email notifications when new posts are detected
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={creating}
                  className="bg-blue-600 text-white"
                >
                  {creating ? "Saving..." : "Save Monitor"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          <span>Loading saved searches...</span>
        </div>
      ) : savedItems.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-16 text-center text-xs">
            <Bookmark className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <h3 className="font-bold text-slate-800 text-sm">No Saved Searches Yet</h3>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">
              Save key queries to quickly re-run searches or set up automated monitoring alerts for public Facebook content.
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              size="sm"
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Your First Saved Search</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedItems.map((item) => (
            <Card
              key={item.id}
              className="border-slate-200 hover:border-blue-300 transition-all flex flex-col justify-between group shadow-xs"
            >
              <div>
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {item.name}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-200 bg-blue-50/50">
                        {item.alert_frequency}
                      </Badge>
                      <span className="text-[10px] text-slate-400">
                        Created {formatRelativeTime(item.created_at)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Delete Saved Search"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </CardHeader>

                <CardContent className="space-y-3 pt-0 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                      Query String
                    </span>
                    <span className="font-mono text-slate-800 break-all font-medium">
                      “{item.query}”
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-slate-400" />
                      <span>Alert Email Status:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleNotify(item.id, item.notify_email)}
                      className={`text-[10px] px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                        item.notify_email
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {item.notify_email ? "Active Notifications" : "Muted"}
                    </button>
                  </div>
                </CardContent>
              </div>

              {/* Card Footer: Run action */}
              <div className="p-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  Last indexed: {item.last_run_at ? formatRelativeTime(item.last_run_at) : "Never"}
                </span>

                <Link
                  href={`/search/results?q=${encodeURIComponent(item.query)}&exact=${item.exact_phrase}`}
                >
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-2xs"
                  >
                    <Play className="w-3 h-3" />
                    <span>Run Query</span>
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
