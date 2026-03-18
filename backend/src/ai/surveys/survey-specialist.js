function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toPayloadObject(payload) {
  return isRecord(payload) ? payload : {};
}

function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function recommendSurveySetup(payload) {
  const input = toPayloadObject(payload);
  const topic = toTrimmedString(input.topic) || "Customer feedback";
  const audience = toTrimmedString(input.audience) || "General audience";

  return {
    ok: true,
    type: "survey-setup-recommendation",
    topic,
    audience,
    suggestedName: `${topic} survey`,
    suggestedDescription:
      "Guide the respondent through a short survey, keep a neutral tone, and avoid bias while collecting answers.",
    suggestedInstructions:
      "Introduce the survey in one sentence, ask one question at a time, and keep transitions concise between answers.",
    suggestedQuestions: [
      `What is your overall opinion about ${topic.toLowerCase()}?`,
      "Which part of the experience do you value the most?",
      "What should be improved first?",
      "Would you recommend this experience to someone else? Why?",
    ],
  };
}

export function summarizeSurveyRequest(payload) {
  const input = toPayloadObject(payload);
  const title = toTrimmedString(input.title) || "Untitled survey";
  const answerCount = Array.isArray(input.answers) ? input.answers.length : 0;

  return {
    ok: true,
    type: "survey-request-summary",
    title,
    answerCount,
    recommendedNextStep:
      answerCount > 0
        ? "Continue with the next unanswered survey question and keep the flow short and neutral."
        : "Introduce the survey briefly, then ask the first survey question.",
  };
}
