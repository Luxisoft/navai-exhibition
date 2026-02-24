type ScrollDirection = "up" | "down";
type ScrollTarget = "top" | "bottom";
type ScrollBehavior = "auto" | "smooth";
type ScrollBlock = "start" | "center" | "end" | "nearest";

type ScrollPagePayload = {
  direction?: ScrollDirection;
  target?: ScrollTarget;
  pixels?: number;
  amount?: number;
  percent?: number;
  selector?: string;
  id?: string;
  top?: number;
  behavior?: ScrollBehavior;
  block?: ScrollBlock;
  expectedPath?: string;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getDocumentScrollTop() {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function getScrollBottomY() {
  const maxByDocument = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight
  );

  return Math.max(0, maxByDocument - window.innerHeight);
}

function resolveBehavior(value: unknown): ScrollBehavior {
  return value === "auto" ? "auto" : "smooth";
}

function resolveBlock(value: unknown): ScrollBlock {
  if (value === "center" || value === "end" || value === "nearest") {
    return value;
  }
  return "start";
}

function getCurrentPageInfo() {
  return {
    pathname: window.location.pathname,
    hash: window.location.hash,
    href: window.location.href,
    scrollY: Math.round(getDocumentScrollTop()),
  };
}

export async function scrollPage(rawPayload?: ScrollPagePayload) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      ok: false,
      error: "scroll_page is only available in the browser.",
    };
  }

  const payload = rawPayload ?? {};
  const behavior = resolveBehavior(payload.behavior);
  const currentPath = window.location.pathname;
  const before = getCurrentPageInfo();

  if (typeof payload.expectedPath === "string" && payload.expectedPath.trim() && payload.expectedPath !== currentPath) {
    return {
      ok: false,
      error: "User is not currently on the expected page.",
      expectedPath: payload.expectedPath,
      currentPath,
      hint: "Navigate first, then call scroll_page again.",
    };
  }

  const selector =
    typeof payload.selector === "string" && payload.selector.trim()
      ? payload.selector.trim()
      : typeof payload.id === "string" && payload.id.trim()
        ? `#${payload.id.trim().replace(/^#/, "")}`
        : "";

  if (selector) {
    const element = document.querySelector(selector);
    if (!element) {
      return {
        ok: false,
        error: "Target element not found for selector.",
        selector,
      };
    }

    element.scrollIntoView({
      behavior,
      block: resolveBlock(payload.block),
    });

    await new Promise((resolve) => window.setTimeout(resolve, behavior === "smooth" ? 300 : 0));

    return {
      ok: true,
      action: "scrollIntoView",
      selector,
      behavior,
      before,
      after: getCurrentPageInfo(),
    };
  }

  const numericTop = toNumber(payload.top);
  if (numericTop !== null) {
    window.scrollTo({ top: Math.max(0, numericTop), behavior });
    await new Promise((resolve) => window.setTimeout(resolve, behavior === "smooth" ? 300 : 0));
    return {
      ok: true,
      action: "scrollTo",
      top: Math.max(0, numericTop),
      behavior,
      before,
      after: getCurrentPageInfo(),
    };
  }

  if (payload.target === "top") {
    window.scrollTo({ top: 0, behavior });
    await new Promise((resolve) => window.setTimeout(resolve, behavior === "smooth" ? 300 : 0));
    return {
      ok: true,
      action: "scrollTop",
      behavior,
      before,
      after: getCurrentPageInfo(),
    };
  }

  if (payload.target === "bottom") {
    window.scrollTo({ top: getScrollBottomY(), behavior });
    await new Promise((resolve) => window.setTimeout(resolve, behavior === "smooth" ? 300 : 0));
    return {
      ok: true,
      action: "scrollBottom",
      behavior,
      before,
      after: getCurrentPageInfo(),
    };
  }

  const percent = toNumber(payload.percent);
  if (percent !== null) {
    const safePercent = Math.max(0, Math.min(100, percent));
    const targetY = Math.round((getScrollBottomY() * safePercent) / 100);
    window.scrollTo({ top: targetY, behavior });
    await new Promise((resolve) => window.setTimeout(resolve, behavior === "smooth" ? 300 : 0));
    return {
      ok: true,
      action: "scrollPercent",
      percent: safePercent,
      targetY,
      behavior,
      before,
      after: getCurrentPageInfo(),
    };
  }

  const amount = toNumber(payload.pixels) ?? toNumber(payload.amount) ?? 480;
  const direction: ScrollDirection = payload.direction === "up" ? "up" : "down";
  const deltaY = Math.max(1, Math.abs(amount)) * (direction === "up" ? -1 : 1);

  window.scrollBy({ top: deltaY, behavior });
  await new Promise((resolve) => window.setTimeout(resolve, behavior === "smooth" ? 300 : 0));

  return {
    ok: true,
    action: "scrollBy",
    direction,
    deltaY,
    behavior,
    before,
    after: getCurrentPageInfo(),
    usage: {
      examples: [
        { direction: "down", pixels: 600 },
        { target: "bottom" },
        { selector: "#plans" },
        { id: "contacto" },
      ],
    },
  };
}

