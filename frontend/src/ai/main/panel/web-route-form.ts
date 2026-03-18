type WebsiteRouteFormPayload = {
  url?: string;
  label?: string;
  description?: string;
  openInNewTab?: boolean;
  openDialog?: boolean;
};

const WEBSITE_ROUTE_FORM_EVENT = "navai:panel-web-route-form";
const WEBSITE_PATH = "/panel/manage";

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("This function is only available in the browser.");
  }
}

export async function completeWebsiteRouteForm(payload?: WebsiteRouteFormPayload) {
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
    ...(typeof payload?.url === "string" ? { url: payload.url } : {}),
    ...(typeof payload?.label === "string" ? { label: payload.label } : {}),
    ...(typeof payload?.description === "string" ? { description: payload.description } : {}),
    ...(typeof payload?.openInNewTab === "boolean" ? { openInNewTab: payload.openInNewTab } : {}),
  };

  window.dispatchEvent(
    new CustomEvent(WEBSITE_ROUTE_FORM_EVENT, {
      detail: {
        openDialog: payload?.openDialog !== false,
        patch,
      },
    })
  );

  return {
    ok: true,
    action: "complete_website_route_form",
    appliedFields: Object.keys(patch),
  };
}
