import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Helper replicating extraction logic from aiService.js
function extractJSON(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Empty response received from AI model");
  }

  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/i, "").trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = cleaned.substring(firstBrace, lastBrace + 1);
    return JSON.parse(candidate);
  }

  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const candidate = cleaned.substring(firstBracket, lastBracket + 1);
    return JSON.parse(candidate);
  }

  return JSON.parse(cleaned);
}

describe("AI Response Parsing and Extraction", () => {
  test("successfully parses clean JSON object", () => {
    const input = '{"name": "Sprint 1", "phases": [["Task 1", "2d", "Details"]]}';
    const result = extractJSON(input);
    assert.equal(result.name, "Sprint 1");
    assert.equal(result.phases.length, 1);
  });

  test("extracts JSON wrapped in markdown ```json code fences", () => {
    const input = `\`\`\`json
    {
      "name": "E-Commerce Launch",
      "description": "8-week rollout",
      "phases": [
        ["Setup infra", "1 week", "Provision AWS", "High"]
      ],
      "risks": ["Budget overrun"],
      "roles": ["DevOps Engineer"]
    }
    \`\`\``;
    const result = extractJSON(input);
    assert.equal(result.name, "E-Commerce Launch");
    assert.equal(result.risks[0], "Budget overrun");
  });

  test("extracts JSON surrounded by conversational text", () => {
    const input = `Here is the requested project breakdown:
    {
      "name": "Mobile Redesign",
      "phases": [["UX Review", "3 days", "Audit screens", "Medium"]],
      "risks": [],
      "roles": ["Designer"]
    }
    Hope this helps your sprint!`;
    const result = extractJSON(input);
    assert.equal(result.name, "Mobile Redesign");
    assert.equal(result.phases[0][0], "UX Review");
  });

  test("throws error when input is not valid JSON", () => {
    assert.throws(() => {
      extractJSON("Sorry, I cannot generate this plan.");
    });
  });

  test("throws error when input is null or empty", () => {
    assert.throws(() => {
      extractJSON("");
    });
    assert.throws(() => {
      extractJSON(null);
    });
  });
});
