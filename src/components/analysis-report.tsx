"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Users,
  BarChart3,
  Sparkles,
  FileText,
  Gavel,
  CheckCircle,
  Check,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { Markdown } from "@/components/markdown";

interface PolicyClassification {
  policy_issuer?: string;
  policy_type?: string;
  policy_sub_type?: string;
}

interface ParsedDataPayload {
  policy_classification?: PolicyClassification;
  [key: string]: unknown;
}

interface AnalysisReportProps {
  analysis: string;
  parsedData?: ParsedDataPayload | null;
}

// Helper to slugify insurer name for logo path
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Helper to get initials
function getInitials(name: string): string {
  if (!name) return "INS";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Logo Badge Component with fallback
function InsurerLogoBadge({ issuer }: { issuer: string }) {
  const [imgError, setImgError] = useState(false);
  const slug = slugify(issuer || "");
  const initials = getInitials(issuer || "");

  if (!issuer) return null;

  return (
    <div className="flex items-center gap-2.5 bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-sm">
      {!imgError && slug ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`/logos/${slug}.png`}
          alt={issuer}
          onError={() => setImgError(true)}
          className="h-7 max-w-[90px] object-contain"
        />
      ) : (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 text-white text-xs font-black flex items-center justify-center tracking-tight shadow-xs">
          {initials}
        </div>
      )}
      <span className="text-xs font-bold text-slate-800 truncate max-w-[130px] sm:max-w-[180px]">
        {issuer}
      </span>
    </div>
  );
}

