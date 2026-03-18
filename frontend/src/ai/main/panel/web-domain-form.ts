type WebsiteDomainFormPayload = {
  domain?: string;
  label?: string;
  description?: string;
  openDialog?: boolean;
  target?: "new" | "selected";
};

const WEBSITE_DOMAIN_FORM_EVENT = "navai:panel-web-domain-form";
const WEBSITE_PATH = "/panel/manage";

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("This function is only available in the browser.");
  }
}

export async function completeWebsiteDomainForm(payload?: WebsiteDomainFormPayload) {
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
    ...(typeof payload?.domain === "string" ? { domain: payload.domain } : {}),
    ...(typeof payload?.label === "string" ? { label: payload.label } : {}),
    ...(typeof payload?.description === "string" ? { description: payload.description } : {}),
  };

  window.dispatchEvent(
    new CustomEvent(WEBSITE_DOMAIN_FORM_EVENT, {
      detail: {
        openDialog: payload?.openDialog !== false,
        target: payload?.target === "selected" ? "selected" : "new",
        patch,
      },
    })
  );

  return {
    ok: true,
    action: "complete_website_domain_form",
    appliedFields: Object.keys(patch),
  };
}
