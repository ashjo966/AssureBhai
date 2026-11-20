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
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calculator,
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
  isStreaming?: boolean;
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
  // Robust regex parser for extracting <OVERALL_RATING> score
  const match =
    scoreText.match(/(?:overall\s*rating|rating|score)?[:\s*]*(\d+(?:\.\d+)?)\s*(?:\/\s*10|\s*out of\s*10)?/i) ||
    scoreText.match(/(\d+(?:\.\d+)?)\s*(?:\/\s*10)?/);
  const rawScore = match ? parseFloat(match[1]) : null;
  const targetScore = rawScore !== null && !isNaN(rawScore) ? Math.min(Math.max(rawScore, 1.0), 10.0) : null;
  const [displayScore, setDisplayScore] = useState<number>(0);

  const firstLine = scoreText.split("\n")[0] || scoreText;
  const rationale = firstLine
    .replace(/^.*?(\d+(?:\.\d+)?\s*(?:\/\s*10)?\s*[-–:]?\s*)/i, "")
    .replace(/\*\*/g, "")
    .trim();

  useEffect(() => {
    if (targetScore === null) return;
    const duration = 1000; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
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

  // Dynamic Tier & Color Badges:
  // >= 8.0: Green (High Quality Tier)
  // 6.0 - 7.9: Amber (Moderate Coverage)
  // < 6.0: Red (High Risk / Restrictive)
  let scoreColorStyles = "text-emerald-600 bg-emerald-50 border-emerald-300";
  let badgeLabel = "High Quality Tier";
  let badgeBg = "bg-emerald-100 text-emerald-800";

  if (targetScore < 6.0) {
    scoreColorStyles = "text-rose-600 bg-rose-50 border-rose-300";
    badgeLabel = "High Risk / Restrictive";
    badgeBg = "bg-rose-100 text-rose-800";
  } else if (targetScore < 8.0) {
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

// Tag extractor helper (supports case-insensitivity, whitespace, complete and streaming partial tags)
function extractTagContent(content: string, tagName: string): string | null {
  if (!content) return null;

  const startRegex = new RegExp(`<${tagName}\\s*>`, "i");
  const startMatch = content.match(startRegex);
  if (!startMatch || startMatch.index === undefined) return null;

  const contentStart = startMatch.index + startMatch[0].length;
  const rest = content.slice(contentStart);

  const endRegex = new RegExp(`<\\/${tagName}\\s*>`, "i");
  const endMatch = rest.match(endRegex);
  if (endMatch && endMatch.index !== undefined) {
    return rest.slice(0, endMatch.index).trim();
  }

  // If end tag not found yet (streaming/partial), slice to next tag or end of string
  const nextTagMatch = rest.search(/<[a-zA-Z0-9_]+/);
  if (nextTagMatch !== -1) {
    return rest.slice(0, nextTagMatch).replace(/<\/?[^>]+>$/, "").trim();
  }

  return rest.replace(/<\/?[a-zA-Z0-9_]*$/, "").trim();
}

interface CriterionItem {
  title: string;
  explanation: string;
  isActiveDeduction: boolean;
  badgeText: string;
}

function cleanMarkdownText(str: string): string {
  if (!str) return "";
  return str
    .replace(/^\*+|\*+$/g, "")
    .replace(/^[:\s—-]+|[:\s—-]+$/g, "")
    .replace(/^\*+|\*+$/g, "")
    .trim();
}

function parseCriterionLine(line: string): CriterionItem | null {
  // Strip bullet markers (-, *, •, 1., etc.) without consuming bold markdown markers
  const clean = line.replace(/^[\s\t]*(?:[-*•]|\d+[.)])\s+/, "").trim();
  if (!clean) return null;

  let title = "";
  let remainder = clean;

  // 1. Extract Criterion Title
  const boldMatch = clean.match(/^\*\*([^*]+)\*\*[:\s—\-]*\s*/);
  if (boldMatch) {
    title = boldMatch[1];
    remainder = clean.slice(boldMatch[0].length).trim();
  } else {
    const colonIdx = clean.indexOf(":");
    if (colonIdx > 0 && colonIdx < 60) {
      title = clean.slice(0, colonIdx);
      remainder = clean.slice(colonIdx + 1).trim();
    }
  }

  // Strip all leading/trailing bold markers, colons, and whitespace from title
  title = cleanMarkdownText(title);

  // 2. Extract Trailing Deduction Tag
  // Check for trailing "No deduction" first (e.g., `No deduction (-0.0)`, `No deduction`, [No deduction (-0.0)], No deduction.)
  const trailingNoDeductionRegex = /(?:`|\(|\[)*\s*(no\s+deduction(?:\s*\(-?0(?:\.0+)?\))?)\.?\s*(?:`|\)|\])*\.?$/i;

  // Check for trailing numeric deduction (e.g., `-0.5 deduction`, `[-1.0 deduction]`, `(-0.5 pts)`, `-0.5 deduction.`, `-0.5 points`)
  const trailingDeductionRegex = /(?:`|\(|\[)*\s*(-?\d+(?:\.\d+)?)\s*(?:deductions?|pts?|points?)\.?\s*(?:`|\)|\])*\.?$/i;
  const trailingBracketedNumRegex = /(?:`|\[|\()\s*(-[0-9]+(?:\.[0-9]+)?)\.?\s*(?:`|\]|\))\.?$/i;

  let explanation = remainder.trim();
  let isActiveDeduction = false;
  let badgeText = "No deduction (0.0)";

  const zeroMatch = explanation.match(trailingNoDeductionRegex);
  const numMatch = explanation.match(trailingDeductionRegex) || explanation.match(trailingBracketedNumRegex);

  if (zeroMatch && zeroMatch.index !== undefined) {
    isActiveDeduction = false;
    badgeText = "No deduction (0.0)";
    explanation = explanation.slice(0, zeroMatch.index).trim();
  } else if (numMatch && numMatch.index !== undefined) {
    const parsedVal = parseFloat(numMatch[1]);
    if (!isNaN(parsedVal) && Math.abs(parsedVal) > 0) {
      isActiveDeduction = true;
      const formatted = parsedVal < 0 ? parsedVal.toFixed(1) : `-${parsedVal.toFixed(1)}`;
      badgeText = `${formatted} pts`;
      explanation = explanation.slice(0, numMatch.index).trim();
    } else {
      isActiveDeduction = false;
      badgeText = "No deduction (0.0)";
      explanation = explanation.slice(0, numMatch.index).trim();
    }
  } else {
    // Check if deduction token is embedded anywhere in the line
    const generalZeroMatch = explanation.match(/(?:`|\(|\[)?\bno\s+deduction(?:\s*\(-?0(?:\.0+)?\))?(?:`|\)|\])?/i);
    const generalNumMatch = explanation.match(/(?:`|\(|\[)\s*(-?\d+(?:\.\d+)?)\s*(?:deductions?|pts?|points?)\.?\s*(?:`|\)|\])/i) ||
                            explanation.match(/\b(-[0-9]+(?:\.[0-9]+)?)\s*(?:deductions?|pts?|points?)\b/i);

    if (generalZeroMatch && generalZeroMatch.index !== undefined) {
      isActiveDeduction = false;
      badgeText = "No deduction (0.0)";
      explanation = (explanation.slice(0, generalZeroMatch.index) + " " + explanation.slice(generalZeroMatch.index + generalZeroMatch[0].length)).trim();
    } else if (generalNumMatch && generalNumMatch.index !== undefined) {
      const parsedVal = parseFloat(generalNumMatch[1]);
      if (!isNaN(parsedVal) && Math.abs(parsedVal) > 0) {
        isActiveDeduction = true;
        const formatted = parsedVal < 0 ? parsedVal.toFixed(1) : `-${parsedVal.toFixed(1)}`;
        badgeText = `${formatted} pts`;
        explanation = (explanation.slice(0, generalNumMatch.index) + " " + explanation.slice(generalNumMatch.index + generalNumMatch[0].length)).trim();
      }
    }
  }

  // Strip all leading/trailing bold markers, colons, and whitespace from explanation
  explanation = cleanMarkdownText(explanation);
  explanation = explanation.replace(/`([^`]+)`/g, "$1").trim();
  explanation = explanation.replace(/[-—:,]+$/, "").trim();
  if (explanation && !/[.!?]$/.test(explanation)) {
    explanation += ".";
  }

  if (!title && explanation) {
    title = "Policy Evaluation";
  }

  return {
    title,
    explanation,
    isActiveDeduction,
    badgeText,
  };
}

// Dedicated React UI Renderer for <DEDUCTION_BREAKDOWN>
function ScoreBreakdownCard({ content }: { content: string }) {
  const lines = content.split("\n");
  let totalDeductionsLine = "";
  let finalRatingLine = "";
  const criteria: CriterionItem[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip redundant title/header lines inside the block
    if (/^\*?\*?#*\s*(?:Scoring Mathematical Breakdown|Score Breakdown|Mathematical Breakdown|Deduction Breakdown)/i.test(line)) {
      continue;
    }

    // Detect Total Deductions Applied
    if (/Total Deductions?(?:\s+Applied)?/i.test(line)) {
      totalDeductionsLine = line;
      continue;
    }

    // Detect Final Computed Rating
    if (/Final Computed (?:Rating|Score)|Final (?:Rating|Score)/i.test(line)) {
      finalRatingLine = line;
      continue;
    }

    // Parse criterion line into structured title, explanation, and deduction
    const parsed = parseCriterionLine(line);
    if (parsed) {
      criteria.push(parsed);
    }
  }

  const parseSummaryPart = (line: string) => {
    const clean = line.replace(/^[-*•\s]+/, "").trim();
    const colonIdx = clean.indexOf(":");
    if (colonIdx > 0) {
      const label = clean.slice(0, colonIdx).replace(/\*+/g, "").trim();
      const val = clean.slice(colonIdx + 1).replace(/\*+/g, "").trim();
      return { label, val };
    }
    return { label: "", val: clean };
  };

  const totalDeductions = totalDeductionsLine ? parseSummaryPart(totalDeductionsLine) : null;
  const finalRating = finalRatingLine ? parseSummaryPart(finalRatingLine) : null;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
      {/* Card Header Title */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Calculator className="w-4 h-4" />
        </div>
        <h4 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
          Score Breakdown (Base Score: 10.0)
        </h4>
      </div>

      {/* Clean, Scannable Rows (divide-y divide-slate-100, NO bullet dots) */}
      <div className="divide-y divide-slate-100">
        {criteria.map((item, idx) => {
          if (item.isActiveDeduction) {
            return (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 px-4 bg-rose-50/60 border-l-4 border-rose-500 transition-colors"
              >
                {/* Left Column (Icon + Text) */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-slate-900 font-semibold text-sm">
                      {item.title}
                    </h5>
                    <p className="text-slate-700 text-sm mt-0.5 leading-relaxed">
                      {item.explanation}
                    </p>
                  </div>
                </div>

                {/* Right Column (Aligned Status Pill Badge) */}
                <div className="shrink-0 self-start sm:self-center ml-8 sm:ml-0">
                  <span className="inline-flex items-center bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 rounded-full text-xs font-bold shadow-xs whitespace-nowrap">
                    {item.badgeText}
                  </span>
                </div>
              </div>
            );
          }

          // Zero deduction item
          return (
            <div
              key={idx}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 px-4 hover:bg-slate-50/70 transition-colors"
            >
              {/* Left Column (Icon + Text) */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h5 className="text-slate-900 font-semibold text-sm">
                    {item.title}
                  </h5>
                  <p className="text-slate-600 text-sm mt-0.5 leading-relaxed">
                    {item.explanation}
                  </p>
                </div>
              </div>

              {/* Right Column (Aligned Status Pill Badge) */}
              <div className="shrink-0 self-start sm:self-center ml-8 sm:ml-0">
                <span className="inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                  No deduction (0.0)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer Bar */}
      {(totalDeductions || finalRating) && (
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 rounded-b-xl flex flex-wrap justify-between items-center text-sm font-semibold gap-3">
          {totalDeductions && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-medium">
                {totalDeductions.label || "Total Deductions Applied"}:
              </span>
              <span className="text-rose-700 font-bold bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                {totalDeductions.val}
              </span>
            </div>
          )}

          {finalRating && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-medium">
                {finalRating.label || "Final Computed Rating"}:
              </span>
              <span className="text-indigo-700 font-extrabold bg-indigo-50 px-3 py-0.5 rounded-full border border-indigo-200">
                {finalRating.val}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Section 4 Highlights Parser (Score, Mathematical Deductions, Strengths, Improvement Areas)
function Section4Scorecard({ content }: { content: string }) {
  let overallRatingText = extractTagContent(content, "OVERALL_RATING") || "";
  let deductionBreakdown = extractTagContent(content, "DEDUCTION_BREAKDOWN") || "";
  let coreStrengthsContent = extractTagContent(content, "CORE_STRENGTHS") || "";
  let improvementAreasContent = extractTagContent(content, "IMPROVEMENT_AREAS") || "";

  // Support case where deduction breakdown is included inside OVERALL_RATING tag
  if (!deductionBreakdown && overallRatingText.includes("\n")) {
    const lines = overallRatingText.split("\n");
    if (lines.length > 1) {
      overallRatingText = lines[0];
      deductionBreakdown = lines.slice(1).join("\n").trim();
    }
  }

  // Fallback if boundary tags were missing in older / unformatted outputs
  if (!overallRatingText && !deductionBreakdown && !coreStrengthsContent && !improvementAreasContent) {
    const lines = content.split("\n");
    let currentMode: "none" | "deductions" | "strengths" | "weaknesses" = "none";
    const fallbackDeductions: string[] = [];
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
        /\*\*(?:Scoring Mathematical Breakdown|Deduction Breakdown|Deductions Applied)\*\*/i.test(line) ||
        /^-\s*\*\*(?:Scoring Mathematical Breakdown|Deduction Breakdown|Deductions Applied)\*\*/i.test(line)
      ) {
        currentMode = "deductions";
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

      if (currentMode === "deductions") {
        fallbackDeductions.push(line);
      } else if (currentMode === "strengths") {
        fallbackStrengths.push(line);
      } else if (currentMode === "weaknesses") {
        fallbackWeaknesses.push(line);
      }
    }

    if (!deductionBreakdown && fallbackDeductions.length > 0) {
      deductionBreakdown = fallbackDeductions.join("\n");
    }
    if (!coreStrengthsContent && fallbackStrengths.length > 0) {
      coreStrengthsContent = fallbackStrengths.join("\n");
    }
    if (!improvementAreasContent && fallbackWeaknesses.length > 0) {
      improvementAreasContent = fallbackWeaknesses.join("\n");
    }
  }

  // If none extracted yet and raw content exists, render raw markdown
  if (!overallRatingText && !deductionBreakdown && !coreStrengthsContent && !improvementAreasContent && content.trim()) {
    return (
      <div className="text-sm text-slate-700 leading-relaxed">
        <Markdown content={content} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Animated Rating Card */}
      {overallRatingText && <AnimatedScoreCard scoreText={overallRatingText} />}

      {/* Score Breakdown Card */}
      {deductionBreakdown && <ScoreBreakdownCard content={deductionBreakdown} />}

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
              <p className="text-xs text-emerald-700 italic">Evaluating policy strengths...</p>
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
              <p className="text-xs text-rose-700 italic">Evaluating policy limitations...</p>
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

// Reusable Skeleton Card for sections waiting to be generated
function CardSkeleton({
  icon: Icon,
  title,
  subtitle,
  dark = false,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 sm:p-7 shadow-xs transition-all duration-300 ${
        dark
          ? "bg-slate-900 border-slate-800 text-white"
          : "bg-white border-slate-200/70"
      }`}
    >
      <div
        className={`flex items-center justify-between pb-3.5 mb-4 border-b ${
          dark ? "border-slate-800" : "border-slate-100"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon className={`w-5 h-5 ${dark ? "text-amber-400" : "text-slate-400"}`} />
          <div>
            <h3
              className={`text-base sm:text-lg font-bold ${
                dark ? "text-white" : "text-slate-700"
              }`}
            >
              {title}
            </h3>
            {subtitle && (
              <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-400"}`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50/80 text-indigo-600 text-[11px] font-semibold animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Generating...</span>
        </div>
      </div>

      {/* Shimmer Placeholder Lines */}
      <div className="space-y-3 animate-pulse">
        <div className={`h-4 rounded-md w-3/4 ${dark ? "bg-slate-800" : "bg-slate-100"}`} />
        <div className={`h-4 rounded-md w-full ${dark ? "bg-slate-800/70" : "bg-slate-100/80"}`} />
        <div className={`h-4 rounded-md w-5/6 ${dark ? "bg-slate-800/50" : "bg-slate-100/60"}`} />
      </div>
    </div>
  );
}

