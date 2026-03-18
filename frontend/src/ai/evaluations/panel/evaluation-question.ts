type EvaluationQuestionPayload = {
  question: string;
  expectedAnswer?: string;
  openDialog?: boolean;
};

const EVALUATION_QUESTION_EVENT = "navai:panel-evaluation-question";
const EVALUATION_PATH = "/panel/evaluations";

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("This function is only available in the browser.");
  }
}

export async function addEvaluationQuestion(payload?: EvaluationQuestionPayload) {
  ensureBrowser();

  if (window.location.pathname !== EVALUATION_PATH) {
    return {
      ok: false,
      error: "Open the Evaluations panel before using this function.",
      expectedPath: EVALUATION_PATH,
      currentPath: window.location.pathname,
    };
  }

  const question = typeof payload?.question === "string" ? payload.question.trim() : "";
  if (!question) {
    return {
      ok: false,
      error: "The evaluation question is required.",
    };
  }

  window.dispatchEvent(
    new CustomEvent(EVALUATION_QUESTION_EVENT, {
      detail: {
        openDialog: payload?.openDialog !== false,
        question,
        expectedAnswer:
          typeof payload?.expectedAnswer === "string"
            ? payload.expectedAnswer
            : "",
      },
    })
  );

  return {
    ok: true,
    action: "add_evaluation_question",
    question,
  };
}
