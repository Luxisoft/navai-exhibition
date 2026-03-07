type BrowserPayload = Record<string, unknown> | undefined;

type ContactFieldKey = "name" | "email" | "company" | "whatsapp" | "message";
type ContactFormValues = Record<ContactFieldKey, string>;

type ContactCommandDetail = {
  action: "open" | "prefill";
  values?: Partial<ContactFormValues>;
  scroll?: boolean;
  focusName?: boolean;
};

const CONTACT_SECTION_ID = "contacto";
const CONTACT_FORM_ID = "implementation-contact-form";
const CONTACT_COMMAND_EVENT = "navai:implementation-contact-command";
const CONTACT_REQUIRED_FIELDS: ContactFieldKey[] = ["name", "email", "message"];

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

function pickContactValues(input: Record<string, unknown>): Partial<ContactFormValues> {
  const valuesInput = asObject(input.values);
  const pickField = (field: ContactFieldKey) => {
    const nestedValue = toOptionalText(valuesInput[field]);
    if (nestedValue !== undefined) {
      return nestedValue;
    }
    return toOptionalText(input[field]);
  };

  return {
    ...(pickField("name") !== undefined ? { name: String(pickField("name")) } : {}),
    ...(pickField("email") !== undefined ? { email: String(pickField("email")) } : {}),
    ...(pickField("company") !== undefined ? { company: String(pickField("company")) } : {}),
    ...(pickField("whatsapp") !== undefined ? { whatsapp: String(pickField("whatsapp")) } : {}),
    ...(pickField("message") !== undefined ? { message: String(pickField("message")) } : {}),
  };
}

function getContactFormElement() {
  return document.getElementById(CONTACT_FORM_ID) as HTMLFormElement | null;
}

function readNamedFieldValue(form: HTMLFormElement, fieldName: ContactFieldKey): string {
  const field = form.elements.namedItem(fieldName);
  if (!field) {
    return "";
  }

  if (field instanceof RadioNodeList) {
    return typeof field.value === "string" ? field.value : "";
  }

  if ("value" in field && typeof field.value === "string") {
    return field.value;
  }

  return "";
}

function readContactFormValues(form: HTMLFormElement): ContactFormValues {
  return {
    name: readNamedFieldValue(form, "name"),
    email: readNamedFieldValue(form, "email"),
    company: readNamedFieldValue(form, "company"),
    whatsapp: readNamedFieldValue(form, "whatsapp"),
    message: readNamedFieldValue(form, "message"),
  };
}

function getMissingRequiredFields(values: ContactFormValues): ContactFieldKey[] {
  return CONTACT_REQUIRED_FIELDS.filter((field) => values[field].trim().length === 0);
}

function getNextFieldQuestion(field: ContactFieldKey | null) {
  switch (field) {
    case "name":
      return "Please provide your full name.";
    case "email":
      return "Please share your work email.";
    case "message":
      return "Please describe your project details.";
    default:
      return "All required fields are filled. Ask for confirmation and submit the form.";
  }
}

async function waitNextFrame() {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
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
  const values = pickContactValues(input);
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
        name: "Ada Lovelace",
        email: "ada@company.com",
        company: "Analytical Engines",
        whatsapp: "+1 555 0100",
        message: "Need NAVAI for onboarding and support flows.",
      },
    },
  };
}

export async function reviewImplementationContactForm(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  const values = pickContactValues(input);
  const shouldOpen = input.open !== false;
  const shouldScroll = input.scroll !== false;
  const shouldFocusName = input.focusName !== false;

  if (shouldOpen) {
    dispatchContactCommand({
      action: "open",
      scroll: false,
      focusName: shouldFocusName,
    });
  }

  if (Object.keys(values).length > 0) {
    dispatchContactCommand({
      action: "prefill",
      values,
      scroll: false,
      focusName: false,
    });
  }

  if (shouldScroll) {
    scrollToContactSection();
    maybeSyncHash();
  }

  await waitNextFrame();
  const form = getContactFormElement();
  if (!form) {
    return {
      ok: false,
      error: "Implementation contact form is not available on this page.",
      formId: CONTACT_FORM_ID,
      sectionId: CONTACT_SECTION_ID,
    };
  }

  const currentValues = readContactFormValues(form);
  const missingRequired = getMissingRequiredFields(currentValues);
  const nextField = missingRequired[0] ?? null;

  return {
    ok: true,
    action: "review",
    formId: CONTACT_FORM_ID,
    sectionId: CONTACT_SECTION_ID,
    values: currentValues,
    missingRequired,
    readyToSubmit: missingRequired.length === 0,
    nextField,
    suggestedQuestion: getNextFieldQuestion(nextField),
  };
}

export async function submitImplementationContactForm(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  const values = pickContactValues(input);
  const shouldScroll = input.scroll !== false;

  dispatchContactCommand({
    action: "open",
    scroll: false,
    focusName: false,
  });

  if (Object.keys(values).length > 0) {
    dispatchContactCommand({
      action: "prefill",
      values,
      scroll: false,
      focusName: false,
    });
  }

  if (shouldScroll) {
    scrollToContactSection();
    maybeSyncHash();
  }

  await waitNextFrame();
  const form = getContactFormElement();
  if (!form || typeof form.requestSubmit !== "function") {
    return {
      ok: false,
      error: "Implementation contact form is not available on this page.",
      formId: CONTACT_FORM_ID,
      sectionId: CONTACT_SECTION_ID,
    };
  }

  const currentValues = readContactFormValues(form);
  const missingRequired = getMissingRequiredFields(currentValues);
  if (missingRequired.length > 0) {
    return {
      ok: false,
      error: "Required fields are missing in the implementation contact form.",
      formId: CONTACT_FORM_ID,
      sectionId: CONTACT_SECTION_ID,
      values: currentValues,
      missingRequired,
      nextField: missingRequired[0] ?? null,
      suggestedQuestion: getNextFieldQuestion(missingRequired[0] ?? null),
    };
  }

  const submitButton = form.querySelector<HTMLButtonElement>("[data-navai-contact-submit='true']");
  if (submitButton?.disabled) {
    return {
      ok: false,
      error: "Submit button is disabled. Captcha verification is required before submitting.",
      reason: "submit_disabled",
      formId: CONTACT_FORM_ID,
      sectionId: CONTACT_SECTION_ID,
      values: currentValues,
    };
  }

  form.requestSubmit();
  return {
    ok: true,
    action: "submit",
    formId: CONTACT_FORM_ID,
    sectionId: CONTACT_SECTION_ID,
    values: currentValues,
  };
}
