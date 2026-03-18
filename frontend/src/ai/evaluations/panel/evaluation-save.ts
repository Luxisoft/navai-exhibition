const EVALUATION_SAVE_EVENT = "navai:panel-evaluation-save";
const EVALUATION_PATH = "/panel/evaluations";

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("This function is only available in the browser.");
  }
}

export async function saveEvaluationForm() {
  ensureBrowser();

  if (window.location.pathname !== EVALUATION_PATH) {
    return {
      ok: false,
      error: "Open the Evaluations panel before using this function.",
      expectedPath: EVALUATION_PATH,
      currentPath: window.location.pathname,
    };
  }

  window.dispatchEvent(new CustomEvent(EVALUATION_SAVE_EVENT));

  return {
    ok: true,
    action: "save_evaluation_form",
  };
}
