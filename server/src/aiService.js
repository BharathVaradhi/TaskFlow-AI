
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Safely extract JSON from an AI response.
 */
function extractJSON(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Empty response received from AI model.");
  }

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }

  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  if (firstBracket !== -1 && lastBracket > firstBracket) {
    return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
  }

  return JSON.parse(cleaned);
}

/**
 * Call Groq.
 */
async function queryGroq(systemPrompt, userPrompt, temperature) {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY.trim(),
  });

  // Override the model through server/.env if needed.
  const model =
    process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
    max_tokens: 1500,
  });

  const content = completion.choices?.[0]?.message?.content;

  if (!content || !content.trim()) {
    throw new Error("Groq returned an empty response.");
  }

  return content.trim();
}

/**
 * Call Gemini.
 */
async function queryGemini(systemPrompt, userPrompt, temperature) {
  const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY.trim()
  );

  // Override the model through server/.env if needed.
  const modelName =
    process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature,
      maxOutputTokens: 1500,
    },
  });

  const result = await model.generateContent(userPrompt);
  const content = result.response.text();

  if (!content || !content.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  return content.trim();
}

/**
 * Central AI provider with fallback.
 * Tries Groq first, then Gemini if configured.
 */
export async function queryLLM(
  systemPrompt,
  userPrompt,
  temperature = 0.3
) {
  const hasGroq = Boolean(process.env.GROQ_API_KEY?.trim());
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());

  if (!hasGroq && !hasGemini) {
    const error = new Error(
      "No AI provider configured. Set GROQ_API_KEY or GEMINI_API_KEY in server/.env."
    );
    error.status = 503;
    throw error;
  }

  let groqError = null;

  if (hasGroq) {
    try {
      return await queryGroq(
        systemPrompt,
        userPrompt,
        temperature
      );
    } catch (error) {
      groqError = error;
      console.error("Groq request failed:", {
        status: error.status,
        code: error.code,
        message: error.message,
      });
    }
  }

  if (hasGemini) {
    try {
      return await queryGemini(
        systemPrompt,
        userPrompt,
        temperature
      );
    } catch (error) {
      console.error("Gemini request failed:", {
        status: error.status,
        message: error.message,
      });

      const combinedError = new Error(
        `AI providers failed. Groq: ${
          groqError?.message || "not attempted"
        }. Gemini: ${error.message}`
      );

      combinedError.status = 502;
      throw combinedError;
    }
  }

  const error = new Error(
    `Groq AI request failed: ${groqError?.message || "Unknown error"}`
  );

  error.status = groqError?.status || 502;
  throw error;
}

/**
 * Generate a structured project plan or task breakdown.
 */
export async function generatePlan(tool, prompt, workspaceContext = "") {
  const toolGuidance = {
    "Project planner": "Create an end-to-end project plan. Include objectives, concrete deliverables, phases, milestones, dependencies, time estimates, responsible roles, and specific risks.",
    "Task breakdown": "Decompose the supplied goal into implementable tasks. Each phase must identify a task, completion criteria, dependencies, estimated effort, priority, and a suggested role. Avoid broad project phases.",
    "Sprint planner": "Plan a sprint with a clear sprint objective, a prioritized backlog, effort estimates, dependencies, testing activities, and completion criteria. Do not invent team capacity; if capacity was not supplied, state that it is unknown.",
    "Risk analyzer": "Analyze only the supplied project description and verified workspace data. Separate verified facts from inferred risks. Prioritize risk items and include likelihood, impact, severity, mitigation, contingency, and suggested owner in each risk description.",
    "Weekly report": "Write a weekly delivery report from the verified workspace data only: completed work, work in progress, blockers, risks, milestones, next-week priorities, and follow-up actions. If a category has no supporting data, say that it was not recorded. Never claim work was completed without a completed task in the data."
  };
  const systemPrompt = `
You are TaskFlow AI, an expert project manager and agile lead.
Return only valid JSON. Do not include markdown fences or text outside JSON.
Do not invent verified progress, user names, dates, team capacity, or accomplishments. Clearly label inference.
`;

  const userPrompt = `
Tool: ${tool || "Project planner"}
Goal: ${prompt}
Verified workspace data (treat this as the only source of progress facts):
${workspaceContext || "No workspace data was supplied."}

Tool-specific instructions:
${toolGuidance[tool] || toolGuidance["Project planner"]}

Return a JSON object with this structure:
{
  "tool": "${tool}",
  "name": "Concise plan title",
  "description": "Summary in 2-3 sentences",
  "phases": [
    [
      "Task or work item title",
      "Effort or time estimate",
      "Description with dependencies and completion criteria where relevant",
      "Medium"
    ]
  ],
  "objectives": ["Objective"],
  "deliverables": ["Deliverable"],
  "milestones": ["Milestone"],
  "risks": ["Risk with likelihood, impact, mitigation, contingency, owner, and whether it is inferred or verified"],
  "roles": ["Recommended role"],
  "capacityNote": "Known capacity or explicitly state that it was not provided"
}

Requirements:
- Generate 3 to 7 actionable, sequential phases.
- Each phase must contain exactly 4 elements.
- Priority must be Low, Medium, High, or Critical.
- risks and roles must be arrays of strings.
`;

  const raw = await queryLLM(systemPrompt, userPrompt, 0.2);

  try {
    const parsed = extractJSON(raw);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error("Expected a JSON object.");
    }

    if (typeof parsed.name !== "string") {
      parsed.name = "AI Project Plan";
    }

    if (typeof parsed.description !== "string") {
      parsed.description = "";
    }

    if (!Array.isArray(parsed.phases)) {
      parsed.phases = [];
    }

    if (!Array.isArray(parsed.risks)) {
      parsed.risks = [];
    }

    if (!Array.isArray(parsed.roles)) {
      parsed.roles = [];
    }
    for (const field of ["objectives", "deliverables", "milestones"]) {
      if (!Array.isArray(parsed[field])) parsed[field] = [];
    }
    parsed.tool = tool;

    return parsed;
  } catch (error) {
    console.error("Failed to parse AI plan:", error.message);

    const parseError = new Error(
      "The AI returned an invalid plan format. Please try again."
    );

    parseError.status = 502;
    throw parseError;
  }
}

/**
 * Generate an executive summary for the dashboard and reports.
 */
export async function generateSummary({
  totalProjects,
  completedTasks,
  pendingTasks,
  delayedProjects,
}) {
  const systemPrompt = `
You are TaskFlow AI, an executive delivery consultant.
Write a professional executive summary in no more than 3 sentences.
Include one positive observation and one actionable recommendation.
Do not add a greeting or introductory filler.
`;

  const userPrompt = `
Workspace statistics:
- Active / total projects: ${totalProjects}
- Completed tasks: ${completedTasks}
- Pending tasks: ${pendingTasks}
- Delayed or on-hold projects: ${delayedProjects}
`;

  try {
    return await queryLLM(systemPrompt, userPrompt, 0.4);
  } catch (error) {
    console.error("Executive summary generation failed:", error.message);

    return "AI executive summary is currently unavailable. Check your AI provider configuration and server logs.";
  }
}
