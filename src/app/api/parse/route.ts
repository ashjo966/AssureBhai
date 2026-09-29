import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { convertPdfToMarkdown } from "@/lib/markitdown";
import { resolvePincode } from "@/lib/resolvePincode";

export const runtime = "nodejs";

// Lazily initialize GoogleGenAI client
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }
  return new GoogleGenAI({ apiKey });
}

// Load IRDAI statistical benchmarks strictly from src/data
function loadIRDAIStats() {
  const healthPath = path.join(process.cwd(), "src", "data", "Health_IRDAI_stats.json");
  const lifePath = path.join(process.cwd(), "src", "data", "Life_IRDAI_stats.json");

  const healthStats = JSON.parse(fs.readFileSync(healthPath, "utf-8"));
  const lifeStats = JSON.parse(fs.readFileSync(lifePath, "utf-8"));

  return { healthStats, lifeStats };
}

// Deterministic IRDAI Benchmark Enrichment Helper
function enrichIRDAIBenchmarks(parsedPayload: any, healthStats: any, lifeStats: any) {
  if (!parsedPayload || typeof parsedPayload !== "object") return;
  const policyType = parsedPayload.policy_classification?.policy_type;
  const rawIssuer = (parsedPayload.policy_classification?.policy_issuer || "").toLowerCase().trim();

  if (!rawIssuer) return;

  if (policyType === "Life") {
    const insurers = lifeStats.insurers || {};
    for (const [key, item] of Object.entries(insurers) as [string, any][]) {
      const matchKey = key.toLowerCase();
      const matchName = (item.name || "").toLowerCase();
      const matchAliases = (item.aliases || []).map((a: string) => a.toLowerCase());
      if (
        rawIssuer.includes(matchKey) ||
        matchName.includes(rawIssuer) ||
        rawIssuer.includes(matchName) ||
        matchAliases.some((alias: string) => rawIssuer.includes(alias) || alias.includes(rawIssuer))
      ) {
        parsedPayload.irdai_benchmarks = {
          solvency_ratio: item.solvency_ratio,
          claim_settlement_ratio: item.claim_settlement_ratio,
          complaints_per_10k_claims: item.complaints_per_10k_claims,
        };
        return;
      }
    }
  } else {
    // Health vertical
    const insurers = healthStats.insurers || {};
    for (const [key, item] of Object.entries(insurers) as [string, any][]) {
      const matchKey = key.toLowerCase();
      const matchName = (item.name || "").toLowerCase();
      const matchAliases = (item.aliases || []).map((a: string) => a.toLowerCase());
      if (
        rawIssuer.includes(matchKey) ||
        matchName.includes(rawIssuer) ||
        rawIssuer.includes(matchName) ||
        matchAliases.some((alias: string) => rawIssuer.includes(alias) || alias.includes(rawIssuer))
      ) {
        parsedPayload.irdai_benchmarks = {
          solvency_ratio: item.solvency_ratio,
          claim_settlement_ratio: item.claim_settlement_ratio,
          incurred_claims_ratio: item.incurred_claims_ratio,
          cashless_hospitals: item.cashless_hospitals,
          cashless_claim_share_pct: item.cashless_claim_share_pct,
          complaints_per_10k_claims: item.complaints_per_10k_claims,
        };
        return;
      }
    }
  }
}

