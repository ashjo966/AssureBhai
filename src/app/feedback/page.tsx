"use client";

import React, { Suspense, useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Search,
  RefreshCw,
  AlertCircle,
  Calendar,
  User,
  ShieldAlert,
} from "lucide-react";

interface FeedbackItem {
  id: number;
  name: string;
  feedback: string;
  created_at: string;
}

function FeedbackTableContent() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key");

  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchFeedback = useCallback(async (isManualRefresh = false) => {
    if (!key) {
      setIsUnauthorized(true);
      setLoading(false);
      return;
    }

    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(`/api/feedback?key=${encodeURIComponent(key)}`, {
        headers: {
          "x-admin-key": key,
        },
        cache: "no-store",
      });

      if (res.status === 401) {
        setIsUnauthorized(true);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      const rows: FeedbackItem[] = Array.isArray(data)
        ? data
        : data?.feedback || data?.rows || [];
      setFeedbackList(rows);
      setWarning(data?.warning || null);
      setIsUnauthorized(false);
    } catch (err) {
      console.error("Failed to load feedback:", err);
      setError(err instanceof Error ? err.message : "Failed to load feedback records");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [key]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // Client-side instant search filter
  const filteredFeedback = useMemo(() => {
    if (!searchQuery.trim()) return feedbackList;
    const query = searchQuery.toLowerCase().trim();
    return feedbackList.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.feedback.toLowerCase().includes(query)
    );
  }, [feedbackList, searchQuery]);

  // Format timestamp in Indian Standard Time (IST)
  const formatIST = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return dateStr;
    }
  };

  // 1. Silent unauthorized/404 view if key is absent or invalid
  if (isUnauthorized || !key) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">404</h1>
        <p className="text-slate-500 text-sm max-w-sm">
          This page could not be found or you do not have permission to view it.
        </p>
      </div>
    );
  }

  // 2. Initial Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading feedback records...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Feedback Admin
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {feedbackList.length} {feedbackList.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                User feedback submitted on AssureBhai
              </p>
            </div>
          </div>

          {/* Search Bar & Refresh Button */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or feedback..."
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => fetchFeedback(true)}
              disabled={isRefreshing}
              title="Refresh feedback list"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 active:bg-slate-100 transition-colors shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {warning && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">PostgreSQL Notice</p>
              <p className="text-amber-800 mt-0.5 leading-relaxed">{warning}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to fetch feedback records</p>
              <p className="text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {filteredFeedback.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {searchQuery ? "No matching feedback found" : "No feedback submitted yet"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No results found for "${searchQuery}". Try searching with a different term.`
                : "When users submit feedback through the modal, submissions will appear here in real time."}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-4 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th scope="col" className="px-5 py-3.5 w-48 sm:w-60">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Name</span>
                      </div>
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                        <span>Feedback</span>
                      </div>
                    </th>
                    <th scope="col" className="px-5 py-3.5 w-44 sm:w-56 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Date & Time (IST)</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFeedback.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Name Column */}
                      <td className="px-5 py-4 align-top font-semibold text-slate-900 break-words">
                        <span className="inline-block bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-md">
                          {item.name}
                        </span>
                      </td>

                      {/* Feedback Column */}
                      <td className="px-5 py-4 align-top text-slate-700 leading-relaxed break-words whitespace-pre-wrap max-w-xl">
                        {item.feedback}
                      </td>

                      {/* Date & Time (IST) Column */}
                      <td className="px-5 py-4 align-top text-right text-xs text-slate-500 whitespace-nowrap tabular-nums">
                        <span className="inline-block bg-slate-50 border border-slate-200/60 px-2 py-1 rounded-md font-medium text-slate-600">
                          {formatIST(item.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span>
                Showing {filteredFeedback.length} of {feedbackList.length}{" "}
                {feedbackList.length === 1 ? "entry" : "entries"}
              </span>
              <span className="text-[11px] text-slate-400">Time zone: Asia/Kolkata (IST)</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function FeedbackAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">Verifying access...</p>
        </div>
      }
    >
      <FeedbackTableContent />
    </Suspense>
  );
}
