"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Loader2, Eye, EyeOff, Lock, KeyRound, WifiOff } from "lucide-react";
import { AnalysisReport } from "@/components/analysis-report";
import { FeedbackWidget } from "@/components/FeedbackModal";
import { resolvePincode, MospiStats } from "@/lib/resolvePincode";
import { fetchWithRetry } from "@/lib/fetchWithRetry";

interface Dependent {
  id: string;
  relation: string;
  age: string;
}

function formatFriendlyErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;
  const rawMsg = err instanceof Error ? err.message : typeof err === "string" ? err : String(err);

  // If message itself is stringified JSON containing error code 503 or message
  if (rawMsg.startsWith("{") && (rawMsg.includes("503") || rawMsg.includes("high demand") || rawMsg.includes("UNAVAILABLE"))) {
    try {
      const parsed = JSON.parse(rawMsg);
      if (
        parsed?.error?.code === 503 ||
        parsed?.error?.status === "UNAVAILABLE" ||
        parsed?.error?.message?.includes("high demand") ||
        parsed?.error?.message?.includes("503")
      ) {
        return "This website is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.";
      }
    } catch {
      // ignore JSON parse failure
    }
  }

  const lower = rawMsg.toLowerCase();
  if (
    lower.includes("503") ||
    lower.includes("high demand") ||
    lower.includes("unavailable") ||
    lower.includes("overloaded") ||
    lower.includes("resource exhausted") ||
    lower.includes("temporarily unavailable")
  ) {
    return "This website is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.";
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("connection reset") ||
    lower.includes("connection timed out") ||
    lower.includes("econnreset")
  ) {
    return "Network connection was interrupted or timed out after multiple retry attempts. Please check your internet connection and try again.";
  }

  return rawMsg || fallback;
}

function areInitialSectionsReady(text: string): boolean {
  if (!text) return false;
  const hasSec1 = text.includes("</Section_1>") || text.includes("<Section_2>");
  const hasSec2 = text.includes("</Section_2>") || text.includes("<Section_3>");
  return hasSec1 && hasSec2;
}

