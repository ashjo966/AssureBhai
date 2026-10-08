import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

interface SpawnResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

export class PdfPasswordError extends Error {
  code: "PDF_PASSWORD_REQUIRED" | "INVALID_PDF_PASSWORD";
  constructor(code: "PDF_PASSWORD_REQUIRED" | "INVALID_PDF_PASSWORD", message: string) {
    super(message);
    this.name = "PdfPasswordError";
    this.code = code;
  }
}

function checkAndThrowPasswordError(result: SpawnResult | null) {
  if (!result) return;
  if (result.code === 2 || result.stderr?.includes("PDF_PASSWORD_REQUIRED")) {
    throw new PdfPasswordError(
      "PDF_PASSWORD_REQUIRED",
      "This policy document is password-protected. Please enter your policy password."
    );
  }
  if (result.code === 3 || result.stderr?.includes("INVALID_PDF_PASSWORD")) {
    throw new PdfPasswordError(
      "INVALID_PDF_PASSWORD",
      "Incorrect password. Most insurers use your Date of Birth (DDMMYYYY) or PAN."
    );
  }
}

/**
 * Executes a python command with arguments, returning stdout/stderr and exit code.
 */
function runPythonCommand(cmd: string, args: string[], timeoutMs = 15000): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    let child: any;
    let timer: NodeJS.Timeout | null = null;
    let isSettled = false;

    try {
      child = spawn(cmd, args, {
        windowsHide: true,
      });
    } catch (err) {
      return reject(err);
    }

    let stdout = "";
    let stderr = "";

    timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        try {
          child.kill("SIGKILL");
        } catch {
          // ignore
        }
        reject(new Error(`Python command timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    child.on("error", (err: any) => {
      if (!isSettled) {
        isSettled = true;
        if (timer) clearTimeout(timer);
        reject(err);
      }
    });

    child.on("close", (code: number | null) => {
      if (!isSettled) {
        isSettled = true;
        if (timer) clearTimeout(timer);
        resolve({ stdout, stderr, code });
      }
    });
  });
}

/**
 * Invokes python helper script to convert a PDF file into clean Markdown using Microsoft MarkItDown.
 * Seamlessly tries 'python3' first, falling back to 'python' if 'python3' is unavailable or fails.
 *
 * @param buffer - Buffer containing the PDF document
 * @param password - Optional password for password-protected/encrypted PDF documents
 * @returns Promise<string> containing extracted Markdown text
 */
export async function convertPdfToMarkdown(buffer: Buffer, password?: string): Promise<string> {
  const scriptPath = path.join(process.cwd(), "scripts", "convert_to_md.py");
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const tempFileName = `assurebhai-temp-${Date.now()}-${randomSuffix}.pdf`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);

  try {
    // 1. Write the temporary PDF file to os.tmpdir()
    await fs.promises.writeFile(tempFilePath, buffer);

    const scriptArgs = password ? [scriptPath, tempFilePath, password] : [scriptPath, tempFilePath];

    // 2. Try invoking configured PYTHON_PATH or python3 first, fallback to python if unavailable
    let executionResult: SpawnResult | null = null;
    let python3Error: Error | unknown = null;
    const primaryPython = process.env.PYTHON_PATH || "python3";

    try {
      const result = await runPythonCommand(primaryPython, scriptArgs);
      checkAndThrowPasswordError(result);
      if (result.code === 0) {
        executionResult = result;
      } else {
        python3Error = new Error(
          `${primaryPython} exited with code ${result.code}: ${result.stderr || result.stdout}`
        );
      }
    } catch (err) {
      if (err instanceof PdfPasswordError) {
        throw err;
      }
      python3Error = err;
    }

    // Fallback to 'python' if primary command failed or was not found
    if (!executionResult && primaryPython !== "python") {
      try {
        const result = await runPythonCommand("python", scriptArgs);
        checkAndThrowPasswordError(result);
        if (result.code === 0) {
          executionResult = result;
        } else {
          throw new Error(
            `python exited with code ${result.code}: ${result.stderr || result.stdout}`
          );
        }
      } catch (pythonErr) {
        if (pythonErr instanceof PdfPasswordError) {
          throw pythonErr;
        }
        throw new Error(
          `Failed to execute MarkItDown conversion using ${primaryPython} and python.\n` +
          `Primary error: ${python3Error instanceof Error ? python3Error.message : String(python3Error)}\n` +
          `Fallback error: ${pythonErr instanceof Error ? pythonErr.message : String(pythonErr)}`
        );
      }
    }

    if (!executionResult) {
      throw new Error(
        `Failed to execute MarkItDown conversion using ${primaryPython}.\n` +
        `Error: ${python3Error instanceof Error ? python3Error.message : String(python3Error)}`
      );
    }

    return executionResult.stdout;
  } finally {
    // 3. Clean up the temporary PDF file even if process fails
    try {
      if (fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath);
      }
    } catch (cleanupErr) {
      console.warn(`Failed to remove temp file ${tempFilePath}:`, cleanupErr);
    }
  }
}