export function AnalysisReport({ analysis, parsedData, isStreaming = false }: AnalysisReportProps) {
  // Extract sections using regex/tag matching with real-time streaming support
  const extractStreamingSection = (
    secNum: number
  ): { content: string; isComplete: boolean } | null => {
    if (!analysis) return null;
    const startTag = `<Section_${secNum}>`;
    const endTag = `</Section_${secNum}>`;

    const startIdx = analysis.indexOf(startTag);
    if (startIdx === -1) return null;

    const contentStart = startIdx + startTag.length;
    const endIdx = analysis.indexOf(endTag, contentStart);

    if (endIdx !== -1) {
      return {
        content: analysis.slice(contentStart, endIdx).trim(),
        isComplete: true,
      };
    }

    // Check if next section already started
    const nextTagRegex = new RegExp(`<Section_[${secNum + 1}-9]>`);
    const nextTagMatch = analysis.slice(contentStart).search(nextTagRegex);
    if (nextTagMatch !== -1) {
      return {
        content: analysis
          .slice(contentStart, contentStart + nextTagMatch)
          .replace(/<\/?[^>]+>$/, "")
          .trim(),
        isComplete: true,
      };
    }

    // Currently streaming this section
    const liveContent = analysis
      .slice(contentStart)
      .replace(/<\/?[a-zA-Z0-9_]*$/, "")
      .trim();

    return {
      content: liveContent,
      isComplete: false,
    };
  };

  const sec1 = extractStreamingSection(1);
  const sec2 = extractStreamingSection(2);
  const sec3 = extractStreamingSection(3);
  const sec4 = extractStreamingSection(4);
  const sec5 = extractStreamingSection(5);
  const sec6 = extractStreamingSection(6);

  const hasAnySection = !!(sec1 || sec2 || sec3 || sec4 || sec5 || sec6);

  // Fallback: If no section tags were found and streaming is done, render raw markdown
  if (!hasAnySection && !isStreaming && analysis) {
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
      if (!sec1?.content) return "";
      const match = sec1.content.match(/\*\*Insurer:\*\*\s*([^\n\r]+)/i);
      return match ? match[1].replace(/[`*]/g, "").trim() : "";
    })();

  const isGenerating = isStreaming || !hasAnySection;

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
      
      {/* 2. Top Row: Section 1 & Section 2 Side-by-Side Grid - Immediately visible skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Section 1: Policy Overview & Insurer Profile */}
        {sec1 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-blue-600 shrink-0" />
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Policy Overview & Insurer Profile
                  </h3>
                </div>
                {!sec1.isComplete && isStreaming && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                )}
              </div>
              <div className="text-sm text-slate-700 leading-relaxed">
                <Markdown content={cleanSectionContent(sec1.content, /^###?\s*Policy Overview/i)} />
              </div>
            </div>
          </div>
        ) : isGenerating ? (
          <CardSkeleton icon={Shield} title="Policy Overview & Insurer Profile" />
        ) : null}

        {/* Section 2: Policyholder Snapshot */}
        {sec2 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-indigo-600 shrink-0" />
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Policyholder Snapshot
                  </h3>
                </div>
                {!sec2.isComplete && isStreaming && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                )}
              </div>
              <div className="text-sm text-slate-700 leading-relaxed">
                <Markdown content={cleanSectionContent(sec2.content, /^###?\s*Policyholder Snapshot/i)} />
              </div>
            </div>
          </div>
        ) : isGenerating ? (
          <CardSkeleton icon={Users} title="Policyholder Snapshot" />
        ) : null}
      </div>

      {/* 3. Section 3: Verified Market Stats with Insurer Logo */}
      {sec3 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Verified Market Stats
                  </h3>
                  {!sec3.isComplete && isStreaming && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Source: IRDAI Annual Report / Statutory Disclosures
                </p>
              </div>
            </div>

            {issuer && <InsurerLogoBadge issuer={issuer} />}
          </div>

          <div className="text-sm sm:text-base text-slate-700 leading-relaxed">
            <Markdown
              content={cleanSectionContent(
                sec3.content,
                /^###?\s*Verified Market Stats|^\*Source:\s*IRDAI/i
              )}
            />
          </div>
        </div>
      ) : isStreaming && (sec1 || sec2) ? (
        <CardSkeleton
          icon={BarChart3}
          title="Verified Market Stats"
          subtitle="Source: IRDAI Annual Report / Statutory Disclosures"
        />
      ) : null}

      {/* 4. Section 4: Scorecard & Highlights */}
      {sec4 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Scorecard & Highlights
              </h3>
            </div>
            {!sec4.isComplete && isStreaming && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>

          <Section4Scorecard content={sec4.content} />
        </div>
      ) : isStreaming && sec3 ? (
        <CardSkeleton icon={Sparkles} title="Scorecard & Highlights" />
      ) : null}

      {/* 5. Section 5: Critical Clause Breakdown */}
      {sec5 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-purple-600 shrink-0" />
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Critical Clause Breakdown
              </h3>
            </div>
            {!sec5.isComplete && isStreaming && (
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
            )}
          </div>

          <div className="text-sm sm:text-base text-slate-700 leading-relaxed">
            <Markdown content={cleanSectionContent(sec5.content, /^###?\s*Critical Clause Breakdown/i)} />
          </div>
        </div>
      ) : isStreaming && sec4 ? (
        <CardSkeleton icon={FileText} title="Critical Clause Breakdown" />
      ) : null}

      {/* 6. Section 6: Dedicated Standalone Actionable Consumer Verdict */}
      {sec6 ? (
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-800 transition-all duration-300">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
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
            {!sec6.isComplete && isStreaming && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>

          <div className="text-sm sm:text-base text-slate-200 leading-relaxed prose-invert">
            <Markdown variant="dark" content={cleanSectionContent(sec6.content, /^###?\s*Actionable (?:Consumer )?Verdict/i)} />
          </div>
        </div>
      ) : isStreaming && sec5 ? (
        <CardSkeleton
          icon={Gavel}
          title="Actionable Consumer Verdict"
          subtitle="Decisive consumer recommendation on whether to retain, port, upgrade, or replace the policy"
          dark
        />
      ) : null}

    </div>
  );
}
