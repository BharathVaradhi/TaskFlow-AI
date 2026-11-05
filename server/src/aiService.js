
import Groq from "groq-sdk";


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


async function queryGroq(
  systemPrompt,
  userPrompt,
  temperature = 0.3,
  outputFormat = "text"
) {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing.");
  }

  const groq = new Groq({ apiKey });
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  console.log("ACTIVE GROQ MODEL:", model);

  const request = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature,
    max_completion_tokens: 32768,
    reasoning_effort: "low",
    include_reasoning: false
  };

  if (outputFormat === "json") {
    request.response_format = { type: "json_object" };
  }

  const completion = await groq.chat.completions.create(request);
  const choice = completion.choices?.[0];

  console.log("Groq finish reason:", choice?.finish_reason);
  console.log("Groq usage:", completion.usage);

  const content = choice?.message?.content;

  if (!content || !content.trim()) {
    throw new Error("Groq returned an empty response.");
  }

  if (choice.finish_reason === "length") {
    throw new Error("Groq reached its completion token limit.");
  }

  return content.trim();
}

/**
 * Groq is the only AI provider.
 */
export async function queryLLM(
  systemPrompt,
  userPrompt,
  temperature = 0.3,
  outputFormat = "text"
) {
  try {
    return await queryGroq(
      systemPrompt,
      userPrompt,
      temperature,
      outputFormat
    );
  } catch (error) {
    console.error("Groq request failed:", {
      status: error.status,
      code: error.code,
      message: error.message
    });

    error.status = error.status || 502;
    throw error;
  }
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
You are TaskFlow AI, an expert project manager.

Return exactly one valid JSON object.
Do not include Markdown or explanations outside JSON.

Rules:
- Never invent verified progress or accomplishments.
- Distinguish verified facts from inferred information.
- Generate 3 to 5 actionable phases.
- Each phase must contain exactly 4 strings.
- Each task description must be under 20 words.
- Priority must be Low, Medium, High, or Critical.
- Include no more than 3 risks.
- Include no more than 5 roles.
- Do not add extra JSON properties.
- Return complete and valid JSON.
`;

  const userPrompt = `
Tool: ${tool || "Project planner"}

Goal:
${prompt}

Verified workspace data:
${workspaceContext || "No workspace data was supplied."}

Tool instructions:
${toolGuidance[tool] || toolGuidance["Project planner"]}

Return JSON using exactly this structure:

{
  "tool": "${tool || "Project planner"}",
  "name": "Project plan title",
  "description": "Brief plan summary",
  "phases": [
    [
      "Task title",
      "Estimated effort",
      "Task description",
      "Medium"
    ]
  ],
  "objectives": ["Objective"],
  "deliverables": ["Deliverable"],
  "milestones": ["Milestone"],
  "risks": ["Risk, likelihood, impact and mitigation"],
  "roles": ["Recommended role"],
  "capacityNote": "Team capacity information"
}

Requirements:
- Generate 3 to 5 phases.
- Every phase must contain exactly 4 strings.
- Phase format: title, effort, description, priority.
- Priority must be Low, Medium, High, or Critical.
- Keep descriptions under 20 words.
- Include no more than 3 risks.
- Include no more than 5 roles.
- Use arrays of strings for objectives, deliverables, milestones, risks and roles.
- Do not invent workspace progress.
- Return one complete JSON object.
`;

  const raw = await queryLLM(systemPrompt, userPrompt, 0.2,"json");

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
