"use client";

import React, { useState, useRef } from "react";
import { ExternalLink } from "lucide-react";

interface SourceCitationPillProps {
  label?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceDomain?: string;
  sourceIndex?: number | string;
  pincode?: string | number;
}

export function SourceCitationPill({
  label = "Ministry of Statistics and Programme Implementation",
  sourceUrl = "https://datainnovation.mospi.gov.in/mospi-mcp",
  sourceTitle = "MoSPI MCP",
  sourceDomain = "datainnovation.mospi.gov.in",
  sourceIndex = "1",
  pincode,
}: SourceCitationPillProps) {
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  return (
    <span
      className="relative inline-block align-baseline"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Pill */}
      <span className="inline-flex items-center gap-1 px-2 py-0.5 ml-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-200 transition-colors select-none">
        {label}
        {pincode && <span className="text-slate-400 font-normal">({pincode})</span>}
      </span>

      {/* Floating Popover Card */}
      {isHovered && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-72 text-left animate-in fade-in zoom-in-95 duration-150"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header Line */}
          <div className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
            <span>Source · {sourceIndex}</span>
          </div>

          {/* Clickable Source Row */}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-slate-50 p-1.5 rounded-lg flex items-center justify-between group transition-colors block"
          >
            <div className="min-w-0 pr-2">
              <div className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                {sourceTitle}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {sourceDomain}
              </div>
            </div>

            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" />
          </a>

          {/* Subtle arrow pointer */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-white border-b border-r border-slate-200 rotate-45" />
        </div>
      )}
    </span>
  );
}
