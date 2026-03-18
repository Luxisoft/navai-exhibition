type WebsiteParameterFormPayload = {
  key?: string;
  value?: string;
  description?: string;
  openDialog?: boolean;
};

const WEBSITE_PARAMETER_FORM_EVENT = "navai:panel-web-parameter-form";
const WEBSITE_PATH = "/panel/manage";

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("This function is only available in the browser.");
  }
}

export async function completeWebsiteParameterForm(payload?: WebsiteParameterFormPayload) {
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
    ...(typeof payload?.key === "string" ? { key: payload.key } : {}),
    ...(typeof payload?.value === "string" ? { value: payload.value } : {}),
    ...(typeof payload?.description === "string" ? { description: payload.description } : {}),
  };

  window.dispatchEvent(
    new CustomEvent(WEBSITE_PARAMETER_FORM_EVENT, {
      detail: {
        openDialog: payload?.openDialog !== false,
        patch,
      },
    })
  );

  return {
    ok: true,
    action: "complete_website_parameter_form",
    appliedFields: Object.keys(patch),
  };
}
