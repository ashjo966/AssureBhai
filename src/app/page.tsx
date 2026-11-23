"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  Shield,
  Sparkles,
} from "lucide-react";
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
  const [loadingStep, setLoadingStep] = useState<1 | 2 | 3>(1);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Granular Field Validation Errors
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>("");

  // Refs
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
  const analysisContainerRef = useRef<HTMLDivElement>(null);

  // Ensure viewport scrolls to the very top whenever pageState transitions (especially to analysis view on mobile)
  useEffect(() => {
    if (pageState === "analysis") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      analysisContainerRef.current?.scrollIntoView({ behavior: "instant", block: "start" });

      // Handle mobile browser keyboard dismissal and async layout shifts
      const timer = setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        analysisContainerRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
      }, 100);

      return () => clearTimeout(timer);
    } else if (pageState === "home") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [pageState]);

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
      if (pincodeError) setPincodeError(null);
      if (error) setError(null);
    }
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ""); // digits only
    if (val.length <= 2) {
      setAge(val);
      if (ageError) setAgeError(null);
      if (error) setError(null);
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

  // File Upload Handlers (strictly PDF only)
  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    setFileError(null);
    setPasswordError(null);

    const fileName = (selectedFile.name || "").toLowerCase();
    const fileType = (selectedFile.type || "").toLowerCase();

    const isPdf =
      fileName.endsWith(".pdf") ||
      fileType === "application/pdf" ||
      fileType === "application/x-pdf";

    if (!isPdf) {
      const msg = "Only PDF documents are supported (.pdf). Please select a valid policy PDF.";
      setFileError(msg);
      setError(msg);
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      const msg = "File size exceeds the 50MB limit. Please upload a smaller PDF.";
      setFileError(msg);
      setError(msg);
      return;
    }
    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
    e.target.value = "";
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
    setFileError(null);
    setPincodeError(null);
    setAgeError(null);
    setPasswordError(null);

    // Form Validations with granular inline error states
    let hasValidationError = false;

    if (!file) {
      setFileError("Please upload your policy PDF document.");
      hasValidationError = true;
    }

    if (!pincode || !/^[1-9][0-9]{5}$/.test(pincode)) {
      setPincodeError("Valid 6-digit Indian PIN code required (e.g. 560001).");
      hasValidationError = true;
    }

    if (!age || Number(age) <= 0 || Number(age) > 120) {
      setAgeError("Please enter a valid age (1-120).");
      hasValidationError = true;
    }

    if (hasValidationError) {
      setError("Please fix the highlighted fields to analyze your policy.");
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

    // Stage 1: Reading & decrypting policy PDF
    setIsProcessing(true);
    setShowDisclaimer(true);
    setAnalysisStage("parsing");
    setLoadingStep(1);

    (async () => {
      try {
        const formData = new FormData();
        if (file) formData.append("file", file);

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
            const passMsg =
              errCode === "PDF_PASSWORD_REQUIRED"
                ? "This policy document is password-protected. Please enter your policy password."
                : "Incorrect password. Most insurers use your Date of Birth (DDMMYYYY) or PAN.";
            setPasswordError(passMsg);

            // Auto-focus the password input without clearing the uploaded file
            setTimeout(() => {
              passwordInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              passwordInputRef.current?.focus();
            }, 150);

            throw new Error(passMsg);
          }
          throw new Error(errMsg || `Failed to parse the insurance document (Status ${parseResponse.status}).`);
        }

        const parseResult = await parseResponse.json();

        if (parseResult.document_validity && parseResult.document_validity.is_insurance_document === false) {
          throw new Error(parseResult.document_validity.unsupported_document_reason || "Invalid insurance document uploaded.");
        }

        setParsedData(parseResult);
        latestParsedDataRef.current = parseResult;

        // Stage 2: Extracting key clauses & mapping MoSPI benchmarks
        setLoadingStep(2);
        setAnalysisStage("analyzing");

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

        // Stage 3: Generating your personalized AssureBhai verdict
        setLoadingStep(3);
        setIsStreaming(true);

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

        if (disclaimerAgreedRef.current) {
          setShowDisclaimer(false);
          setIsProcessing(false);
          setPageState("analysis");
        }
      } catch (err: unknown) {
        setRetryStatus(null);
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

  const handleAgreeDisclaimer = () => {
    disclaimerAgreedRef.current = true;
    setShowDisclaimer(false);

    if (areInitialSectionsReady(latestAnalysisResultRef.current) || analysisStage === "completed") {
      setIsProcessing(false);
      setPageState("analysis");
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } else {
      setIsProcessing(true);
    }
  };

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
    setLoadingStep(1);
    setPageState("home");
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
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
    setFileError(null);
    setPincodeError(null);
    setAgeError(null);
    setPasswordError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans antialiased text-slate-800 selection:bg-indigo-100 w-full max-w-full overflow-x-hidden">
      {/* Top Navigation Banner */}
      <header className="sticky top-0 z-40 w-full max-w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[52px] sm:h-[56px] flex items-center justify-between">
          {/* Logo */}
          <div
            id="logo-brand"
            className="flex items-center cursor-pointer shrink-0"
            onClick={handleReset}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="AssureBhai Logo"
              className="h-[26px] sm:h-[32px] w-auto object-contain"
            />
          </div>

          {/* Actions: Feedback + Creator Links */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              id="feedback-button"
              type="button"
              onClick={() => setIsFeedbackOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 min-h-[38px] sm:min-h-[40px] text-xs sm:text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-xs transition-all whitespace-nowrap cursor-pointer shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Feedback</span>
            </button>
            <a
              id="creator-about"
              href="https://ashjo966.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] sm:text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors text-center leading-[1.1] sm:leading-normal flex flex-col sm:flex-row items-center sm:gap-1 px-1.5 sm:px-2.5 py-1 rounded hover:bg-slate-100 shrink-0"
            >
              <span>About</span>
              <span>Creator</span>
            </a>
            <a
              id="creator-contact"
              href="https://ashjo966.github.io/index.html#contact"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] sm:text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors text-center leading-[1.1] sm:leading-normal flex flex-col sm:flex-row items-center sm:gap-1 px-1.5 sm:px-2.5 py-1 rounded hover:bg-slate-100 shrink-0"
            >
              <span>Contact</span>
              <span>Creator</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-32 sm:pb-12 flex flex-col justify-start overflow-x-hidden">
        {pageState === "home" ? (
          /* HOMEPAGE VIEW */
          <div className="max-w-3xl mx-auto w-full flex flex-col items-center">

            {/* Dynamic Hero Section */}
            <div className="text-center mt-2 sm:mt-4 mb-4 sm:mb-8 w-full max-w-full">
              <h1 className="text-2xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight break-words">
                <span className="inline-block sm:inline">
                  Your{" "}
                  <span className="text-indigo-600 relative inline-block">
                    {currentText}
                    <span className="absolute right-[-2px] top-[10%] h-[80%] w-0.5 bg-indigo-600 animate-pulse" />
                  </span>{" "}
                  policy,
                </span>
                <br className="sm:hidden" />{" "}
                <span className="italic">simplified</span>.
              </h1>
              <p className="mt-2 sm:mt-6 text-xs sm:text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
                Upload your policy PDF to analyze terms, uncover hidden clauses, and verify statutory IRDAI benchmarks instantly.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="w-full mb-4 sm:mb-6 p-3.5 sm:p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs sm:text-sm flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 shrink-0 mt-0.5" />
                <span className="font-medium break-words flex-1">{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-rose-400 hover:text-rose-700 p-0.5"
                  title="Dismiss error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ACTION WRAPPER: Unified Compact Card on Mobile, Separate Classic Cards on Desktop */}
            <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs sm:bg-transparent sm:border-0 sm:p-0 sm:shadow-none box-border">

              {/* Mobile Step 1 Header */}
              <div className="sm:hidden flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Step 1 • Policy Document
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  PDF only (max 50MB)
                </span>
              </div>

              {/* Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  if (!isProcessing && !file) {
                    fileInputRef.current?.click();
                  }
                }}
                className={`w-full max-w-full p-4 sm:p-10 border-2 border-dashed rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-all duration-200 box-border ${isProcessing
                  ? "opacity-60 cursor-not-allowed pointer-events-none"
                  : !file
                    ? "cursor-pointer"
                    : ""
                  } ${isDragOver
                    ? "border-indigo-500 bg-indigo-50/60"
                    : fileError
                      ? "border-rose-400 bg-rose-50/20"
                      : file
                        ? "border-emerald-400 bg-emerald-50/30 shadow-xs sm:shadow-sm"
                        : "border-slate-200 bg-slate-50/50 sm:bg-white hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-50"
                  }`}
              >
                {/* File input strictly accepting PDF documents */}
                <input
                  id="file-input"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="application/pdf,.pdf"
                  disabled={isProcessing}
                  className="sr-only"
                />

                <div
                  className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2.5 sm:mb-4 ${file
                    ? "bg-emerald-100 text-emerald-600"
                    : fileError
                      ? "bg-rose-100 text-rose-600"
                      : "bg-indigo-50 text-indigo-600"
                    }`}
                >
                  {file ? (
                    <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
                  ) : (
                    <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
                  )}
                </div>

                {file ? (
                  <div className="text-center w-full max-w-full px-2">
                    <p className="font-semibold text-slate-800 text-xs sm:text-base max-w-full truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • PDF Document
                    </p>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isProcessing) {
                          setFile(null);
                          setFileError(null);
                        }
                      }}
                      className="mt-2 sm:mt-3 text-xs text-rose-500 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="text-center w-full max-w-md px-2">
                    <p className="font-semibold text-slate-800 text-xs sm:text-base">
                      Upload your policy document
                    </p>
                    <p className="text-[11px] sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
                      Tap to browse your policy PDF
                    </p>

                    <div className="mt-2.5 sm:mt-4 flex items-center justify-center w-full">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        <span>Choose Policy PDF</span>
                      </button>
                    </div>

                    <p className="text-[10px] sm:text-xs text-slate-400 mt-2 sm:mt-3 font-medium">
                      Supported: PDF only (max 50MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Inline File Error Banner */}
              {fileError && (
                <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Optional PDF Password Field */}
              <div
                className={`w-full max-w-full mt-3 sm:mt-4 rounded-xl sm:rounded-2xl p-3 sm:p-6 transition-all box-border bg-slate-50 sm:bg-white border ${passwordError
                  ? "border-amber-400 bg-amber-50/40 ring-2 ring-amber-400/20"
                  : "border-slate-200 sm:border-slate-200/80 sm:shadow-sm"
                  }`}
              >
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
                    <label
                      htmlFor="pdf-password"
                      className="block text-xs sm:text-sm font-semibold text-slate-700"
                    >
                      PDF Password <span className="text-[11px] sm:text-xs font-normal text-slate-400">(if locked)</span>
                    </label>
                  </div>
                  {pdfPassword && (
                    <span className="text-[10px] sm:text-[11px] font-semibold text-indigo-700 bg-indigo-100/70 sm:bg-indigo-50 px-2 py-0.5 rounded-full">
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
                    onChange={(e) => {
                      setPdfPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    placeholder="e.g., DDMMYYYY or PAN"
                    disabled={isProcessing}
                    className="w-full pr-10 px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed text-xs sm:text-base font-mono"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isProcessing}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {passwordError ? (
                  <p className="text-[11px] text-amber-700 font-medium mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>{passwordError}</span>
                  </p>
                ) : (
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-1 sm:mt-1.5 leading-relaxed">
                    Insurers usually lock downloads with your Date of Birth or PAN. Processed in-memory only.
                  </p>
                )}
              </div>

              {/* Profile Fields Card */}
              <div className="w-full max-w-full mt-3.5 sm:mt-4 pt-3.5 sm:pt-6 border-t border-slate-100 sm:border-t-0 sm:bg-white sm:border sm:border-slate-200/80 sm:rounded-2xl sm:p-6 sm:shadow-sm box-border">

                {/* Desktop Header */}
                <div className="hidden sm:block mb-5">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">Policyholder details</h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                    To accurately evaluate zone-based copayments, city medical tiering, and family coverage limits. Your data is used only for analysis and is never stored.
                  </p>
                </div>

                {/* Mobile Header */}
                <div className="sm:hidden flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Step 2 • Hyperlocal Benchmarks
                  </span>
                  <span className="text-[11px] font-medium text-indigo-600">
                    MoSPI Grounded
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                  {/* Pincode with strict iOS + Android numpad */}
                  <div>
                    <label htmlFor="pincode" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-1.5">
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
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-base transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed ${pincodeError
                        ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                        : "border-slate-200 focus:border-indigo-500"
                        }`}
                    />
                    {pincodeError ? (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        {pincodeError}
                      </p>
                    ) : (
                      <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                        Mandatory, exact 6 digits
                      </p>
                    )}
                  </div>

                  {/* Age with strict iOS + Android numpad */}
                  <div>
                    <label htmlFor="age" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-1.5">
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
                      className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-base transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed ${ageError
                        ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                        : "border-slate-200 focus:border-indigo-500"
                        }`}
                    />
                    {ageError ? (
                      <p className="text-[11px] text-rose-600 font-medium mt-1">
                        {ageError}
                      </p>
                    ) : (
                      <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                        Mandatory, max 2 digits
                      </p>
                    )}
                  </div>
                </div>

                {/* Dependents Section */}
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-slate-700">Covered Dependents</label>
                      <p className="text-[11px] sm:text-xs text-slate-400">Add upto 5 family members</p>
                    </div>

                    <button
                      type="button"
                      disabled={isProcessing || dependents.length >= 5}
                      onClick={() => setShowAddDependentForm(true)}
                      className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                    >
                      + Add Dependent ({dependents.length}/5)
                    </button>
                  </div>

                  {/* Inline Add Form */}
                  {showAddDependentForm && (
                    <div className="mb-3 sm:mb-4 p-2.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full max-w-full box-border">
                      <div className="w-full sm:w-44">
                        <select
                          value={tempRelation}
                          onChange={(e) => setTempRelation(e.target.value)}
                          disabled={isProcessing}
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAddDependent}
                          disabled={!tempAge || isProcessing}
                          className="flex-1 sm:flex-none px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddDependentForm(false)}
                          disabled={isProcessing}
                          className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
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
                          className="flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-700"
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

            </div>

            {/* Desktop Centered Button (disappears while processing) */}
            {!isProcessing && (
              <div className="hidden sm:flex flex-col items-center justify-center mt-8 w-full">
                <button
                  id="analyze-button-desktop"
                  type="button"
                  onClick={handleStartAnalysis}
                  className="w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center justify-center gap-3 text-lg cursor-pointer"
                >
                  <Shield className="w-5 h-5 text-indigo-200" />
                  <span>Analyze Policy</span>
                </button>
                <p className="text-center text-xs text-slate-500 mt-2.5">
                  🔒 100% In-Memory Processing • No Files Stored • Zero Retention
                </p>
              </div>
            )}

            {/* Mobile Fixed Bottom Bar (disappears while processing) */}
            {!isProcessing && (
              <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-30 flex flex-col items-center justify-center w-full max-w-full box-border gap-1.5">
                <button
                  id="analyze-button-mobile"
                  type="button"
                  onClick={handleStartAnalysis}
                  className="w-full min-h-[44px] py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-base cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-indigo-200" />
                  <span>Analyze Policy</span>
                </button>
                <p className="text-[11px] text-slate-500 font-medium text-center">
                  🔒 100% In-Memory Processing • No Files Stored • Zero Retention
                </p>
              </div>
            )}

          </div>
        ) : (
          /* ANALYSIS VIEW - STREAMING VERDICT REPORT */
          <div ref={analysisContainerRef} className="w-full max-w-full flex flex-col gap-6 overflow-x-hidden">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-[17px] min-[375px]:text-lg sm:text-3xl font-black text-slate-900 leading-tight whitespace-nowrap">
                    Policy Evaluation Report
                  </h1>
                  {isStreaming && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold animate-pulse border border-indigo-200/60 shrink-0">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      <span>Streaming sections...</span>
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2 sm:line-clamp-none">
                  Evaluated against official IRDAI regulatory baselines and underwriting guidelines.
                </p>
              </div>

              {/* Right Action Slot */}
              <div className="shrink-0 flex items-center">
                {isStreaming ? (
                  <>
                    {/* On mobile while streaming: Streaming sections pill replaces the Analyze new policy button */}
                    <span className="sm:hidden inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold animate-pulse border border-indigo-200/60 whitespace-nowrap">
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                      <span>Streaming sections...</span>
                    </span>

                    {/* On desktop while streaming: Analyze new policy button */}
                    <button
                      onClick={handleReset}
                      className="hidden sm:inline-flex items-center px-4 py-2 text-xs sm:text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      ← Analyze new policy
                    </button>
                  </>
                ) : (
                  /* When not streaming (both mobile and desktop): Analyze new policy button */
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    ← Analyze new policy
                  </button>
                )}
              </div>
            </div>

            {/* Error in Analysis View */}
            {error ? (
              <div className="max-w-2xl mx-auto w-full py-16 text-center px-4">
                <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-rose-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Analysis Failed</h2>
                <p className="text-slate-500 mb-6 text-sm break-words">{error}</p>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <AnalysisReport
                analysis={analysisResult}
                parsedData={parsedData}
                isStreaming={isStreaming || analysisStage !== "completed"}
              />
            )}
          </div>
        )}
      </main>

      {/* MULTI-STEP LOADING PROGRESS MODAL */}
      {isProcessing && !showDisclaimer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-w-[calc(100vw-1.5rem)] p-5 sm:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-left box-border">

            {/* Header with Title & Badge */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Analyzing Your Policy
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                Step {loadingStep} of 3
              </span>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="space-y-4 my-2">
              {/* Step 1: Reading & decrypting policy PDF */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${loadingStep > 1
                      ? "bg-emerald-500 text-white"
                      : loadingStep === 1
                        ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                        : "bg-slate-100 text-slate-400"
                      }`}
                  >
                    {loadingStep > 1 ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : loadingStep === 1 ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "1"
                    )}
                  </div>
                  <div
                    className={`w-0.5 h-6 transition-colors ${loadingStep > 1 ? "bg-emerald-400" : "bg-slate-200"
                      }`}
                  />
                </div>
                <div className="pt-0.5">
                  <p
                    className={`text-xs sm:text-sm font-semibold ${loadingStep === 1
                      ? "text-indigo-900"
                      : loadingStep > 1
                        ? "text-slate-800"
                        : "text-slate-400"
                      }`}
                  >
                    Reading &amp; decrypting policy PDF...
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Secure in-memory decryption and clause boundary detection.
                  </p>
                </div>
              </div>

              {/* Step 2: Extracting key clauses & mapping MoSPI benchmarks */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${loadingStep > 2
                      ? "bg-emerald-500 text-white"
                      : loadingStep === 2
                        ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                        : "bg-slate-100 text-slate-400"
                      }`}
                  >
                    {loadingStep > 2 ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : loadingStep === 2 ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "2"
                    )}
                  </div>
                  <div
                    className={`w-0.5 h-6 transition-colors ${loadingStep > 2 ? "bg-emerald-400" : "bg-slate-200"
                      }`}
                  />
                </div>
                <div className="pt-0.5">
                  <p
                    className={`text-xs sm:text-sm font-semibold ${loadingStep === 2
                      ? "text-indigo-900"
                      : loadingStep > 2
                        ? "text-slate-800"
                        : "text-slate-400"
                      }`}
                  >
                    Extracting key clauses &amp; mapping MoSPI benchmarks...
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Room-rent caps, waiting periods &amp; state inflation index.
                  </p>
                </div>
              </div>

              {/* Step 3: Generating your personalized AssureBhai verdict */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${analysisStage === "completed"
                      ? "bg-emerald-500 text-white"
                      : loadingStep === 3
                        ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                        : "bg-slate-100 text-slate-400"
                      }`}
                  >
                    {analysisStage === "completed" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : loadingStep === 3 ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "3"
                    )}
                  </div>
                </div>
                <div className="pt-0.5">
                  <p
                    className={`text-xs sm:text-sm font-semibold ${loadingStep === 3
                      ? "text-indigo-900"
                      : analysisStage === "completed"
                        ? "text-slate-800"
                        : "text-slate-400"
                      }`}
                  >
                    Generating your personalized AssureBhai verdict...
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Synthesizing coverage rating, solvency &amp; plain-English summary.
                  </p>
                </div>
              </div>
            </div>

            {/* Network Retry Notification */}
            {retryStatus && (
              <div className="mt-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium flex items-center gap-2 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                <span>{retryStatus}</span>
              </div>
            )}

            {/* Cancel Button */}
            <div className="mt-5 pt-3 border-t border-slate-100">
              <button
                id="cancel-analysis-button"
                type="button"
                onClick={handleTerminateAnalysis}
                className="w-full min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 rounded-xl border border-rose-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Cancel Analysis</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI DISCLAIMER MODAL */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-w-[calc(100vw-1.5rem)] p-5 sm:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-center box-border">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 mx-auto shadow-inner">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5">
              AI Analysis Disclaimer
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
              AssureBhai performs automated evaluations and clause extractions for educational purposes.
              Always review your actual policy certificate and consult with an IRDAI-registered insurance advisor before making financial decisions.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                id="disagree-button"
                type="button"
                onClick={handleTerminateAnalysis}
                className="flex-1 min-h-[44px] px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
              >
                Disagree
              </button>
              <button
                id="agree-button"
                type="button"
                onClick={handleAgreeDisclaimer}
                className="flex-1 min-h-[44px] px-3 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-colors cursor-pointer"
              >
                Agree &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full border-t border-slate-200 bg-white py-6 sm:py-8 px-4 sm:px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span className="font-semibold text-slate-700">
              Assure<span className="text-amber-600">Bhai</span>
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span>Your Insurance Policy, Simplified.</span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="text-emerald-700 font-medium">100% In-Memory (Zero Storage)</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/privacy"
              className="text-slate-600 hover:text-indigo-600 font-medium transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => setIsFeedbackOpen(true)}
              className="text-slate-600 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
            >
              Feedback
            </button>
            <span className="text-slate-300">•</span>
            <a
              href="https://ashjo966.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-indigo-600 font-medium transition-colors"
            >
              Creator
            </a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto text-center mt-3 text-[11px] text-slate-400">
          © {new Date().getFullYear()} AssureBhai. Independent educational tool. Not affiliated with or endorsed by IRDAI.
        </div>
      </footer>

      {/* Feedback Floating Widget Modal */}
      <FeedbackWidget
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </div>
  );
}
