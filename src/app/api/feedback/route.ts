import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPO_OWNER = process.env.GITHUB_REPO_OWNER || "ashjo966";
const REPO_NAME = process.env.GITHUB_REPO_NAME || "AssureBhai";
const REPO_BRANCH = process.env.GITHUB_REPO_BRANCH || "main";
const FILE_PATH = "assurebhai_feedback.xlsx";

/**
 * Appends a row [name, feedback] to an XLSX workbook buffer and returns the updated buffer.
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
    if (rows.length === 0) {
      rows.push(["Name", "Feedback"]);
    }
  } else {
    rows = [["Name", "Feedback"]];
  }

  // Ensure header is present if first row is empty or not matching
  if (rows.length === 0 || !rows[0] || rows[0].length === 0) {
    rows[0] = ["Name", "Feedback"];
  }

  // Append new feedback entry in 2-column format: Column A (Name), Column B (Feedback)
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
 * Updates assurebhai_feedback.xlsx in GitHub repository via GitHub REST API if token is available.
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
    } else if (getRes.status !== 404) {
      console.warn(`GitHub API GET ${url} returned ${getRes.status}: ${await getRes.text()}`);
    }
  } catch (err) {
    console.warn("Failed to fetch current feedback file from GitHub:", err);
  }

  // Generate updated buffer
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

  const putRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(putBody),
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    console.error(`GitHub API PUT returned status ${putRes.status}: ${errText}`);
    return false;
  }

  return true;
}

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

    const trimmedName = name.trim().slice(0, 50);
    const trimmedFeedback = feedback.trim().slice(0, 500);

    const localFilePath = path.join(process.cwd(), FILE_PATH);
    let localSaved = false;

    // 1. Update local file on disk
    try {
      let localBuffer: Buffer | null = null;
      if (fs.existsSync(localFilePath)) {
        localBuffer = fs.readFileSync(localFilePath);
      }
      const updatedLocalBuffer = appendFeedbackRow(localBuffer, trimmedName, trimmedFeedback);
      fs.writeFileSync(localFilePath, updatedLocalBuffer);
      localSaved = true;
    } catch (localErr: unknown) {
      console.warn("Could not save feedback to local disk:", localErr);
      const rawMsg = localErr instanceof Error ? localErr.message : String(localErr);
      if (rawMsg.includes("EBUSY") || rawMsg.includes("EPERM") || rawMsg.includes("locked") || rawMsg.includes("busy")) {
        return NextResponse.json(
          {
            error:
              "assurebhai_feedback.xlsx is currently open in Microsoft Excel or another program. Please close the file in Excel and try again.",
          },
          { status: 500 }
        );
      }
    }

    // 2. Sync to GitHub repository if GITHUB_TOKEN is provided
    const githubToken =
      process.env.GITHUB_TOKEN ||
      process.env.GITHUB_FEEDBACK_TOKEN ||
      process.env.GH_TOKEN ||
      process.env.GITHUB_PAT;

    let githubSynced = false;
    if (githubToken) {
      try {
        githubSynced = await syncToGitHub(trimmedName, trimmedFeedback, githubToken);
      } catch (ghErr) {
        console.error("Error syncing feedback to GitHub:", ghErr);
      }
    }

    if (!localSaved && !githubSynced && !githubToken) {
      return NextResponse.json({ error: "Failed to persist feedback to storage." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Feedback submitted successfully.",
      syncedToGitHub: githubSynced,
    });
  } catch (error: unknown) {
    console.error("Error submitting feedback:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to record feedback.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
