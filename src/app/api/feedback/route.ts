import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import { queryDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPO_OWNER = process.env.GITHUB_REPO_OWNER || "ashjo966";
const REPO_NAME = process.env.GITHUB_REPO_NAME || "AssureBhai";
const REPO_BRANCH = process.env.GITHUB_REPO_BRANCH || "main";
const FILE_PATH = "assurebhai_feedback.xlsx";

/**
 * Constant-time comparison for secret admin key to prevent timing attacks.
 */
function isAuthorizedAdmin(providedKey: string | null): boolean {
  const adminKey = process.env.FEEDBACK_ADMIN_KEY;
  if (!adminKey || !providedKey) return false;

  const bufProvided = Buffer.from(providedKey);
  const bufAdmin = Buffer.from(adminKey);

  if (bufProvided.length !== bufAdmin.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufProvided, bufAdmin);
}

/**
 * Appends a row [name, feedback] to an XLSX workbook buffer.
 */
function appendFeedbackRow(buffer: Buffer | null, name: string, feedback: string): Buffer {
  let wb: XLSX.WorkBook;
  let sheetName = "Sheet1";

  if (buffer && buffer.length > 0) {
    wb = XLSX.read(buffer, { type: "buffer" });
    sheetName = wb.SheetNames[0] || "Sheet1";
  } else {
    wb = XLSX.utils.book_new();
  }

  const ws = wb.Sheets[sheetName];
  let rows: (string | number | boolean | null | undefined)[][] = [];

  if (ws) {
    rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
  }

  if (rows.length === 0 || !rows[0] || rows[0].length === 0) {
    rows = [["Name", "Feedback"]];
  }

  rows.push([name, feedback]);

  const updatedWs = XLSX.utils.aoa_to_sheet(rows);
  updatedWs["!cols"] = [{ wch: 25 }, { wch: 80 }];

  wb.Sheets[sheetName] = updatedWs;
  if (!wb.SheetNames.includes(sheetName)) {
    XLSX.utils.book_append_sheet(wb, updatedWs, sheetName);
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

/**
 * Updates assurebhai_feedback.xlsx in GitHub repository via GitHub REST API.
 */
async function syncToGitHub(name: string, feedback: string, githubToken: string): Promise<boolean> {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${REPO_BRANCH}`;

  let currentSha: string | null = null;
  let currentBuffer: Buffer | null = null;

  try {
    const getRes = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });

    if (getRes.ok) {
      const data = await getRes.json();
      currentSha = data.sha;
      if (data.content) {
        currentBuffer = Buffer.from(data.content.replace(/\n/g, ""), "base64");
      }
    }
  } catch (err) {
    console.warn("Failed to fetch current feedback file from GitHub:", err);
  }

  const updatedBuffer = appendFeedbackRow(currentBuffer, name, feedback);
  const base64Content = updatedBuffer.toString("base64");

  const putBody: Record<string, unknown> = {
    message: `Add user feedback from ${name}`,
    content: base64Content,
    branch: REPO_BRANCH,
  };

  if (currentSha) {
    putBody.sha = currentSha;
  }

  try {
    const putRes = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(putBody),
    });

    return putRes.ok;
  } catch (err) {
    console.warn("Failed to sync feedback to GitHub:", err);
    return false;
  }
}

/**
 * POST /api/feedback: Ingests user feedback into PostgreSQL database.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, feedback } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is mandatory." }, { status: 400 });
    }

    if (!feedback || typeof feedback !== "string" || !feedback.trim()) {
      return NextResponse.json({ error: "Feedback is mandatory." }, { status: 400 });
    }

    const trimmedName = name.trim().slice(0, 150);
    const trimmedFeedback = feedback.trim().slice(0, 1000);

    let dbSaved = false;

    // 1. Primary storage: PostgreSQL feedback table
    if (process.env.DATABASE_URL) {
      try {
        await queryDb(
          "INSERT INTO feedback (name, feedback) VALUES ($1, $2) RETURNING id, created_at;",
          [trimmedName, trimmedFeedback]
        );
        dbSaved = true;
      } catch (dbErr) {
        console.error("Error inserting feedback into PostgreSQL database:", dbErr);
      }
    } else {
      console.warn("DATABASE_URL not set; skipping PostgreSQL insert.");
    }

    // 2. Secondary local backup: assurebhai_feedback.xlsx
    let localSaved = false;
    try {
      const localFilePath = path.join(process.cwd(), FILE_PATH);
      let localBuffer: Buffer | null = null;
      if (fs.existsSync(localFilePath)) {
        localBuffer = fs.readFileSync(localFilePath);
      }
      const updatedLocalBuffer = appendFeedbackRow(localBuffer, trimmedName, trimmedFeedback);
      fs.writeFileSync(localFilePath, updatedLocalBuffer);
      localSaved = true;
    } catch (localErr) {
      console.warn("Local XLSX backup skipped or unavailable:", localErr);
    }

    // 3. Optional GitHub backup sync
    const githubToken =
      process.env.GITHUB_TOKEN ||
      process.env.GITHUB_FEEDBACK_TOKEN ||
      process.env.GH_TOKEN ||
      process.env.GITHUB_PAT;

    if (githubToken) {
      syncToGitHub(trimmedName, trimmedFeedback, githubToken).catch(() => {});
    }

    if (!dbSaved && !localSaved) {
      return NextResponse.json(
        { error: "Failed to persist feedback to database." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Feedback submitted successfully.",
    });
  } catch (error: unknown) {
    console.error("Error submitting feedback:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to record feedback.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/feedback: Returns all feedback rows for authorized admin.
 * Requires secret key query param ?key=... or header x-admin-key: ...
 */
export async function GET(request: NextRequest) {
  try {
    const keyParam = request.nextUrl.searchParams.get("key");
    const keyHeader = request.headers.get("x-admin-key");
    const providedKey = keyParam || keyHeader;

    if (!isAuthorizedAdmin(providedKey)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Database connection not configured (DATABASE_URL missing)." },
        { status: 500 }
      );
    }

    const result = await queryDb(
      "SELECT id, name, feedback, created_at FROM feedback ORDER BY created_at DESC;"
    );

    return NextResponse.json(result.rows);
  } catch (error: unknown) {
    console.error("Error retrieving feedback rows:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
