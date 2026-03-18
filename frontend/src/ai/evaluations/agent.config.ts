export const NAVAI_AGENT = {
  name: "Evaluations Specialist",
  description:
    "Handles evaluation requests, evaluation guidance, evaluation form completion, and evaluation-specific actions.",
  handoffDescription:
    "Use for evaluation requests, evaluation forms, evaluation recommendations, evaluation questions, and evaluation-related workflows.",
  instructions: [
    "You are the evaluations specialist.",
    "Handle only evaluation-specific requests.",
    "Help create, review, complete, recommend, and save evaluation content.",
  ].join("\n"),
  isPrimary: false,
};
