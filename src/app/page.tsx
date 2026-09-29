"use client";

import React, { useState, useEffect, useRef } from "react";
import { Shield } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { AnalysisReport } from "@/components/analysis-report";
import { resolvePincode, MospiStats } from "@/lib/resolvePincode";

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

  return rawMsg || fallback;
}

export default function Home() {
  // Page states
  const [pageState, setPageState] = useState<"home" | "analysis">("home");

  // Form fields
  const [file, setFile] = useState<File | null>(null);
  const [pincode, setPincode] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [mospiStats, setMospiStats] = useState<MospiStats | null>(null);

  // Dependent creation temp state
  const [showAddDependentForm, setShowAddDependentForm] = useState(false);
  const [tempRelation, setTempRelation] = useState("Spouse");
  const [tempAge, setTempAge] = useState("");

  // Loading states
  const [isParsing, setIsParsing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Errors and Results
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>("");

  // Typewriter effect states
  const [wordIndex, setWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag and drop visual state
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    setDependents([...dependents, newDependent]);
    setTempAge("");
    setShowAddDependentForm(false);
  };

  const handleRemoveDependent = (id: string) => {
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
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // Step 1: POST to /api/parse
  const handleAnalyzeDocument = async () => {
    setError(null);

    // Validations
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

    setIsParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Local zero-token PIN code lookup to extract MoSPI stats and demographic location
      const resolvedPincode = resolvePincode(pincode);
      setMospiStats(resolvedPincode.mospi_stats);

      // Strict user context payload constructed directly from UI form fields
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

      const response = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to parse the insurance document (Status ${response.status}).`);
      }

      const result = await response.json();

      // Check document validity
      if (result.document_validity && result.document_validity.is_insurance_document === false) {
        setError(result.document_validity.unsupported_document_reason || "Invalid document uploaded.");
        setIsParsing(false);
        return;
      }

      // Successful parsing, store and show disclaimer popup
      setParsedData(result);
      setShowDisclaimer(true);
    } catch (err: unknown) {
      console.error(err);
      setError(
        formatFriendlyErrorMessage(err, "An error occurred while connecting to the parser engine.")
      );
    } finally {
      setIsParsing(false);
    }
  };

  // Step 2: POST to /api/analyze
  const handleAgreeDisclaimer = async () => {
    setShowDisclaimer(false);
    setPageState("analysis");
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          policy_data: parsedData,
          mospi_grounding: mospiStats,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to analyze the insurance policy (Status ${response.status}).`);
      }

      const result = await response.json();
      setAnalysisResult(result.analysis || "");
    } catch (err: unknown) {
      console.error(err);
      setError(
        formatFriendlyErrorMessage(err, "An error occurred while running the policy analysis.")
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDisagreeDisclaimer = () => {
    setShowDisclaimer(false);
  };

  const handleReset = () => {
    setPageState("home");
    setFile(null);
    setPincode("");
    setAge("");
    setDependents([]);
    setMospiStats(null);
    setParsedData(null);
    setAnalysisResult("");
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans antialiased text-slate-800 selection:bg-indigo-100">
      
      {/* Top Navigation Banner */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="w-full px-2 sm:px-6 lg:px-8 py-[11px] h-[48px] sm:h-[52px] flex items-center justify-between">
          <div id="logo-brand" className="flex items-center cursor-pointer" onClick={handleReset}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="AssureBhai Logo"
              className="h-[26px] sm:h-[30px] w-auto object-contain"
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            {pageState === "analysis" && (
              <button
                id="new-policy-button"
                onClick={handleReset}
                className="inline-flex items-center px-2.5 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap"
              >
                Analyze new policy
              </button>
            )}
            <a
              id="creator-about"
              href="https://ashjo966.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-1.5 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors whitespace-nowrap"
            >
              About the creator
            </a>
            <a
              id="creator-contact"
              href="https://ashjo966.github.io/index.html#contact"
              target="_blank"
              rel="noopener noreferrer"
              className="px-1.5 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors whitespace-nowrap"
            >
              Contact the creator
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col justify-start">
        {pageState === "home" ? (
          /* HOMEPAGE VIEW */
          <div className="max-w-3xl mx-auto w-full flex flex-col items-center">
            
            {/* Dynamic Hero Section */}
            <div className="text-center mt-2 sm:mt-4 mb-6 sm:mb-8">
              <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Your{" "}
                <span className="text-indigo-600 relative inline-block">
                  {currentText}
                  <span className="absolute right-[-4px] top-[10%] h-[80%] w-0.5 bg-indigo-600 animate-pulse" />
                </span>{" "}
                policy, simplified.
              </h1>
              <p className="mt-6 sm:mt-8 text-base sm:text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
                Upload your policy PDF to analyze terms, uncover hidden clauses, and verify statutory IRDAI benchmarks instantly.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="w-full mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start gap-3">
                <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full p-8 sm:p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
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
                className="hidden"
              />
              
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                file ? "bg-emerald-100 text-emerald-600" : "bg-indigo-50 text-indigo-600"
              }`}>
                {file ? (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>

              {file ? (
                <div className="text-center">
                  <p className="font-semibold text-slate-800 max-w-md truncate">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB • PDF Document</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="mt-3 text-xs text-rose-500 hover:underline font-medium"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-semibold text-slate-800">Drag & drop your policy PDF here</p>
                  <p className="text-sm text-slate-400 mt-1">or click to browse files</p>
                  <p className="text-xs text-slate-400 mt-3 font-medium">Single file (.pdf only, max 50MB)</p>
                </div>
              )}
            </div>

            {/* Profile Fields Card */}
            <div className="w-full mt-6 bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900">Policyholder details</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  To accurately evaluate zone-based copayments, city medical tiering, and family coverage limits. Your data is used only for analysis and is never stored.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="pincode" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Primary Residence Pincode <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="pincode"
                    value={pincode}
                    onChange={handlePincodeChange}
                    placeholder="e.g. 560001"
                    maxLength={6}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  />
                  <p className="text-xs text-slate-400 mt-1">Mandatory, exact 6 digits</p>
                </div>

                <div>
                  <label htmlFor="age" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Policyholder Age <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="age"
                    value={age}
                    onChange={handleAgeChange}
                    placeholder="e.g. 32"
                    maxLength={2}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
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
                    disabled={dependents.length >= 5}
                    onClick={() => setShowAddDependentForm(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    + Add Dependent ({dependents.length}/5)
                  </button>
                </div>

                {/* Inline Add Form */}
                {showAddDependentForm && (
                  <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
                    <div className="w-full sm:w-44">
                      <select
                        value={tempRelation}
                        onChange={(e) => setTempRelation(e.target.value)}
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

                    <div className="w-full sm:w-28">
                      <input
                        type="text"
                        placeholder="Age"
                        value={tempAge}
                        onChange={handleTempAgeChange}
                        maxLength={2}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddDependent}
                        disabled={!tempAge}
                        className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddDependentForm(false)}
                        className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
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
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-sm font-medium text-slate-700"
                      >
                        <span>{dep.relation} ({dep.age} yrs)</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDependent(dep.id)}
                          className="text-slate-400 hover:text-rose-500"
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

            {/* Primary CTA */}
            <button
              id="analyze-button"
              onClick={handleAnalyzeDocument}
              disabled={isParsing}
              className="mt-8 w-full sm:w-auto px-10 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-3 text-lg"
            >
              {isParsing ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Reading your policy...
                </>
              ) : (
                "Analyze Document"
              )}
            </button>

          </div>
        ) : (
          /* ANALYSIS VIEW */
          <div className="w-full flex flex-col gap-6">
            
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Policy Evaluation Report</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Evaluated against official IRDAI regulatory baselines and underwriting guidelines.
                </p>
              </div>
              <button
                onClick={handleReset}
                className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                ← Analyze new policy
              </button>
            </div>

            {/* Loading / Generating State */}
            {isAnalyzing ? (
              <div className="max-w-2xl mx-auto w-full py-20 flex flex-col items-center justify-center text-center">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-indigo-600 animate-spin" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Generating Comprehensive Analysis...</h2>
                <p className="text-slate-500 max-w-md text-sm">
                  Evaluating policy clauses, room rent limitations, waiting periods, and statutory IRDAI benchmarks.
                </p>
              </div>
            ) : error ? (
              <div className="max-w-2xl mx-auto w-full py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Analysis Failed</h2>
                <p className="text-slate-500 mb-6 text-sm">{error}</p>
                <button onClick={handleReset} className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">
                  Try Again
                </button>
              </div>
            ) : (
              /* MODULAR 6-SECTION POLICY ANALYSIS REPORT */
              <AnalysisReport analysis={analysisResult} parsedData={parsedData} />
            )}

          </div>
        )}
      </main>

      {/* AI Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-2">AI Analysis Disclaimer</h3>
            
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              AssureBhai performs automated policy evaluations and extracts clause structures for informational and educational purposes. 
              Always review your actual policy certificate and consult with an IRDAI-registered insurance advisor before making financial decisions.
            </p>

            <div className="flex items-center gap-3">
              <button
                id="disagree-button"
                type="button"
                onClick={handleDisagreeDisclaimer}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                Disagree
              </button>
              <button
                id="agree-button"
                type="button"
                onClick={handleAgreeDisclaimer}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-colors"
              >
                Agree & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
