type SupportTicketFormPayload = {
  subject?: string;
  channel?: string;
  category?: string;
  priority?: string;
  message?: string;
  openForm?: boolean;
};

const SUPPORT_TICKET_FORM_EVENT = "navai:panel-support-ticket-form";
const SUPPORT_PATH = "/panel/support";

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("This function is only available in the browser.");
  }
}

export async function completeSupportTicketForm(payload?: SupportTicketFormPayload) {
  ensureBrowser();

  if (window.location.pathname !== SUPPORT_PATH) {
    return {
      ok: false,
      error: "Open the Support panel before using this function.",
      expectedPath: SUPPORT_PATH,
      currentPath: window.location.pathname,
    };
  }

  const patch = {
    ...(typeof payload?.subject === "string" ? { subject: payload.subject } : {}),
    ...(typeof payload?.channel === "string" ? { channel: payload.channel } : {}),
    ...(typeof payload?.category === "string" ? { category: payload.category } : {}),
    ...(typeof payload?.priority === "string" ? { priority: payload.priority } : {}),
    ...(typeof payload?.message === "string" ? { message: payload.message } : {}),
  };

  window.dispatchEvent(
    new CustomEvent(SUPPORT_TICKET_FORM_EVENT, {
      detail: {
        openForm: payload?.openForm !== false,
        patch,
      },
    })
  );

  return {
    ok: true,
    action: "complete_support_ticket_form",
    appliedFields: Object.keys(patch),
  };
}