export default function Home() {
  // Page states
  const [pageState, setPageState] = useState<"home" | "analysis">("home");

  // Form fields
  const [file, setFile] = useState<File | null>(null);
  const [pdfPassword, setPdfPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [pincode, setPincode] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [mospiStats, setMospiStats] = useState<MospiStats | null>(null);

  // Dependent creation temp state
  const [showAddDependentForm, setShowAddDependentForm] = useState(false);
  const [tempRelation, setTempRelation] = useState("Spouse");
  const [tempAge, setTempAge] = useState("");

  // Loading & Modal states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<"idle" | "parsing" | "analyzing" | "completed">("idle");
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Errors and Results
  const [error, setError] = useState<string | null>(null);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>("");

  // Refs for aborting background execution and tracking disclaimer confirmation
  const abortControllerRef = useRef<AbortController | null>(null);
  const disclaimerAgreedRef = useRef<boolean>(false);
  const latestParsedDataRef = useRef<Record<string, unknown> | null>(null);
  const latestAnalysisResultRef = useRef<string>("");

  // Typewriter effect states
  const [wordIndex, setWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag and drop visual state
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Typewriter effect logic
  useEffect(() => {
    const words = ["Life", "Health"];
    let timer: NodeJS.Timeout;
    const activeWord = words[wordIndex];

    if (isDeleting) {
      timer = setTimeout(() => {
        setCurrentText((prev) => prev.slice(0, -1));
      }, 70);
    } else {
      timer = setTimeout(() => {
        setCurrentText((prev) => activeWord.slice(0, prev.length + 1));
      }, 120);
    }

    if (!isDeleting && currentText === activeWord) {
      timer = setTimeout(() => setIsDeleting(true), 1500);
    } else if (isDeleting && currentText === "") {
      timer = setTimeout(() => {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % words.length);
      }, 300);
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, wordIndex]);

  // Input sanitizations
  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ""); // digits only
    if (val.length <= 6) {
      setPincode(val);
    }
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ""); // digits only
    if (val.length <= 2) {
      setAge(val);
    }
  };

  const handleTempAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ""); // digits only
    if (val.length <= 2) {
      setTempAge(val);
    }
  };

  // Add dependent handler
  const handleAddDependent = () => {
    if (!tempAge) return;
    if (dependents.length >= 5) return;

    const newDependent: Dependent = {
      id: Math.random().toString(36).substring(2, 9),
      relation: tempRelation,
      age: tempAge,
    };

    const updated = [...dependents, newDependent];
    setDependents(updated);
    setTempAge("");

    // If max 5 dependents reached, close form; otherwise keep form open for next dependent
    if (updated.length >= 5) {
      setShowAddDependentForm(false);
    } else {
      setShowAddDependentForm(true);
      if (tempRelation === "Spouse") {
        setTempRelation("Son");
      }
    }
  };

  const handleRemoveDependent = (id: string) => {
    if (isProcessing) return;
    setDependents(dependents.filter((d) => d.id !== id));
  };

  // File Upload Handlers
  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file only.");
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("File size exceeds the 50MB limit.");
      return;
    }
    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isProcessing) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isProcessing) return;
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // Main Unified Analysis Flow with Streaming Response Ingestion
  const handleStartAnalysis = async () => {
    setError(null);

    // Form Validations
    if (!file) {
      setError("Please upload your policy PDF file.");
      return;
    }
    if (!pincode || pincode.length !== 6) {
      setError("Please enter a valid 6-digit residence pincode.");
      return;
    }
    if (!age || Number(age) <= 0) {
      setError("Please enter a valid age.");
      return;
    }

    // Cancel any previous in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    disclaimerAgreedRef.current = false;
    latestParsedDataRef.current = null;
    latestAnalysisResultRef.current = "";
    setAnalysisResult("");
    setRetryStatus(null);

    // Lock UI and show disclaimer popup while background analysis starts immediately
    setIsProcessing(true);
    setShowDisclaimer(true);
    setAnalysisStage("parsing");

    (async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);

        // Local zero-token PIN code lookup
        const resolvedPincode = resolvePincode(pincode);
        setMospiStats(resolvedPincode.mospi_stats);

        const userContextPayload = JSON.stringify({
          primary_residence_pincode: Number(pincode),
          covered_member_age: Number(age),
          dependents: dependents.map((d) => ({
            relation: d.relation,
            age: Number(d.age),
          })),
          state: resolvedPincode.state,
          city_tier: resolvedPincode.city_tier,
          expected_insurance_zone: resolvedPincode.expected_insurance_zone,
        });

        formData.append("user_context", userContextPayload);
        if (pdfPassword.trim()) {
          formData.append("password", pdfPassword.trim());
        }

        // Step 1: Parse Document (with exponential backoff retry on transient cellular drops)
        const parseResponse = await fetchWithRetry("/api/parse", {
          method: "POST",
          body: formData,
          signal: controller.signal,
          maxRetries: 3,
          initialDelayMs: 1200,
          onRetry: (attempt) => {
            setRetryStatus(`Slow network detected. Retrying parsing (attempt ${attempt} of 3)...`);
          },
        });

        setRetryStatus(null);

        if (!parseResponse.ok) {
          const errorData = await parseResponse.json().catch(() => ({}));
          const errCode = errorData.error;
          const errMsg = errorData.message || errorData.error;

          if (errCode === "PDF_PASSWORD_REQUIRED" || errCode === "INVALID_PDF_PASSWORD") {
            setTimeout(() => {
              passwordInputRef.current?.focus();
            }, 150);
            throw new Error(
              errMsg ||
                (errCode === "PDF_PASSWORD_REQUIRED"
                  ? "This policy document is password-protected. Please enter your policy password."
                  : "Incorrect password. Most insurers use your Date of Birth (DDMMYYYY) or PAN.")
            );
          }
          throw new Error(errMsg || `Failed to parse the insurance document (Status ${parseResponse.status}).`);
        }

        const parseResult = await parseResponse.json();

        if (parseResult.document_validity && parseResult.document_validity.is_insurance_document === false) {
          throw new Error(parseResult.document_validity.unsupported_document_reason || "Invalid insurance document uploaded.");
        }

        setParsedData(parseResult);
        latestParsedDataRef.current = parseResult;
        setAnalysisStage("analyzing");
        setIsStreaming(true);

        // Step 2: Stream Analyze Document immediately (with exponential backoff retry)
        const analyzeResponse = await fetchWithRetry("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            policy_data: parseResult,
            mospi_grounding: resolvedPincode.mospi_stats,
          }),
          signal: controller.signal,
          maxRetries: 3,
          initialDelayMs: 1200,
          onRetry: (attempt) => {
            setRetryStatus(`Network hiccup. Reconnecting analysis stream (attempt ${attempt} of 3)...`);
          },
        });

        setRetryStatus(null);

        if (!analyzeResponse.ok) {
          const errorText = await analyzeResponse.text().catch(() => "");
          let parsedError = "";
          try {
            const errorJson = JSON.parse(errorText);
            parsedError = errorJson.error;
          } catch {
            parsedError = errorText;
          }
          throw new Error(parsedError || `Failed to analyze the insurance policy (Status ${analyzeResponse.status}).`);
        }

        if (!analyzeResponse.body) {
          throw new Error("No response body received from analyze stream.");
        }

        let accumulatedText = "";
        const reader = analyzeResponse.body.getReader();
        const decoder = new TextDecoder();

        // If disclaimer was already confirmed and initial sections are ready, navigate immediately
        if (disclaimerAgreedRef.current && areInitialSectionsReady(accumulatedText)) {
          setShowDisclaimer(false);
          setIsProcessing(false);
          setPageState("analysis");
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          setAnalysisResult(accumulatedText);
          latestAnalysisResultRef.current = accumulatedText;

          // Once Section 1 & Section 2 are confirmed available, navigate to analysis page
          if (disclaimerAgreedRef.current && (areInitialSectionsReady(accumulatedText) || done)) {
            setShowDisclaimer(false);
            setIsProcessing(false);
            setPageState("analysis");
          }
        }

        setIsStreaming(false);
        setAnalysisStage("completed");

        // If user agreed to disclaimer, ensure pageState is analysis
        if (disclaimerAgreedRef.current) {
          setShowDisclaimer(false);
          setIsProcessing(false);
          setPageState("analysis");
        }
      } catch (err: unknown) {
        setRetryStatus(null);
        // If aborted by user action, silently return to homepage
        if (controller.signal.aborted || (err as { name?: string })?.name === "AbortError") {
          return;
        }

        console.error(err);
        setError(formatFriendlyErrorMessage(err, "An error occurred while analyzing the insurance policy."));
        setIsProcessing(false);
        setIsStreaming(false);
        setShowDisclaimer(false);
        setAnalysisStage("idle");
      }
    })();
  };

  // User confirms Disclaimer: Show "Reading your policy..." popup until Section 1 & 2 are ready, then navigate
  const handleAgreeDisclaimer = () => {
    disclaimerAgreedRef.current = true;
    setShowDisclaimer(false);

    if (areInitialSectionsReady(latestAnalysisResultRef.current) || analysisStage === "completed") {
      setIsProcessing(false);
      setPageState("analysis");
    } else {
      setIsProcessing(true);
    }
  };

  // User cancels or disagrees: Abort background process immediately, unfreeze page, retain document & fields intact
  const handleTerminateAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setRetryStatus(null);
    disclaimerAgreedRef.current = false;
    setIsStreaming(false);
    setIsProcessing(false);
    setShowDisclaimer(false);
    setAnalysisStage("idle");
  };

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setRetryStatus(null);
    disclaimerAgreedRef.current = false;
    setIsStreaming(false);
    setIsProcessing(false);
    setShowDisclaimer(false);
    setAnalysisStage("idle");
    setPageState("home");
    setFile(null);
    setPdfPassword("");
    setShowPassword(false);
    setPincode("");
    setAge("");
    setDependents([]);
    setMospiStats(null);
    setParsedData(null);
    setAnalysisResult("");
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans antialiased text-slate-800 selection:bg-indigo-100 w-full max-w-full overflow-x-hidden">
      
      {/* Top Navigation Banner */}
      <header className="sticky top-0 z-40 w-full max-w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-[50px] sm:h-[52px] flex items-center justify-between">
          {/* Logo */}
          <div id="logo-brand" className="flex items-center cursor-pointer shrink-0" onClick={handleReset}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="AssureBhai Logo"
              className="h-[24px] sm:h-[30px] w-auto object-contain"
            />
          </div>

          {/* Actions on same line: Feedback + 2-line About Creator + 2-line Contact Creator */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              id="feedback-button"
              type="button"
              onClick={() => setIsFeedbackOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Feedback</span>
            </button>
            <a
              id="creator-about"
              href="https://ashjo966.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] sm:text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors text-center leading-[1.1] sm:leading-normal flex flex-col sm:flex-row items-center sm:gap-1 px-1 sm:px-2 py-0.5 rounded hover:bg-slate-100 shrink-0"
            >
              <span>About</span>
              <span>Creator</span>
            </a>
            <a
              id="creator-contact"
              href="https://ashjo966.github.io/index.html#contact"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] sm:text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors text-center leading-[1.1] sm:leading-normal flex flex-col sm:flex-row items-center sm:gap-1 px-1 sm:px-2 py-0.5 rounded hover:bg-slate-100 shrink-0"
            >
              <span>Contact</span>
              <span>Creator</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 pb-28 sm:pb-12 flex flex-col justify-start overflow-x-hidden">
        {pageState === "home" ? (
          /* HOMEPAGE VIEW */
          <div className="max-w-3xl mx-auto w-full flex flex-col items-center">
            
            {/* Dynamic Hero Section */}
            <div className="text-center mt-2 sm:mt-4 mb-6 sm:mb-8 w-full max-w-full">
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight break-words">
                Your{" "}
                <span className="text-indigo-600 relative inline-block">
                  {currentText}
                  <span className="absolute right-[-2px] top-[10%] h-[80%] w-0.5 bg-indigo-600 animate-pulse" />
                </span>{" "}
                policy, simplified.
              </h1>
              <p className="mt-3 sm:mt-6 text-sm sm:text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
                Upload your policy PDF to analyze terms, uncover hidden clauses, and verify statutory IRDAI benchmarks instantly.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="w-full mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start gap-3 shadow-sm animate-in fade-in duration-200">
                <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium break-words">{error}</span>
              </div>
            )}

            {/* Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (!isProcessing) fileInputRef.current?.click();
              }}
              className={`w-full max-w-full p-6 sm:p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-200 box-border ${
                isProcessing
                  ? "opacity-60 cursor-not-allowed pointer-events-none"
                  : "cursor-pointer"
              } ${
                isDragOver
                  ? "border-indigo-500 bg-indigo-50/60"
                  : file
                  ? "border-emerald-400 bg-emerald-50/30 shadow-sm"
                  : "border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-50"
              }`}
            >
              <input
                id="file-input"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="application/pdf"
                disabled={isProcessing}
                className="hidden"
              />
              
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-4 ${
                file ? "bg-emerald-100 text-emerald-600" : "bg-indigo-50 text-indigo-600"
              }`}>
                {file ? (
                  <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>

              {file ? (
                <div className="text-center w-full max-w-full px-2">
                  <p className="font-semibold text-slate-800 max-w-full truncate">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB • PDF Document</p>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isProcessing) setFile(null);
                    }}
                    className="mt-3 text-xs text-rose-500 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-semibold text-slate-800 text-sm sm:text-base">Drag & drop your policy PDF here</p>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">or click to browse files</p>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-2 font-medium">Single file (.pdf only, max 50MB)</p>
                </div>
              )}
            </div>

            {/* Optional PDF Password Field (for locked files) */}
            <div className={`w-full max-w-full mt-4 bg-white border rounded-2xl p-4 sm:p-5 shadow-sm transition-all box-border ${
              error && (error.toLowerCase().includes("password") || error.toLowerCase().includes("locked"))
                ? "border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20"
                : "border-slate-200/80"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <label htmlFor="pdf-password" className="block text-sm font-semibold text-slate-700">
                    PDF Password <span className="text-xs font-normal text-slate-400">(if locked)</span>
                  </label>
                </div>
                {pdfPassword && (
                  <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    Password set
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  ref={passwordInputRef}
                  id="pdf-password"
                  type={showPassword ? "text" : "password"}
                  value={pdfPassword}
                  onChange={(e) => setPdfPassword(e.target.value)}
                  placeholder="e.g., DDMMYYYY or PAN"
                  disabled={isProcessing}
                  className="w-full pr-10 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed text-sm sm:text-base font-mono"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isProcessing}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Insurers usually lock downloads with your Date of Birth or PAN.
              </p>
            </div>

            {/* Profile Fields Card */}
            <div className="w-full max-w-full mt-6 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-8 shadow-sm box-border">
              <div className="mb-5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Policyholder details</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  To accurately evaluate zone-based copayments, city medical tiering, and family coverage limits. Your data is used only for analysis and is never stored.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {/* Pincode with strict iOS + Android numpad */}
                <div>
                  <label htmlFor="pincode" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Primary Residence Pincode <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="postal-code"
                    id="pincode"
                    value={pincode}
                    onChange={handlePincodeChange}
                    placeholder="e.g. 560001"
                    maxLength={6}
                    disabled={isProcessing}
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed text-sm sm:text-base"
                  />
                  <p className="text-xs text-slate-400 mt-1">Mandatory, exact 6 digits</p>
                </div>

                {/* Age with strict iOS + Android numpad */}
                <div>
                  <label htmlFor="age" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Policyholder Age <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    id="age"
                    value={age}
                    onChange={handleAgeChange}
                    placeholder="e.g. 32"
                    maxLength={2}
                    disabled={isProcessing}
                    className="w-full px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed text-sm sm:text-base"
                  />
                  <p className="text-xs text-slate-400 mt-1">Mandatory, max 2 digits</p>
                </div>
              </div>

              {/* Dependents Section */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Covered Dependents</label>
                    <p className="text-xs text-slate-400">Add upto 5 family members</p>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing || dependents.length >= 5}
                    onClick={() => setShowAddDependentForm(true)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    + Add Dependent ({dependents.length}/5)
                  </button>
                </div>

                {/* Inline Add Form */}
                {showAddDependentForm && (
                  <div className="mb-4 p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-full box-border">
                    <div className="w-full sm:w-44">
                      <select
                        value={tempRelation}
                        onChange={(e) => setTempRelation(e.target.value)}
                        disabled={isProcessing}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="Spouse">Spouse</option>
                        <option value="Son">Son</option>
                        <option value="Daughter">Daughter</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Sister">Sister</option>
                        <option value="Brother">Brother</option>
                      </select>
                    </div>

                    {/* Dependent Age with strict iOS + Android numpad */}
                    <div className="w-full sm:w-28">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        id="dependent-age"
                        placeholder="Age"
                        value={tempAge}
                        onChange={handleTempAgeChange}
                        maxLength={2}
                        disabled={isProcessing}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddDependent}
                        disabled={!tempAge || isProcessing}
                        className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddDependentForm(false)}
                        disabled={isProcessing}
                        className="flex-1 sm:flex-none px-3 py-2 text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Dependents List */}
                {dependents.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {dependents.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-700"
                      >
                        <span>{dep.relation} ({dep.age} yrs)</span>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleRemoveDependent(dep.id)}
                          className="text-slate-400 hover:text-rose-500 disabled:opacity-40 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No dependents added (Individual coverage mode).</p>
                )}
              </div>
            </div>

            {/* Pervasive Bottom Button on Mobile / Standard on Desktop (disappears once clicked/processing) */}
            {!isProcessing && (
              <div className="fixed bottom-0 left-0 right-0 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-30 sm:static sm:p-0 sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:shadow-none sm:mt-8 flex justify-center w-full max-w-full box-border">
                <button
                  id="analyze-button"
                  type="button"
                  onClick={handleStartAnalysis}
                  className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:bg-indigo-800 transition-all flex items-center justify-center gap-3 text-base sm:text-lg cursor-pointer"
                >
                  <svg className="w-5 h-5 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Analyze Document
                </button>
              </div>
            )}

          </div>
        ) : (
          /* ANALYSIS VIEW */
          <div className="w-full max-w-full flex flex-col gap-6 overflow-x-hidden">
            
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl sm:text-3xl font-black text-slate-900">Policy Evaluation Report</h1>
                  {isStreaming && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Streaming sections...
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Evaluated against official IRDAI regulatory baselines and underwriting guidelines.
                </p>
              </div>
              <button
                onClick={handleReset}
                className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                ← Analyze new policy
              </button>
            </div>

            {/* Error in Analysis View */}
            {error ? (
              <div className="max-w-2xl mx-auto w-full py-16 text-center px-4">
                <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Analysis Failed</h2>
                <p className="text-slate-500 mb-6 text-sm break-words">{error}</p>
                <button onClick={handleReset} className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer">
                  Try Again
                </button>
              </div>
            ) : (
              /* MODULAR 6-SECTION POLICY ANALYSIS REPORT WITH PROGRESSIVE STREAMING CARDS */
              <AnalysisReport analysis={analysisResult} parsedData={parsedData} isStreaming={isStreaming || analysisStage !== "completed"} />
            )}

          </div>
        )}
      </main>

      {/* Floating "Reading your policy..." Modal with Blurred Backdrop & Cancel Button */}
      {isProcessing && !showDisclaimer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-w-[calc(100vw-1.5rem)] p-5 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-center box-border">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 sm:mb-5 mx-auto relative shadow-inner">
              <div className="absolute inset-0 rounded-2xl border-2 border-indigo-600/30 border-t-indigo-600 animate-spin" />
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Reading your policy...</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
              {analysisStage === "analyzing"
                ? "Evaluating policy clauses, room rent limitations, waiting periods, and statutory IRDAI benchmarks."
                : "Securely parsing document clauses, endorsements, and demographic context."}
            </p>

            {retryStatus && (
              <div className="mb-4 px-3.5 py-2 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-800 text-xs font-medium flex items-center justify-center gap-2 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                <span>{retryStatus}</span>
              </div>
            )}

            <button
              id="cancel-analysis-button"
              type="button"
              onClick={handleTerminateAnalysis}
              className="w-full px-4 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 rounded-xl border border-rose-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel Analysis
            </button>
          </div>
        </div>
      )}

      {/* AI Disclaimer Modal with Concurrent Background Analysis & Blurred Backdrop */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-w-[calc(100vw-1.5rem)] p-5 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-center box-border">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 mx-auto shadow-inner">
              <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">AI Analysis Disclaimer</h3>
            
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
              AssureBhai performs automated policy evaluations and extracts clause structures for informational and educational purposes. 
              Always review your actual policy certificate and consult with an IRDAI-registered insurance advisor before making financial decisions.
            </p>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                id="disagree-button"
                type="button"
                onClick={handleTerminateAnalysis}
                className="flex-1 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
              >
                Disagree
              </button>
              <button
                id="agree-button"
                type="button"
                onClick={handleAgreeDisclaimer}
                className="flex-1 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-colors cursor-pointer"
              >
                Agree & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Floating Widget Modal */}
      <FeedbackWidget
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </div>
  );
}
