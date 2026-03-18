function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toPayloadObject(payload) {
  return isRecord(payload) ? payload : {};
}

function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function recommendEvaluationSetup(payload) {
  const input = toPayloadObject(payload);
  const objective = toTrimmedString(input.objective) || "Measure the current workflow maturity.";
  const audience = toTrimmedString(input.audience) || "Internal team";

  return {
    ok: true,
    type: "evaluation-setup-recommendation",
    objective,
    audience,
    suggestedName: `Evaluation for ${audience}`,
    suggestedDescription:
      "Guide the user through the evaluation, keep questions focused, and summarize strengths and gaps clearly.",
    suggestedInstructions:
      "Greet the user briefly, explain the purpose of the evaluation, ask one question at a time, and confirm answers only when needed.",
    suggestedQuestions: [
      "How would you describe the current process or workflow being evaluated?",
      "What is working well today?",
      "What are the main blockers or risks you want to improve?",
      "What result would make this evaluation successful for you?",
    ],
  };
}

export function summarizeEvaluationRequest(payload) {
  const input = toPayloadObject(payload);
  const title = toTrimmedString(input.title) || "Untitled evaluation";
  const answerCount = Array.isArray(input.answers) ? input.answers.length : 0;

  return {
    ok: true,
    type: "evaluation-request-summary",
    title,
    answerCount,
    recommendedNextStep:
      answerCount > 0
        ? "Review the collected answers, identify the unanswered questions, and continue the evaluation from the next pending item."
        : "Start with a short introduction, explain the goal, and ask the first evaluation question.",
  };
}
