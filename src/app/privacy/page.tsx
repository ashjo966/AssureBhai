"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Database,
  MapPin,
  MessageSquare,
  ArrowLeft,
  FileCheck2,
  AlertCircle,
} from "lucide-react";
import { FeedbackWidget } from "@/components/FeedbackModal";

export default function PrivacyPolicyPage() {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans antialiased text-slate-800 selection:bg-indigo-100 w-full max-w-full overflow-x-hidden">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full max-w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs overflow-x-hidden">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 h-[54px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="AssureBhai Logo"
              className="h-[28px] sm:h-[32px] w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsFeedbackOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Feedback</span>
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Analyzer</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-start">
        {/* Page Hero */}
        <div className="mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero-Storage Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
            At AssureBhai, your privacy and document confidentiality are paramount.
            We engineered our entire system with a strict privacy-by-design policy:
            what happens in your browser stays strictly in your session.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Last Updated: November 2026
          </p>
        </div>

        {/* Core Guarantees Grid */}
        <div className="space-y-6">
          {/* Card 1: 100% In-Memory Policy Processing */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  1. Policy PDFs Processed Strictly In-Memory (Zero Storage)
                </h2>
                <div className="mt-2 text-sm text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    When you upload an insurance policy document, the PDF is processed
                    <strong> strictly in volatile memory (RAM)</strong> solely to parse
                    and extract key insurance clauses, terms, and coverage limits.
                  </p>
                  <p className="font-semibold text-slate-800">
                    Uploaded policy PDFs are never saved, stored, archived, or logged on our
                    servers, hard drives, cloud buckets, or persistent databases.
                  </p>
                  <p>
                    The moment your policy analysis response completes or your browser session
                    ends, the in-memory document buffer is immediately freed and purged.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Password Handling */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  2. Encrypted PDF Passwords Are Ephemeral
                </h2>
                <div className="mt-2 text-sm text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    If your insurance provider password-protects your policy (commonly using your
                    Date of Birth or PAN), you may provide the password to decrypt the document.
                  </p>
                  <p>
                    This password is used <strong>exclusively in real time by the PDF reader library</strong> to
                    unlock the document in-memory. It is never logged, never stored in plaintext
                    or ciphertext, and never sent to any third party.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: PIN Code & Demographic Context */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  3. Transient Demographic &amp; MoSPI Benchmark Lookups
                </h2>
                <div className="mt-2 text-sm text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    The 6-digit Indian PIN code and member age details you provide are utilized
                    solely to look up public Ministry of Statistics and Programme Implementation (MoSPI)
                    macroeconomic benchmarks (such as regional healthcare inflation and city tier copayment zones)
                    during your active session.
                  </p>
                  <p>
                    These inputs are not linked to any personal identity, IP address, or device fingerprint,
                    and are discarded once your session ends.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Voluntary Feedback Submissions */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  4. Voluntary Feedback Form Submissions
                </h2>
                <div className="mt-2 text-sm text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    The only data we store in our database are voluntary submissions made when you
                    click the &ldquo;Feedback&rdquo; button to leave a suggestion, bug report, or note for the creator.
                  </p>
                  <p>
                    We store only the name you provide, the message body, and the timestamp in our
                    protected PostgreSQL database to help us improve the tool. We never sell, rent,
                    monetize, or share feedback data with external advertisers or insurance telemarketers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Disclaimer & Statutory Notice */}
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-5 sm:p-7">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Independent Educational Analysis Notice
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  AssureBhai is an independent consumer technology tool created to simplify insurance
                  documents. AssureBhai is not an IRDAI-registered insurance company, broker, or corporate agent.
                  Evaluations and benchmark ratings are generated algorithmically for informational
                  purposes and should not be construed as legal or financial advice.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back CTA */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Policy Analyzer</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsFeedbackOpen(true)}
            className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            Have questions about privacy? Send feedback →
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} AssureBhai. 100% In-Memory Processing. Your data is never sold or retained.</p>
      </footer>

      {/* Feedback Widget Modal */}
      <FeedbackWidget
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </div>
  );
}

