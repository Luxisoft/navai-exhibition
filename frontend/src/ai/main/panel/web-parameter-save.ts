const WEBSITE_PARAMETER_SAVE_EVENT = "navai:panel-web-parameter-save";
const WEBSITE_PATH = "/panel/manage";

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("This function is only available in the browser.");
  }
}

export async function saveWebsiteParameterForm() {
  ensureBrowser();

  if (window.location.pathname !== WEBSITE_PATH) {
    return {
      ok: false,
      error: "Open the Web panel before using this function.",
      expectedPath: WEBSITE_PATH,
      currentPath: window.location.pathname,
    };
  }

  window.dispatchEvent(new CustomEvent(WEBSITE_PARAMETER_SAVE_EVENT));

  return {
    ok: true,
    action: "save_website_parameter_form",
  };
}
