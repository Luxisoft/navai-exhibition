type ControlRole =
  | "button"
  | "link"
  | "tab"
  | "menuitem"
  | "summary"
  | "any";

type ClickPageControlPayload = {
  text?: string;
  selector?: string;
  expectedPath?: string;
  exact?: boolean;
  role?: ControlRole;
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
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.pointerEvents === "none"
  ) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isDisabled(element: Element) {
  return (
    (element instanceof HTMLButtonElement ||
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement) &&
    element.disabled
  );
}

function resolveRoleSelector(role: ControlRole | undefined) {
  switch (role) {
    case "button":
      return 'button,[role="button"]';
    case "link":
      return 'a,[role="link"]';
    case "tab":
      return '[role="tab"]';
    case "menuitem":
      return '[role="menuitem"]';
    case "summary":
      return "summary";
    default:
      return 'button,a,[role="button"],[role="link"],[role="tab"],[role="menuitem"],summary';
  }
}

function getControlTexts(element: Element) {
  const values = [
    element.textContent,
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.getAttribute("data-value"),
    element.getAttribute("value"),
  ];

  return values.map((value) => normalizeText(value)).filter(Boolean);
}

export async function clickPageControl(payload?: ClickPageControlPayload) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      ok: false,
      error: "click_page_control is only available in the browser.",
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

  if (typeof payload?.selector === "string" && payload.selector.trim()) {
    const directTarget = document.querySelector(payload.selector.trim());
    if (!(directTarget instanceof HTMLElement) || !isVisible(directTarget) || isDisabled(directTarget)) {
      return {
        ok: false,
        error: "Target control not found or not clickable for selector.",
        selector: payload.selector.trim(),
      };
    }

    directTarget.click();
    return {
      ok: true,
      action: "click_page_control",
      selector: payload.selector.trim(),
      text: directTarget.textContent?.trim() ?? "",
    };
  }

  const query = normalizeText(payload?.text);
  if (!query) {
    return {
      ok: false,
      error: "Provide payload.text or payload.selector.",
    };
  }

  const selector = resolveRoleSelector(payload?.role ?? "any");
  const exact = payload?.exact === true;
  const requestedIndex = Number.isFinite(payload?.index) ? Math.max(0, Math.floor(payload!.index!)) : 0;
  const candidates = [...document.querySelectorAll(selector)].filter(
    (element) => isVisible(element) && !isDisabled(element)
  );

  const matches = candidates.filter((element) => {
    const texts = getControlTexts(element);
    return texts.some((value) => (exact ? value === query : value.includes(query)));
  });

  const target = matches[requestedIndex];
  if (!(target instanceof HTMLElement)) {
    return {
      ok: false,
      error: "No clickable control matched the provided text.",
      text: payload?.text ?? "",
      role: payload?.role ?? "any",
      candidates: candidates.slice(0, 12).map((element) => ({
        text: element.textContent?.trim() ?? "",
        ariaLabel: element.getAttribute("aria-label"),
        title: element.getAttribute("title"),
      })),
    };
  }

  target.click();

  return {
    ok: true,
    action: "click_page_control",
    matchedText: payload?.text ?? "",
    clickedText: target.textContent?.trim() ?? "",
    ariaLabel: target.getAttribute("aria-label"),
    title: target.getAttribute("title"),
    role: payload?.role ?? "any",
    index: requestedIndex,
  };
}
