type NavaiAiGradingExperienceKind = "evaluation" | "survey";

type NavaiAiGradingAnswerInput = {
  questionId: string;
  questionText: string;
  expectedAnswer: string;
  answerText: string;
};

type NavaiAiGradingResult = {
  questionId: string;
  score: number;
  feedback: string;
};

type NavaiAiGradingResponse = {
  grades: NavaiAiGradingResult[];
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function clampScore(value: unknown) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.min(10, Math.max(1, parsed));
}

function extractJsonObject(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("AI grading returned an empty response.");
  }

  try {
    return JSON.parse(trimmed) as NavaiAiGradingResponse;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI grading returned invalid JSON.");
    }
    return JSON.parse(match[0]) as NavaiAiGradingResponse;
  }
}

function buildSystemPrompt(kind: NavaiAiGradingExperienceKind) {
  const experienceLabel = kind === "evaluation" ? "evaluation" : "survey";
  return [
    "You grade user answers for a NAVAI public experience.",
    `The experience kind is ${experienceLabel}.`,
    "Return strict JSON only.",
    "Score every provided answer from 1 to 10.",
    "Use the expected answer when it exists.",
    "If the expected answer is empty, grade the answer by relevance, completeness, clarity, and alignment with the question.",
    "Give short feedback in at most 30 words.",
    "Never omit any questionId from the response.",
  ].join(" ");
}

export async function gradeExperienceAnswersWithAi(input: {
  kind: NavaiAiGradingExperienceKind;
  experienceName: string;
  answers: NavaiAiGradingAnswerInput[];
}) {
  const apiKey = normalizeString(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    throw new Error("AI grading requires OPENAI_API_KEY on the backend.");
  }

  if (input.answers.length === 0) {
    return [] satisfies NavaiAiGradingResult[];
  }

  const model = normalizeString(process.env.OPENAI_AI_GRADING_MODEL) || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "navai_answer_grades",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              grades: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    questionId: { type: "string" },
                    score: {
                      type: "integer",
                      minimum: 1,
                      maximum: 10,
                    },
                    feedback: { type: "string" },
                  },
                  required: ["questionId", "score", "feedback"],
                },
              },
            },
            required: ["grades"],
          },
        },
      },
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(input.kind),
        },
        {
          role: "user",
          content: JSON.stringify({
            experienceName: input.experienceName,
            answers: input.answers,
          }),
        },
      ],
    }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  if (!response.ok) {
    throw new Error(
      normalizeString(payload.error?.message) ||
        `AI grading request failed with status ${response.status}.`,
    );
  }

  const content = normalizeString(payload.choices?.[0]?.message?.content);
  const parsed = extractJsonObject(content);
  const results = Array.isArray(parsed.grades) ? parsed.grades : [];

  return results
    .map((item) => ({
      questionId: normalizeString(item.questionId),
      score: clampScore(item.score),
      feedback: normalizeString(item.feedback),
    }))
    .filter((item) => item.questionId && item.score >= 1 && item.score <= 10);
}
