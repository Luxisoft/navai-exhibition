type SupportReplyFormPayload = {
  body?: string;
};

const SUPPORT_REPLY_FORM_EVENT = "navai:panel-support-reply-form";
const SUPPORT_PATH = "/panel/support";

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("This function is only available in the browser.");
  }
}

export async function completeSupportReplyForm(payload?: SupportReplyFormPayload) {
  ensureBrowser();

  if (window.location.pathname !== SUPPORT_PATH) {
    return {
      ok: false,
      error: "Open the Support panel before using this function.",
      expectedPath: SUPPORT_PATH,
      currentPath: window.location.pathname,
    };
  }

  const body = typeof payload?.body === "string" ? payload.body : "";

  window.dispatchEvent(
    new CustomEvent(SUPPORT_REPLY_FORM_EVENT, {
      detail: { body },
    })
  );

  return {
    ok: true,
    action: "complete_support_reply_form",
    appliedFields: body ? ["body"] : [],
  };
}
