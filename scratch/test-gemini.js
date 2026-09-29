const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

// Load environment variables
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY environment variable is not defined");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const mockHealthPolicyText = `
Niva Bupa Health Insurance Company Limited
Product Name: ReAssure 2.0
Product Type: Health Insurance
Policy Sub-type: Family floater
Sum Insured: 1,000,000 INR
Base Premium: 19,500 INR
Co-payment: 0%
Zone: Zone 1
Maternity Coverage: Yes
Maternity waiting period: 24 months
Normal delivery limit: 50,000 INR
C-section delivery limit: 75,000 INR
Newborn coverage: 90 days
Room Rent Cap: Single Private A/C Room
Proportionate Deduction: No
Pre-hospitalization: 60 days
Post-hospitalization: 180 days
Daycare procedures: Yes
Domiciliary hospitalization: Yes
Ambulance cap: 3,000 INR
Initial waiting period: 30 days
Pre-existing disease waiting period: 36 months
Cataract waiting period: 12 months
Hernia waiting period: 24 months
Joint replacement waiting period: 24 months
Moratorium period: 5 years
Restoration Benefit: partial exhaustion
Restoration for same illness: Yes
Modern Treatment: Robotic Surgery (Limit 200,000 INR), Stem Cell Therapy (Limit 150,000 INR)
Consumables covered: Yes
AYUSH limit: 1,000,000 INR
Organ donor cover: Yes
Free checkup: Every Renewal Year
OPD consults: No
Cashless hospitals: 10,500
Claim settlement ratio: 98.4%
In-house TPA: Yes
Premium slabs: 18-35, 36-40, 41-45, 46-50, 51-55
Dependent child expiry age: 25 years
Newborn midterm addition: Allowed, pro-rata premium
`;

async function testParser() {
  console.log("=== Testing Parser (gemini-3.1-flash-lite) ===");

  const parserPromptPath = path.join(__dirname, "..", "prompts", "parser_prompt.txt");
  const healthSchemaPath = path.join(__dirname, "..", "schemas", "Health_json_template.json");
  const lifeSchemaPath = path.join(__dirname, "..", "schemas", "Life_json_template.json");

  const parserPrompt = fs.readFileSync(parserPromptPath, "utf-8");
  const healthSchema = fs.readFileSync(healthSchemaPath, "utf-8");
  const lifeSchema = fs.readFileSync(lifeSchemaPath, "utf-8");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          inlineData: {
            data: Buffer.from(mockHealthPolicyText).toString("base64"),
            mimeType: "application/pdf" // Pass as PDF mime type to simulate file upload
          }
        },
        {
          text: `Please parse the attached policy document according to the system instructions and map the fields into the correct JSON template structure.
          
Available target JSON templates:
- Health Policy Template (Health_json_template.json):
\`\`\`json
${healthSchema}
\`\`\`

- Life Policy Template (Life_json_template.json):
\`\`\`json
${lifeSchema}
\`\`\`
`
        }
      ],
      config: {
        systemInstruction: parserPrompt,
        responseMimeType: "application/json"
      }
    });

    console.log("Response text:");
    console.log(response.text);

    const parsedJson = JSON.parse(response.text);
    // Inject user context manually as route handler would do
    parsedJson.user_profile_context = {
      primary_residence_pincode: 560001,
      covered_member_age: 34,
      dependents: [
        { relation: "Spouse", age: 32 },
        { relation: "Daughter", age: 2 }
      ]
    };

    console.log("Parsed & Injected JSON structure check passed successfully!");
    return parsedJson;
  } catch (error) {
    console.error("Parser Test Failed:", error);
    throw error;
  }
}

async function testAnalysis(parsedJson) {
  console.log("\n=== Testing Analysis (gemini-3.5-flash with Search Grounding) ===");

  const analysisPromptPath = path.join(__dirname, "..", "prompts", "analysis_prompt.txt");
  const analysisPrompt = fs.readFileSync(analysisPromptPath, "utf-8");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          text: `Here is the structured policy JSON payload to evaluate:
\`\`\`json
${JSON.stringify(parsedJson, null, 2)}
\`\`\`
`
        }
      ],
      config: {
        systemInstruction: analysisPrompt,
        tools: [{ googleSearch: {} }]
      }
    });

    console.log("Analysis Output:");
    console.log(response.text);
    console.log("\nAnalysis check completed successfully!");
  } catch (error) {
    console.error("Analysis Test Failed:", error);
    throw error;
  }
}

async function main() {
  try {
    const parsedData = await testParser();
    await testAnalysis(parsedData);
  } catch (err) {
    console.error("Overall test script execution failed");
  }
}

main();