// Animated Score Card Component
function AnimatedScoreCard({ scoreText }: { scoreText: string }) {
  // Extract number like "8.5", "8/10", "9"
  const match = scoreText.match(/(\d+(?:\.\d+)?)\s*(?:\/\s*10)?/);
  const targetScore = match ? parseFloat(match[1]) : null;
  const [displayScore, setDisplayScore] = useState<number>(0);

  // Extract description/rationale after score
  const rationale = scoreText
    .replace(/^.*?(\d+(?:\.\d+)?\s*(?:\/\s*10)?\s*[-–:]?\s*)/i, "")
    .replace(/\*\*/g, "")
    .trim();

  useEffect(() => {
    if (targetScore === null) return;
    const duration = 1200; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = easeOut * targetScore;
      setDisplayScore(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayScore(targetScore);
      }
    };

    requestAnimationFrame(animate);
  }, [targetScore]);

  if (targetScore === null) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700">
        <Markdown content={scoreText} />
      </div>
    );
  }

  // Dynamic colors based on score
  let scoreColorStyles = "text-emerald-600 bg-emerald-50 border-emerald-300";
  let badgeLabel = "High Quality Tier";
  let badgeBg = "bg-emerald-100 text-emerald-800";

  if (targetScore < 5) {
    scoreColorStyles = "text-rose-600 bg-rose-50 border-rose-300";
    badgeLabel = "High Risk / Restrictive";
    badgeBg = "bg-rose-100 text-rose-800";
  } else if (targetScore < 8) {
    scoreColorStyles = "text-amber-600 bg-amber-50 border-amber-300";
    badgeLabel = "Moderate Coverage";
    badgeBg = "bg-amber-100 text-amber-800";
  }

  return (
    <div className="mb-6 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between shadow-xs">
      <div className="flex items-center gap-4">
        <div
          className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl border-2 flex flex-col items-center justify-center shadow-sm shrink-0 ${scoreColorStyles}`}
        >
          <span className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
            {displayScore.toFixed(1)}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 mt-0.5">
            / 10 Score
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-base font-bold text-slate-900">Overall Policy Evaluation</h4>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeBg}`}>
              {badgeLabel}
            </span>
          </div>
          {rationale && (
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
              {rationale}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Tag extractor helper
function extractTagContent(content: string, tagName: string): string | null {
  const startTag = `<${tagName}>`;
  const endTag = `</${tagName}>`;
  const startIdx = content.indexOf(startTag);
  const endIdx = content.indexOf(endTag);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return content.slice(startIdx + startTag.length, endIdx).trim();
  }
  return null;
}

// Section 4 Highlights Parser (Score, Strengths, Improvement Areas)
function Section4Scorecard({ content }: { content: string }) {
  // 1. Tag-based extraction
  let overallRatingText = extractTagContent(content, "OVERALL_RATING") || "";
  let coreStrengthsContent = extractTagContent(content, "CORE_STRENGTHS") || "";
  let improvementAreasContent = extractTagContent(content, "IMPROVEMENT_AREAS") || "";

  // 2. Fallback if boundary tags were missing in older / unformatted outputs
  if (!overallRatingText || !coreStrengthsContent || !improvementAreasContent) {
    const lines = content.split("\n");
    let currentMode: "none" | "strengths" | "weaknesses" = "none";
    const fallbackStrengths: string[] = [];
    const fallbackWeaknesses: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || /^###?\s*Scorecard/i.test(line)) continue;

      if (
        !overallRatingText &&
        (/\*\*(?:Overall Rating|Rating|Score)\*\*/i.test(line) ||
          /^-\s*\*\*(?:Overall Rating|Rating|Score)\*\*/i.test(line))
      ) {
        overallRatingText = line;
        currentMode = "none";
        continue;
      }

      if (
        /\*\*(?:Core Strengths|Strengths|Key Advantages)\*\*/i.test(line) ||
        /^-\s*\*\*(?:Core Strengths|Strengths|Key Advantages)\*\*/i.test(line)
      ) {
        currentMode = "strengths";
        const colonIdx = line.indexOf(":");
        if (colonIdx !== -1) {
          const remainder = line.slice(colonIdx + 1).trim();
          if (remainder) fallbackStrengths.push(remainder);
        }
        continue;
      }

      if (
        /\*\*(?:Improvement Areas|Weaknesses|Drawbacks|Key Limitations|Red Flags)\*\*/i.test(line) ||
        /^-\s*\*\*(?:Improvement Areas|Weaknesses|Drawbacks|Key Limitations|Red Flags)\*\*/i.test(line)
      ) {
        currentMode = "weaknesses";
        const colonIdx = line.indexOf(":");
        if (colonIdx !== -1) {
          const remainder = line.slice(colonIdx + 1).trim();
          if (remainder) fallbackWeaknesses.push(remainder);
        }
        continue;
      }

      if (currentMode === "strengths") {
        fallbackStrengths.push(line);
      } else if (currentMode === "weaknesses") {
        fallbackWeaknesses.push(line);
      }
    }

    if (!coreStrengthsContent && fallbackStrengths.length > 0) {
      coreStrengthsContent = fallbackStrengths.join("\n");
    }
    if (!improvementAreasContent && fallbackWeaknesses.length > 0) {
      improvementAreasContent = fallbackWeaknesses.join("\n");
    }
  }

  return (
    <div className="space-y-6">
      {/* Animated Rating Card */}
      {overallRatingText && <AnimatedScoreCard scoreText={overallRatingText} />}

      {/* Dual Cards for Strengths vs Improvement Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Core Strengths Card */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-5 text-emerald-950 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-emerald-200/60">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <h4 className="font-bold text-base text-emerald-900">Core Strengths</h4>
            </div>

            {coreStrengthsContent ? (
              <Markdown
                variant="inherit"
                listIconType="check"
                content={coreStrengthsContent}
              />
            ) : (
              <p className="text-xs text-emerald-700 italic">No notable core strengths identified for this policy.</p>
            )}
          </div>
        </div>

        {/* Improvement Areas Card */}
        <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-5 text-rose-950 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-rose-200/60">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <h4 className="font-bold text-base text-rose-900">Improvement Areas</h4>
            </div>

            {improvementAreasContent ? (
              <Markdown
                variant="inherit"
                listIconType="alert"
                content={improvementAreasContent}
              />
            ) : (
              <p className="text-xs text-rose-700 italic">No major red flags or critical limitations identified for this policy.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Function to clean markdown of redundant headers matching card title
function cleanSectionContent(raw: string, headerPattern: RegExp): string {
  const lines = raw.split("\n");
  const filtered = lines.filter((line) => !headerPattern.test(line.trim()));
  return filtered.join("\n").trim();
}

export function AnalysisReport({ analysis, parsedData }: AnalysisReportProps) {
  if (!analysis) return null;

  // Extract sections using tag matching
  const extractSection = (secNum: number): string | null => {
    const startTag = `<Section_${secNum}>`;
    const endTag = `</Section_${secNum}>`;
    const startIdx = analysis.indexOf(startTag);
    const endIdx = analysis.indexOf(endTag);

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      return analysis.slice(startIdx + startTag.length, endIdx).trim();
    }
    return null;
  };

  const section1 = extractSection(1);
  const section2 = extractSection(2);
  const section3 = extractSection(3);
  const section4 = extractSection(4);
  const section5 = extractSection(5);
  const section6 = extractSection(6);

  // Fallback: If no section tags were generated, render raw markdown
  const hasSections = section1 || section2 || section3 || section4 || section5 || section6;

  if (!hasSections) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-10 shadow-sm max-w-4xl mx-auto w-full">
        <Markdown content={analysis} />
      </div>
    );
  }

  // Derive insurer name for Section 3 logo
  const issuer =
    parsedData?.policy_classification?.policy_issuer ||
    (() => {
      if (!section1) return "";
      const match = section1.match(/\*\*Insurer:\*\*\s*([^\n\r]+)/i);
      return match ? match[1].replace(/[`*]/g, "").trim() : "";
    })();

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
      
      {/* 2. Top Row: Section 1 & Section 2 Side-by-Side Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Section 1: Policy Overview & Insurer Profile */}
        {section1 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                <Shield className="w-5 h-5 text-blue-600 shrink-0" />
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Policy Overview & Insurer Profile
                </h3>
              </div>
              <div className="text-sm text-slate-700 leading-relaxed">
                <Markdown content={cleanSectionContent(section1, /^###?\s*Policy Overview/i)} />
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Policyholder Snapshot */}
        {section2 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                <Users className="w-5 h-5 text-indigo-600 shrink-0" />
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Policyholder Snapshot
                </h3>
              </div>
              <div className="text-sm text-slate-700 leading-relaxed">
                <Markdown content={cleanSectionContent(section2, /^###?\s*Policyholder Snapshot/i)} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Section 3: Verified Market Stats with Insurer Logo */}
      {section3 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm">
          {/* Header Flex Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Verified Market Stats
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Source: IRDAI Annual Report / Statutory Disclosures
                </p>
              </div>
            </div>

            {/* Insurer Logo / Initial Badge */}
            {issuer && <InsurerLogoBadge issuer={issuer} />}
          </div>

          <div className="text-sm sm:text-base text-slate-700 leading-relaxed">
            <Markdown
              content={cleanSectionContent(
                section3,
                /^###?\s*Verified Market Stats|^\*Source:\s*IRDAI/i
              )}
            />
          </div>
        </div>
      )}

      {/* 4. Section 4: Scorecard & Highlights */}
      {section4 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2.5 mb-5 pb-3.5 border-b border-slate-100">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Scorecard & Highlights
            </h3>
          </div>

          <Section4Scorecard content={section4} />
        </div>
      )}

      {/* 5. Section 5: Critical Clause Breakdown */}
      {section5 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2.5 mb-5 pb-3.5 border-b border-slate-100">
            <FileText className="w-5 h-5 text-purple-600 shrink-0" />
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Critical Clause Breakdown
            </h3>
          </div>

          <div className="text-sm sm:text-base text-slate-700 leading-relaxed">
            <Markdown content={cleanSectionContent(section5, /^###?\s*Critical Clause Breakdown/i)} />
          </div>
        </div>
      )}

      {/* 6. Section 6: Dedicated Standalone Actionable Consumer Verdict */}
      {section6 && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-800">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0">
              <Gavel className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Actionable Consumer Verdict
              </h3>
              <p className="text-xs text-slate-400">
                Decisive consumer recommendation on whether to retain, port, upgrade, or replace the policy
              </p>
            </div>
          </div>

          <div className="text-sm sm:text-base text-slate-200 leading-relaxed prose-invert">
            <Markdown variant="dark" content={cleanSectionContent(section6, /^###?\s*Actionable (?:Consumer )?Verdict/i)} />
          </div>
        </div>
      )}

    </div>
  );
}
