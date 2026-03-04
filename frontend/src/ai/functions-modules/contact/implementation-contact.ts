type BrowserPayload = Record<string, unknown> | undefined;

type ContactCommandDetail = {
  action: "open" | "prefill";
  values?: {
    name?: string;
    email?: string;
    company?: string;
    whatsapp?: string;
    message?: string;
  };
  scroll?: boolean;
  focusName?: boolean;
};

const CONTACT_SECTION_ID = "contacto";
const CONTACT_FORM_ID = "implementation-contact-form";
const CONTACT_COMMAND_EVENT = "navai:implementation-contact-command";

function ensureBrowser() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("This function is only available in the browser.");
  }
}

function asObject(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
}

function toOptionalText(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function dispatchContactCommand(detail: ContactCommandDetail) {
  window.dispatchEvent(new CustomEvent(CONTACT_COMMAND_EVENT, { detail }));
}

function maybeSyncHash() {
  const currentHash = decodeURIComponent(window.location.hash.replace(/^#/, "").trim()).toLowerCase();
  if (currentHash === CONTACT_SECTION_ID) {
    return;
  }

  const { pathname, search } = window.location;
  const nextUrl = `${pathname}${search}#${CONTACT_SECTION_ID}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}

function scrollToContactSection() {
  const section = document.getElementById(CONTACT_SECTION_ID);
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  return false;
}

export async function openImplementationContactForm(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  const shouldScroll = input.scroll !== false;
  const shouldFocusName = input.focusName !== false;

  dispatchContactCommand({
    action: "open",
    scroll: shouldScroll,
    focusName: shouldFocusName,
  });

  if (shouldScroll) {
    scrollToContactSection();
    maybeSyncHash();
  }

  return {
    ok: true,
    action: "open",
    sectionId: CONTACT_SECTION_ID,
    formId: CONTACT_FORM_ID,
    scroll: shouldScroll,
    focusName: shouldFocusName,
  };
}

export async function prefillImplementationContactForm(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  const valuesInput = asObject(input.values);
  const values = {
    ...(toOptionalText(valuesInput.name) ? { name: String(valuesInput.name) } : {}),
    ...(toOptionalText(valuesInput.email) ? { email: String(valuesInput.email) } : {}),
    ...(toOptionalText(valuesInput.company) ? { company: String(valuesInput.company) } : {}),
    ...(toOptionalText(valuesInput.whatsapp) ? { whatsapp: String(valuesInput.whatsapp) } : {}),
    ...(toOptionalText(valuesInput.message) ? { message: String(valuesInput.message) } : {}),
  };

  const shouldScroll = input.scroll !== false;
  const shouldFocusName = input.focusName !== false;

  dispatchContactCommand({
    action: "prefill",
    values,
    scroll: shouldScroll,
    focusName: shouldFocusName,
  });

  if (shouldScroll) {
    scrollToContactSection();
    maybeSyncHash();
  }

  return {
    ok: true,
    action: "prefill",
    sectionId: CONTACT_SECTION_ID,
    formId: CONTACT_FORM_ID,
    filledFields: Object.keys(values),
    scroll: shouldScroll,
    focusName: shouldFocusName,
    usage: {
      payload: {
        values: {
          name: "Ada Lovelace",
          email: "ada@company.com",
          company: "Analytical Engines",
          whatsapp: "+1 555 0100",
          message: "Need NAVAI for onboarding and support flows.",
        },
      },
    },
  };
}

export async function submitImplementationContactForm(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  const shouldScroll = input.scroll !== false;

  dispatchContactCommand({
    action: "open",
    scroll: shouldScroll,
    focusName: false,
  });

  if (shouldScroll) {
    scrollToContactSection();
    maybeSyncHash();
  }

  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  const form = document.getElementById(CONTACT_FORM_ID) as HTMLFormElement | null;
  if (!form || typeof form.requestSubmit !== "function") {
    return {
      ok: false,
      error: "Implementation contact form is not available on this page.",
      formId: CONTACT_FORM_ID,
      sectionId: CONTACT_SECTION_ID,
    };
  }

  form.requestSubmit();
  return {
    ok: true,
    action: "submit",
    formId: CONTACT_FORM_ID,
    sectionId: CONTACT_SECTION_ID,
    note: "Submission still requires valid required fields and captcha verification.",
  };
}
