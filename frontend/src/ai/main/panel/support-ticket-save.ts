const SUPPORT_TICKET_SAVE_EVENT = "navai:panel-support-ticket-save";
const SUPPORT_PATH = "/panel/support";

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("This function is only available in the browser.");
  }
}

export async function saveSupportTicketForm() {
  ensureBrowser();

  if (window.location.pathname !== SUPPORT_PATH) {
    return {
      ok: false,
      error: "Open the Support panel before using this function.",
      expectedPath: SUPPORT_PATH,
      currentPath: window.location.pathname,
    };
  }

  window.dispatchEvent(new CustomEvent(SUPPORT_TICKET_SAVE_EVENT));

  return {
    ok: true,
    action: "save_support_ticket_form",
  };
}
