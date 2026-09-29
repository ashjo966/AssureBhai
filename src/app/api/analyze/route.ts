import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

// Lazily initialize GoogleGenAI client
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }
  return new GoogleGenAI({ apiKey });
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

      console.warn(
        `Gemini API analyze call failed (attempt ${attempt}/${retries}${isRetryable ? ", retryable" : ""}). Retrying in ${delay}ms...`,
        error.message || error
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 1.5; // exponential backoff
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid payload provided" }, { status: 400 });
    }

    // Support both direct { policy_data, mospi_grounding } and root policy json payloads
    const policy_data = payload.policy_data || payload;
    const mospi_grounding = payload.mospi_grounding || {
      cpi_health_inflation_pct: 6.2,
      urban_mpce_salaried_monthly: 7606,
      health_spend_share_pct: 6.8,
    };

    // 1. Inspect document validity
    if (policy_data.document_validity && policy_data.document_validity.is_insurance_document === false) {
      const unsupportedReason =
        policy_data.document_validity.unsupported_document_reason || "Unsupported or invalid document uploaded.";
      return NextResponse.json(
        {
          error: unsupportedReason,
          analysis: unsupportedReason,
        },
        { status: 400 }
      );
    }

    // 2. Load path to the analysis prompt from prompts/ directory
    const analysisPromptPath = path.join(process.cwd(), "prompts", "analysis_prompt.txt");
    const analysisPrompt = fs.readFileSync(analysisPromptPath, "utf-8");

    // 3. Initialize the GoogleGenAI client
    const ai = getGenAIClient();
    const candidateAnalyzeModels = ["gemini-3.7-flash", "gemini-3.6-flash"];

    // 4. Construct the prompt with <POLICY_EXTRACT_JSON> and <MOSPI_ACTUARIAL_BENCHMARKS>
    const userPrompt = `
<POLICY_EXTRACT_JSON>
${JSON.stringify(policy_data, null, 2)}
</POLICY_EXTRACT_JSON>

<MOSPI_ACTUARIAL_BENCHMARKS>
- State Urban Health CPI Inflation: ${mospi_grounding.cpi_health_inflation_pct}%
- Urban Regular Salaried Monthly MPCE: ₹${mospi_grounding.urban_mpce_salaried_monthly}
- Healthcare Expenditure Share: ${mospi_grounding.health_spend_share_pct}%
</MOSPI_ACTUARIAL_BENCHMARKS>
`;

    // 5. Call Gemini with gemini-3.7-flash model and retry wrapper
    let responseText = "";
    let lastAnalyzeErr: any = null;

    for (const modelName of candidateAnalyzeModels) {
      try {
        const response = await withRetry(() =>
          ai.models.generateContent({
            model: modelName,
            contents: userPrompt,
            config: {
              systemInstruction: analysisPrompt,
              temperature: 0.2,
            },
          })
        );
        responseText = response.text || "";
        if (responseText) break;
      } catch (err: any) {
        lastAnalyzeErr = err;
        console.warn(`Gemini analyze model ${modelName} failed, checking fallbacks...`, err.message || err);
      }
    }

    if (!responseText) {
      throw lastAnalyzeErr || new Error("Empty response received from Gemini analysis model.");
    }

    // Clean markdown if wrapped in outer markdown fence
    let cleanMarkdown = responseText.trim();
    if (cleanMarkdown.startsWith("```markdown") && cleanMarkdown.endsWith("```")) {
      cleanMarkdown = cleanMarkdown.replace(/^```markdown\s*/, "").replace(/\s*```$/, "").trim();
    } else if (cleanMarkdown.startsWith("```") && cleanMarkdown.endsWith("```")) {
      cleanMarkdown = cleanMarkdown.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    }

    // 6. Persist exact analysis artifacts to scratch/last_run
    try {
      const debugDir = path.join(process.cwd(), "scratch", "last_run");
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(debugDir, "4_analysis_input.json"),
        JSON.stringify({ policy_data, mospi_grounding }, null, 2),
        "utf-8"
      );
      fs.writeFileSync(path.join(debugDir, "5_analysis_output.md"), cleanMarkdown, "utf-8");
    } catch (debugErr) {
      console.warn("Failed to persist debug artifacts:", debugErr);
    }

    return NextResponse.json({ analysis: cleanMarkdown });
  } catch (error: any) {
    console.error("Error in /api/analyze handler:", error);
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
      : rawMsg || "Internal Server Error";

    return NextResponse.json({ error: friendlyMessage }, { status: is503 ? 503 : 500 });
  }
}
