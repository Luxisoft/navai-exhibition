const WEBSITE_EDITOR_SAVE_EVENT = "navai:panel-web-editor-save";
const WEBSITE_PATH = "/panel/manage";

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("This function is only available in the browser.");
  }
}

export async function saveWebsiteEditor() {
  ensureBrowser();

  if (window.location.pathname !== WEBSITE_PATH) {
    return {
      ok: false,
      error: "Open the Web panel before using this function.",
      expectedPath: WEBSITE_PATH,
      currentPath: window.location.pathname,
    };
  }

  window.dispatchEvent(new CustomEvent(WEBSITE_EDITOR_SAVE_EVENT));

  return {
    ok: true,
    action: "save_website_editor",
  };
}
