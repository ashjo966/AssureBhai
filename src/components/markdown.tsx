import React from "react";
import { Check, AlertCircle } from "lucide-react";
import { SourceCitationPill } from "@/components/SourceCitationPill";

interface MarkdownProps {
  content: string;
  variant?: "default" | "dark" | "inherit";
  listIconType?: "check" | "alert" | "none";
  className?: string;
}

interface ListItemNode {
  text: string;
  type: "ul" | "ol";
  level: number;
  children: ListItemNode[];
}

export function Markdown({
  content,
  variant = "default",
  listIconType = "none",
  className = "",
}: MarkdownProps) {
  if (!content) return null;

  const isDark = variant === "dark";
  const isInherit = variant === "inherit";

  // Parse inline elements: MoSPI Citation Pills, Markdown links [text](url), bold **text**, italics *text*, and inline `code`
  const renderInline = (text: string): React.ReactNode => {
    // Regex matching:
    // 1. [MOSPI_SOURCE_PILL]
    // 2. [Source: [text](url)]
    // 3. Links: [text](url)
    // 4. Bold: **text**
    // 5. Italics: *text*
    // 6. Code: `code`
    const tokenRegex =
      /(\[MOSPI_SOURCE_PILL\]|\[Source:\s*\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s\)]+)\)\]|\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s\)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;

    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index));
      }

      const fullMatch = match[0];
      const sourcePillLinkText = match[2];
      const sourcePillLinkUrl = match[3];
      const standardLinkText = match[4];
      const standardLinkUrl = match[5];
      const boldText = match[6];
      const italicText = match[7];
      const codeText = match[8];

      const key = `inline-${match.index}`;

      if (fullMatch === "[MOSPI_SOURCE_PILL]") {
        nodes.push(<SourceCitationPill key={key} />);
      } else if (sourcePillLinkText && sourcePillLinkUrl) {
        nodes.push(
          <SourceCitationPill
            key={key}
            label={sourcePillLinkText}
            sourceUrl={sourcePillLinkUrl}
          />
        );
      } else if (standardLinkText && standardLinkUrl) {
        // If the link points to MoSPI or mentions Ministry of Statistics, render as Citation Pill
        if (
          standardLinkUrl.includes("mospi.gov.in") ||
          standardLinkText.toLowerCase().includes("ministry of statistics")
        ) {
          nodes.push(
            <SourceCitationPill
              key={key}
              label={standardLinkText}
              sourceUrl={standardLinkUrl}
            />
          );
        } else {
          nodes.push(
            <a
              key={key}
              href={standardLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={
                isDark
                  ? "text-indigo-400 underline hover:text-indigo-300 font-medium transition-colors"
                  : "text-blue-600 underline hover:text-blue-800 font-medium transition-colors"
              }
            >
              {renderInline(standardLinkText)}
            </a>
          );
        }
      } else if (boldText !== undefined) {
        nodes.push(
          <strong
            key={key}
            className={`font-semibold ${
              isDark ? "text-white" : isInherit ? "text-inherit" : "text-slate-900"
            }`}
          >
            {renderInline(boldText)}
          </strong>
        );
      } else if (italicText !== undefined) {
        nodes.push(
          <em
            key={key}
            className={`italic ${
              isDark ? "text-slate-300" : isInherit ? "opacity-80" : "text-slate-600"
            }`}
          >
            {renderInline(italicText)}
          </em>
        );
      } else if (codeText !== undefined) {
        nodes.push(
          <code
            key={key}
            className={`px-1.5 py-0.5 text-xs font-mono rounded ${
              isDark
                ? "bg-slate-800 text-indigo-300 border border-slate-700"
                : "bg-slate-100 text-indigo-700"
            }`}
          >
            {codeText}
          </code>
        );
      }

      lastIndex = match.index + fullMatch.length;
    }

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes.length === 1 ? nodes[0] : nodes;
  };

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let listBuffer: ListItemNode[] = [];
  let elementKey = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;

    const renderListTree = (items: ListItemNode[], isNested = false) => {
      const isOrdered = items[0]?.type === "ol";
      const ListTag = isOrdered ? "ol" : "ul";

      let listClass = "";
      if (isOrdered) {
        listClass = isNested
          ? "list-decimal ml-6 space-y-1.5 mt-1.5 mb-1"
          : `list-decimal ml-5 space-y-1.5 my-2 ${
              isDark ? "text-slate-200" : isInherit ? "text-inherit" : "text-slate-700"
            }`;
      } else {
        if (listIconType === "check") {
          listClass = isNested
            ? "list-none ml-6 space-y-2 mt-1.5 mb-1 text-emerald-900"
            : "list-none pl-0 my-2 space-y-2.5 leading-relaxed text-emerald-900";
        } else if (listIconType === "alert") {
          listClass = isNested
            ? "list-none ml-6 space-y-2 mt-1.5 mb-1 text-rose-900"
            : "list-none pl-0 my-2 space-y-2.5 leading-relaxed text-rose-900";
        } else {
          listClass = isNested
            ? "list-disc ml-6 space-y-1.5 mt-1.5 mb-1"
            : `list-disc ml-5 space-y-1.5 my-2 ${
                isDark ? "text-slate-200" : isInherit ? "text-inherit" : "text-slate-700"
              }`;
        }
      }

      return (
        <ListTag key={`list-${elementKey++}`} className={listClass}>
          {items.map((item, idx) => {
            if (listIconType === "check") {
              return (
                <li
                  key={`li-${elementKey++}-${idx}`}
                  className="flex items-start gap-2 leading-relaxed text-emerald-900"
                >
                  <Check className="w-4 h-4 text-emerald-600 inline mt-0.5 shrink-0" />
                  <div className="flex-1">
                    {renderInline(item.text)}
                    {item.children.length > 0 && renderListTree(item.children, true)}
                  </div>
                </li>
              );
            }

            if (listIconType === "alert") {
              return (
                <li
                  key={`li-${elementKey++}-${idx}`}
                  className="flex items-start gap-2 leading-relaxed text-rose-900"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 inline mt-0.5 shrink-0" />
                  <div className="flex-1">
                    {renderInline(item.text)}
                    {item.children.length > 0 && renderListTree(item.children, true)}
                  </div>
                </li>
              );
            }

            return (
              <li key={`li-${elementKey++}-${idx}`} className="leading-relaxed">
                {renderInline(item.text)}
                {item.children.length > 0 && renderListTree(item.children, true)}
              </li>
            );
          })}
        </ListTag>
      );
    };

    elements.push(renderListTree(listBuffer));
    listBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmedLine = rawLine.trim();

    if (trimmedLine === "") {
      flushList();
      continue;
    }

    // Dividers
    if (trimmedLine === "---" || trimmedLine === "***" || trimmedLine === "___") {
      flushList();
      elements.push(
        <hr
          key={`hr-${elementKey++}`}
          className={`my-6 ${isDark ? "border-slate-800" : "border-slate-200"}`}
        />
      );
      continue;
    }

    // Headers
    if (trimmedLine.startsWith("# ")) {
      flushList();
      elements.push(
        <h1
          key={`h1-${elementKey++}`}
          className={`text-2xl font-bold mt-6 mb-3 pb-2 border-b ${
            isDark ? "text-white border-slate-800" : "text-slate-900 border-slate-100"
          }`}
        >
          {renderInline(trimmedLine.slice(2))}
        </h1>
      );
    } else if (trimmedLine.startsWith("## ")) {
      flushList();
      elements.push(
        <h2
          key={`h2-${elementKey++}`}
          className={`text-xl font-bold mt-6 mb-3 pb-1 border-b ${
            isDark ? "text-white border-slate-800" : "text-slate-900 border-slate-100"
          }`}
        >
          {renderInline(trimmedLine.slice(3))}
        </h2>
      );
    } else if (trimmedLine.startsWith("### ")) {
      flushList();
      elements.push(
        <h3
          key={`h3-${elementKey++}`}
          className={`text-lg font-bold mt-5 mb-2.5 flex items-center gap-2 ${
            isDark ? "text-indigo-300" : "text-indigo-950"
          }`}
        >
          {renderInline(trimmedLine.slice(4))}
        </h3>
      );
    } else if (trimmedLine.startsWith("#### ")) {
      flushList();
      elements.push(
        <h4
          key={`h4-${elementKey++}`}
          className={`text-base font-semibold mt-4 mb-2 ${
            isDark ? "text-slate-200" : "text-slate-800"
          }`}
        >
          {renderInline(trimmedLine.slice(5))}
        </h4>
      );
    }
    // Blockquote
    else if (trimmedLine.startsWith("> ")) {
      flushList();
      elements.push(
        <blockquote
          key={`quote-${elementKey++}`}
          className={`my-3 pl-4 border-l-4 py-2.5 px-3 rounded-r-lg italic text-sm ${
            isDark
              ? "border-indigo-400 bg-indigo-950/40 text-slate-200"
              : "border-indigo-500 bg-indigo-50/50 text-slate-700"
          }`}
        >
          {renderInline(trimmedLine.slice(2))}
        </blockquote>
      );
    }
    // List Items (Bullet or Numbered, checking indentation)
    else if (/^(\s*)([-*]|\d+\.)\s+(.*)$/.test(rawLine)) {
      const listMatch = rawLine.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
      if (listMatch) {
        const indentLength = listMatch[1].length;
        const bullet = listMatch[2];
        const itemText = listMatch[3];
        const isOrdered = /^\d+\./.test(bullet);
        const isNested = indentLength >= 2 || listMatch[1].includes("\t");

        const node: ListItemNode = {
          text: itemText,
          type: isOrdered ? "ol" : "ul",
          level: isNested ? 1 : 0,
          children: [],
        };

        if (isNested && listBuffer.length > 0) {
          listBuffer[listBuffer.length - 1].children.push(node);
        } else {
          listBuffer.push(node);
        }
      }
    }
    // Regular paragraphs
    else {
      flushList();
      elements.push(
        <p
          key={`p-${elementKey++}`}
          className={`my-2.5 leading-relaxed ${
            isDark ? "text-slate-200" : isInherit ? "text-inherit" : "text-slate-700"
          }`}
        >
          {renderInline(trimmedLine)}
        </p>
      );
    }
  }

  flushList();

  const baseTextColor = isDark
    ? "text-slate-200"
    : isInherit
    ? "text-inherit"
    : "text-slate-800";

  return (
    <div className={`space-y-1 text-sm sm:text-base ${baseTextColor} ${className}`}>
      {elements}
    </div>
  );
}
