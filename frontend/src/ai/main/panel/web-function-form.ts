type WebsiteFunctionFormPayload = {
  name?: string;
  label?: string;
  description?: string;
  code?: string;
  openDialog?: boolean;
};

const WEBSITE_FUNCTION_FORM_EVENT = "navai:panel-web-function-form";
const WEBSITE_PATH = "/panel/manage";

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("This function is only available in the browser.");
  }
}

export async function completeWebsiteFunctionForm(payload?: WebsiteFunctionFormPayload) {
  ensureBrowser();

  if (window.location.pathname !== WEBSITE_PATH) {
    return {
      ok: false,
      error: "Open the Web panel before using this function.",
      expectedPath: WEBSITE_PATH,
      currentPath: window.location.pathname,
    };
  }

  const patch = {
    ...(typeof payload?.name === "string" ? { name: payload.name } : {}),
    ...(typeof payload?.label === "string" ? { label: payload.label } : {}),
    ...(typeof payload?.description === "string" ? { description: payload.description } : {}),
    ...(typeof payload?.code === "string" ? { code: payload.code } : {}),
  };

  window.dispatchEvent(
    new CustomEvent(WEBSITE_FUNCTION_FORM_EVENT, {
      detail: {
        openDialog: payload?.openDialog !== false,
        patch,
      },
    })
  );

  return {
    ok: true,
    action: "complete_website_function_form",
    appliedFields: Object.keys(patch),
  };
}
