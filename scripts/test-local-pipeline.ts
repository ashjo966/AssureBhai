import fs from "fs";
import path from "path";
import { convertPdfToMarkdown } from "../src/lib/markitdown.ts";

/**
 * Creates a minimal valid PDF Buffer containing sample insurance policy text.
 */
function createSamplePdfBuffer(): Buffer {
  const content = `BT
/F1 14 Tf
50 750 Td
(ASSUREBHAI SAMPLE HEALTH INSURANCE POLICY SCHEDULE) Tj
/F1 10 Tf
0 -30 Td
(Policy Issuer: Niva Bupa Health Insurance) Tj
0 -18 Td
(Policy Type: Health - Family Floater) Tj
0 -18 Td
(Sum Insured: INR 10,00,000) Tj
0 -18 Td
(Base Premium: INR 19,500 per annum) Tj
0 -25 Td
(CRITICAL POLICY CLAUSES & WAITING PERIODS:) Tj
0 -18 Td
(- Initial Waiting Period: 30 Days for all illnesses except accidents.) Tj
0 -18 Td
(- Pre-existing Diseases (PED): 36 Months continuous coverage required.) Tj
0 -18 Td
(- Room Rent Cap: Single Private A/C Room. No proportionate deductions.) Tj
0 -18 Td
(- Modern Treatments: Robotic Surgery covered up to INR 2,00,000.) Tj
0 -18 Td
(- Restoration Benefit: 100% partial exhaustion restore for same/different illness.) Tj
ET`;

  const streamLength = Buffer.byteLength(content, "utf-8");

  const pdfTemplate = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${content}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000298 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
377
%%EOF`;

  return Buffer.from(pdfTemplate, "utf-8");
}

async function runLocalPipelineTest() {
  console.log("==================================================");
  console.log("🚀 Starting AssureBhai Local Pipeline & Subprocess Test");
  console.log("==================================================");

  try {
    // 1. Generate sample PDF buffer
    console.log("\n1. Generating sample insurance PDF buffer...");
    const samplePdfBuffer = createSamplePdfBuffer();
    console.log(`✓ Generated sample PDF buffer (${samplePdfBuffer.length} bytes)`);

    // 2. Invoke convertPdfToMarkdown
    console.log("\n2. Invoking convertPdfToMarkdown via Python MarkItDown bridge...");
    const startTime = Date.now();
    const markdownOutput = await convertPdfToMarkdown(samplePdfBuffer);
    const duration = Date.now() - startTime;

    console.log(`✓ Conversion completed in ${duration}ms!`);

    // 3. Inspect Markdown Output
    console.log("\n--------------------------------------------------");
    console.log("📝 Resulting Markdown Output from MarkItDown:");
    console.log("--------------------------------------------------");
    console.log(markdownOutput.trim() || "(Empty text extracted)");
    console.log("--------------------------------------------------");

    // 4. Assertions
    if (!markdownOutput || markdownOutput.trim().length === 0) {
      throw new Error("MarkItDown returned empty text content.");
    }

    console.log("\n✅ ALL LOCAL PIPELINE SUBPROCESS TESTS PASSED SUCCESSFULLY!");
    console.log("==================================================");
  } catch (error) {
    console.error("\n❌ LOCAL PIPELINE TEST FAILED:");
    console.error(error);
    process.exit(1);
  }
}

runLocalPipelineTest();