// Exponential backoff retry helper
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const isRetryable =
        error?.status === 429 ||
        error?.status === 503 ||
        error?.statusCode === 429 ||
        error?.statusCode === 503 ||
        (error?.message &&
          (error.message.includes("429") ||
            error.message.includes("503") ||
            error.message.toLowerCase().includes("rate limit") ||
            error.message.toLowerCase().includes("quota") ||
            error.message.toLowerCase().includes("high demand")));

      if (!isRetryable || attempt >= retries) {
        throw error;
      }
      console.warn(`Gemini API parse call failed (attempt ${attempt}/${retries}). Retrying in ${delay}ms...`, error.message || error);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 1.5;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userContextRaw = formData.get("user_context") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No PDF file provided in the upload request." },
        { status: 400 }
      );
    }

    // 1. Strict User Profile Context from UI
    if (!userContextRaw) {
      return NextResponse.json(
        { error: "Missing user_context from form submission." },
        { status: 400 }
      );
    }

    let userContext: {
      primary_residence_pincode: number;
      covered_member_age: number;
      dependents: Array<{ relation: string; age: number }>;
      state?: string;
      city_tier?: string;
      expected_insurance_zone?: string;
    };

    try {
      userContext = JSON.parse(userContextRaw);
    } catch (parseErr) {
      return NextResponse.json(
        { error: "Invalid user_context JSON payload sent from UI." },
        { status: 400 }
      );
    }

    // Zero-token local PIN code enrichment
    const pincodeResolution = resolvePincode(userContext.primary_residence_pincode);
    userContext = {
      ...userContext,
      state: pincodeResolution.state,
      city_tier: pincodeResolution.city_tier,
      expected_insurance_zone: pincodeResolution.expected_insurance_zone,
    };

    // 2. Extract text directly from the uploaded PDF using MarkItDown
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = "";

    try {
      extractedText = await convertPdfToMarkdown(buffer);
    } catch (markitdownErr) {
      console.warn("MarkItDown extraction failed, falling back to pdf-parse:", markitdownErr);
      try {
        const { PDFParse } = require("pdf-parse");
        const pdfInstance = new PDFParse({ data: buffer });
        const pdfData = await pdfInstance.getText();
        extractedText = pdfData.text || "";
        await pdfInstance.destroy();
      } catch (pdfErr) {
        console.warn("pdf-parse extraction fallback failed:", pdfErr);
      }
    }

    // 3. OCR Fallback if text is empty or image-scanned
    if (extractedText.trim().length < 50 && process.env.OCR_SPACE_API_KEY) {
      try {
        const ocrFormData = new FormData();
        ocrFormData.append("file", file);
        ocrFormData.append("apikey", process.env.OCR_SPACE_API_KEY);
        ocrFormData.append("isTable", "true");
        ocrFormData.append("OCREngine", "2");

        const ocrResponse = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          body: ocrFormData,
        });

        const ocrResult = await ocrResponse.json();
        if (ocrResult?.ParsedResults?.length > 0) {
          extractedText = ocrResult.ParsedResults.map(
            (r: { ParsedText: string }) => r.ParsedText
          ).join("\n");
        }
      } catch (ocrErr) {
        console.error("OCR Fallback failed:", ocrErr);
      }
    }

    // 4. Load parser prompt directly from prompts/ directory
    const promptFilePath = path.join(process.cwd(), "prompts", "parser_prompt.txt");
    const baseParserPrompt = fs.readFileSync(promptFilePath, "utf-8");

    // 5. Load IRDAI statistical benchmarks from src/data ONLY
    const { healthStats, lifeStats } = loadIRDAIStats();

    const fullSystemPrompt = `${baseParserPrompt}

### PRE-LOADED IRDAI STATISTICAL BENCHMARK METRICS (FROM LOCAL src/data)
<HEALTH_IRDAI_STATS>
${JSON.stringify(healthStats, null, 2)}
</HEALTH_IRDAI_STATS>

<LIFE_IRDAI_STATS>
${JSON.stringify(lifeStats, null, 2)}
</LIFE_IRDAI_STATS>
`;

    // 6. Assemble User Prompt with Untrusted Document & Injected User Context
    const userMessageContent = `
<USER_CONTEXT>
${JSON.stringify(userContext, null, 2)}
</USER_CONTEXT>

<UNTRUSTED_DOCUMENT>
${extractedText.slice(0, 45000)}
</UNTRUSTED_DOCUMENT>
`;

    // 7. Call Google GenAI SDK (Gemini) with gemini-3.5-flash-lite in JSON mode
    const ai = getGenAIClient();
    const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.6-flash"];

    let responseText = "";
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await withRetry(() =>
          ai.models.generateContent({
            model: modelName,
            contents: userMessageContent,
            config: {
              systemInstruction: fullSystemPrompt,
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          })
        );
        responseText = response.text || "{}";
        if (responseText) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini parser model ${modelName} call failed, checking fallbacks...`, err.message || err);
      }
    }

    if (!responseText) {
      throw lastError || new Error("Failed to get JSON completion from Gemini parser.");
    }

    const parsedPayload = JSON.parse(responseText);

    // 8. Enrich IRDAI benchmark statistics deterministically
    enrichIRDAIBenchmarks(parsedPayload, healthStats, lifeStats);

    // Deterministic Normalization for Multi-Year Health Insurance Tenure & Premium
    if (parsedPayload.financial_terms && typeof parsedPayload.financial_terms === "object") {
      const ft = parsedPayload.financial_terms;
      const basePrem = typeof ft.base_premium === "number" ? ft.base_premium : (typeof ft.sum_assured === "number" ? 0 : 0);
      let tenure = typeof ft.tenure_years === "number" && ft.tenure_years > 0 ? ft.tenure_years : 1;
      const payFreq = ft.payment_frequency || (tenure > 1 ? "Single Premium" : "Annual");

      ft.tenure_years = tenure;
      ft.payment_frequency = payFreq;

      if (typeof ft.annualized_base_premium !== "number" || ft.annualized_base_premium <= 0) {
        if (tenure > 1 && (payFreq.toLowerCase().includes("single") || payFreq.toLowerCase().includes("multi"))) {
          ft.annualized_base_premium = Math.round((basePrem / tenure) * 100) / 100;
        } else {
          ft.annualized_base_premium = basePrem;
        }
      }
    }

    // 9. Attach the exact user profile context from UI
    parsedPayload.user_profile_context = userContext;

    // 10. Persist exact run artifacts to scratch/last_run
    try {
      const debugDir = path.join(process.cwd(), "scratch", "last_run");
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      fs.writeFileSync(path.join(debugDir, "1_extracted_markitdown.md"), extractedText, "utf-8");
      fs.writeFileSync(path.join(debugDir, "2_parser_system_prompt.txt"), fullSystemPrompt, "utf-8");
      fs.writeFileSync(path.join(debugDir, "2_parser_user_prompt.txt"), userMessageContent, "utf-8");
      fs.writeFileSync(path.join(debugDir, "3_parser_response.json"), JSON.stringify(parsedPayload, null, 2), "utf-8");
    } catch (debugErr) {
      console.warn("Failed to persist debug artifacts:", debugErr);
    }

    return NextResponse.json(parsedPayload, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/parse route:", error);
    const rawMsg = error?.message || String(error);
    const is503 =
      error?.status === 503 ||
      error?.statusCode === 503 ||
      rawMsg.includes("503") ||
      rawMsg.toLowerCase().includes("high demand") ||
      rawMsg.toLowerCase().includes("unavailable") ||
      rawMsg.toLowerCase().includes("overloaded");

    const friendlyMessage = is503
      ? "This website is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."
      : rawMsg || "Failed to parse document.";

    return NextResponse.json(
      {
        error: friendlyMessage,
        details: error?.message || String(error),
      },
      { status: is503 ? 503 : 500 }
    );
  }
}