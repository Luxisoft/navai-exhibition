type CloseOpenDialogPayload = {
  expectedPath?: string;
  title?: string;
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

export async function closeOpenDialog(payload?: CloseOpenDialogPayload) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      ok: false,
      error: "close_open_dialog is only available in the browser.",
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

  const titleQuery = normalizeText(payload?.title);
  const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(isVisible);
  const dialog = titleQuery
    ? dialogs.find((item) => normalizeText(item.textContent).includes(titleQuery))
    : dialogs[dialogs.length - 1];

  if (!dialog) {
    return {
      ok: false,
      error: "No open dialog was found.",
    };
  }

  const closeButton = [...dialog.querySelectorAll("button")].find((button) => {
    const values = [
      button.textContent,
      button.getAttribute("aria-label"),
      button.getAttribute("title"),
    ].map((value) => normalizeText(value));
    return values.some((value) => value.includes("close") || value.includes("cerrar"));
  });

  if (closeButton instanceof HTMLButtonElement) {
    closeButton.click();
    return {
      ok: true,
      action: "close_open_dialog",
      method: "button",
    };
  }

  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
    })
  );

  return {
    ok: true,
    action: "close_open_dialog",
    method: "escape",
  };
}
