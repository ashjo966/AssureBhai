"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, CheckCircle2, Loader2, MessageSquare } from "lucide-react";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

interface FeedbackWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackWidget({ isOpen, onClose }: FeedbackWidgetProps) {
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timer and reset state if widget is closed
  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // Reset form after close animation
      const resetTimeout = setTimeout(() => {
        setName("");
        setFeedback("");
        setIsSubmitting(false);
        setIsSuccess(false);
        setErrorMessage(null);
      }, 300);
      return () => clearTimeout(resetTimeout);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedFeedback = feedback.trim();

    if (!trimmedName || !trimmedFeedback) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetchWithRetry("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          feedback: trimmedFeedback,
        }),
        maxRetries: 2,
        initialDelayMs: 1000,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit feedback.");
      }

      setIsSuccess(true);
      // Automatically disappear after 3 seconds
      timerRef.current = setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onClose();
  };

  if (!isOpen) return null;

  const isFormValid = name.trim().length > 0 && feedback.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4 sm:p-0 sm:items-end sm:justify-end sm:fixed sm:inset-auto sm:bottom-6 sm:right-6">
      {/* Mobile Backdrop (only visible on small screens to center modal) */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs sm:hidden pointer-events-auto transition-opacity"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Floating Feedback Card */}
      <div
        id="feedback-form-container"
        role="dialog"
        aria-labelledby="feedback-dialog-title"
        className="relative pointer-events-auto w-full max-w-md sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95 sm:slide-in-from-bottom-5"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300 border border-indigo-500/30">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 id="feedback-dialog-title" className="text-sm font-bold text-white tracking-wide">
                Share Your Feedback
              </h3>
              <p className="text-[11px] text-slate-300">Help us make AssureBhai better</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close feedback dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5">
          {isSuccess ? (
            /* Success Dialog State - displays for 3 seconds */
            <div
              id="feedback-success-message"
              className="py-6 px-2 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Feedback Submitted Successfully!
              </h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Thank you for taking the time to share your feedback.
              </p>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Name Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="feedback-name" className="text-xs font-semibold text-slate-700">
                    Name <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 tabular-nums">
                    {name.length}/50
                  </span>
                </div>
                <input
                  id="feedback-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 50))}
                  placeholder="Enter your name"
                  maxLength={50}
                  required
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 disabled:opacity-50"
                />
              </div>

              {/* Feedback Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="feedback-text" className="text-xs font-semibold text-slate-700">
                    Feedback <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 tabular-nums">
                    {feedback.length}/500
                  </span>
                </div>
                <textarea
                  id="feedback-text"
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value.slice(0, 500))}
                  placeholder="Tell us what you think or report an issue..."
                  maxLength={500}
                  required
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 resize-none disabled:opacity-50"
                />
              </div>

              {/* Buttons: Cancel and Submit */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  id="feedback-cancel-button"
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="feedback-submit-button"
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                    isFormValid && !isSubmitting
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/60"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
