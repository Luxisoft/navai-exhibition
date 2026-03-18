type SurveyQuestionPayload = {
  question: string;
  openDialog?: boolean;
};

const SURVEY_QUESTION_EVENT = "navai:panel-survey-question";
const SURVEY_PATH = "/panel/surveys";

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("This function is only available in the browser.");
  }
}

export async function addSurveyQuestion(payload?: SurveyQuestionPayload) {
  ensureBrowser();

  if (window.location.pathname !== SURVEY_PATH) {
    return {
      ok: false,
      error: "Open the Surveys panel before using this function.",
      expectedPath: SURVEY_PATH,
      currentPath: window.location.pathname,
    };
  }

  const question = typeof payload?.question === "string" ? payload.question.trim() : "";
  if (!question) {
    return {
      ok: false,
      error: "The survey question is required.",
    };
  }

  window.dispatchEvent(
    new CustomEvent(SURVEY_QUESTION_EVENT, {
      detail: {
        openDialog: payload?.openDialog !== false,
        question,
      },
    })
  );

  return {
    ok: true,
    action: "add_survey_question",
    question,
  };
}
