const SURVEY_SAVE_EVENT = "navai:panel-survey-save";
const SURVEY_PATH = "/panel/surveys";

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("This function is only available in the browser.");
  }
}

export async function saveSurveyForm() {
  ensureBrowser();

  if (window.location.pathname !== SURVEY_PATH) {
    return {
      ok: false,
      error: "Open the Surveys panel before using this function.",
      expectedPath: SURVEY_PATH,
      currentPath: window.location.pathname,
    };
  }

  window.dispatchEvent(new CustomEvent(SURVEY_SAVE_EVENT));

  return {
    ok: true,
    action: "save_survey_form",
  };
}
