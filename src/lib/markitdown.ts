import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

interface SpawnResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

/**
 * Executes a python command with arguments, returning stdout/stderr and exit code.
 */
function runPythonCommand(cmd: string, args: string[]): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(cmd, args, {
        windowsHide: true,
      });
    } catch (err) {
      return reject(err);
    }

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    child.on("error", (err) => {
      reject(err);
    });

    child.on("close", (code) => {
      resolve({ stdout, stderr, code });
    });
  });
}

/**
 * Invokes python helper script to convert a PDF file into clean Markdown using Microsoft MarkItDown.
 * Seamlessly tries 'python3' first, falling back to 'python' if 'python3' is unavailable or fails.
 *
 * @param buffer - Buffer containing the PDF document
 * @returns Promise<string> containing extracted Markdown text
 */
export async function convertPdfToMarkdown(buffer: Buffer): Promise<string> {
  const scriptPath = path.join(process.cwd(), "scripts", "convert_to_md.py");
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const tempFileName = `assurebhai-temp-${Date.now()}-${randomSuffix}.pdf`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);

  try {
    // 1. Write the temporary PDF file to os.tmpdir()
    await fs.promises.writeFile(tempFilePath, buffer);

    // 2. Try invoking python3 first, fallback to python if unavailable
    let executionResult: SpawnResult | null = null;
    let python3Error: Error | unknown = null;

    try {
      const result = await runPythonCommand("python3", [scriptPath, tempFilePath]);
      if (result.code === 0) {
        executionResult = result;
      } else {
        python3Error = new Error(
          `python3 exited with code ${result.code}: ${result.stderr || result.stdout}`
        );
      }
    } catch (err) {
      python3Error = err;
    }

    // Fallback to 'python' if python3 failed or was not found
    if (!executionResult) {
      try {
        const result = await runPythonCommand("python", [scriptPath, tempFilePath]);
        if (result.code === 0) {
          executionResult = result;
        } else {
          throw new Error(
            `python exited with code ${result.code}: ${result.stderr || result.stdout}`
          );
        }
      } catch (pythonErr) {
        throw new Error(
          `Failed to execute MarkItDown conversion using python3 and python.\n` +
          `python3 error: ${python3Error instanceof Error ? python3Error.message : String(python3Error)}\n` +
          `python error: ${pythonErr instanceof Error ? pythonErr.message : String(pythonErr)}`
        );
      }
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
