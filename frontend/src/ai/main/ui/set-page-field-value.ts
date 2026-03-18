type SetPageFieldValuePayload = {
  field?: string;
  selector?: string;
  value?: string | number;
  checked?: boolean;
  expectedPath?: string;
  exact?: boolean;
  index?: number;
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isVisible(element: Element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function dispatchValueEvents(element: HTMLElement) {
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function getFieldTexts(element: Element) {
  const labelId = element.getAttribute("id");
  const linkedLabel =
    labelId && typeof document !== "undefined"
      ? document.querySelector(`label[for="${labelId}"]`)?.textContent
      : "";

  return [
    element.getAttribute("aria-label"),
    element.getAttribute("placeholder"),
    element.getAttribute("name"),
    element.getAttribute("title"),
    linkedLabel,
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean);
}

export async function setPageFieldValue(payload?: SetPageFieldValuePayload) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      ok: false,
      error: "set_page_field_value is only available in the browser.",
    };
  }

  const expectedPath = typeof payload?.expectedPath === "string" ? payload.expectedPath.trim() : "";
  if (expectedPath && window.location.pathname !== expectedPath) {
    return {
      ok: false,
      error: "User is not currently on the expected page.",
      expectedPath,
      currentPath: window.location.pathname,
    };
  }

  let target: Element | null = null;

  if (typeof payload?.selector === "string" && payload.selector.trim()) {
    target = document.querySelector(payload.selector.trim());
  } else {
    const query = normalizeText(payload?.field);
    if (!query) {
      return {
        ok: false,
        error: "Provide payload.field or payload.selector.",
      };
    }

    const exact = payload?.exact === true;
    const requestedIndex = Number.isFinite(payload?.index) ? Math.max(0, Math.floor(payload!.index!)) : 0;
    const fields = [...document.querySelectorAll("input, select, textarea")].filter(isVisible);
    const matches = fields.filter((field) =>
      getFieldTexts(field).some((text) => (exact ? text === query : text.includes(query)))
    );
    target = matches[requestedIndex] ?? null;
  }

  if (!(target instanceof HTMLElement) || !isVisible(target)) {
    return {
      ok: false,
      error: "Target field was not found.",
      field: payload?.field ?? null,
      selector: payload?.selector ?? null,
    };
  }

  if (target instanceof HTMLInputElement) {
    if (target.type === "checkbox" || target.type === "radio") {
      target.checked = payload?.checked === true;
    } else {
      target.value = payload?.value == null ? "" : String(payload.value);
    }
    dispatchValueEvents(target);
    return {
      ok: true,
      action: "set_page_field_value",
      tagName: target.tagName.toLowerCase(),
      type: target.type,
    };
  }

  if (target instanceof HTMLTextAreaElement) {
    target.value = payload?.value == null ? "" : String(payload.value);
    dispatchValueEvents(target);
    return {
      ok: true,
      action: "set_page_field_value",
      tagName: target.tagName.toLowerCase(),
    };
  }

  if (target instanceof HTMLSelectElement) {
    const nextValue = payload?.value == null ? "" : String(payload.value);
    const normalizedNextValue = normalizeText(nextValue);
    const option =
      [...target.options].find((item) => item.value === nextValue) ??
      [...target.options].find((item) => normalizeText(item.textContent) === normalizedNextValue) ??
      [...target.options].find((item) => normalizeText(item.textContent).includes(normalizedNextValue));

    if (!option) {
      return {
        ok: false,
        error: "No option matched the requested value.",
        value: nextValue,
      };
    }

    target.value = option.value;
    dispatchValueEvents(target);
    return {
      ok: true,
      action: "set_page_field_value",
      tagName: target.tagName.toLowerCase(),
      selectedValue: option.value,
      selectedLabel: option.textContent?.trim() ?? "",
    };
  }

  return {
    ok: false,
    error: "Unsupported field type.",
    tagName: target.tagName.toLowerCase(),
  };
}
