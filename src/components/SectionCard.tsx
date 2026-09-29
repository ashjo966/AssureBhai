"use client";

import React from "react";
import { Markdown } from "@/components/markdown";

interface SectionCardProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  content: string;
  badge?: React.ReactNode;
  variant?: "default" | "dark";
  className?: string;
}

export function SectionCard({
  icon,
  title,
  subtitle,
  content,
  badge,
  variant = "default",
  className = "",
}: SectionCardProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={`rounded-2xl p-6 sm:p-8 shadow-sm transition-all ${
        isDark
          ? "bg-slate-900 text-white border border-slate-800 shadow-md"
          : "bg-white text-slate-800 border border-slate-200/80"
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-start gap-2.5">
          {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
          <div>
            <h3 className="text-lg font-bold tracking-tight">{title}</h3>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {badge && <div>{badge}</div>}
      </div>

      <div className="text-sm sm:text-base leading-relaxed">
        <Markdown variant={isDark ? "dark" : "default"} content={content} />
      </div>
    </div>
  );
}
