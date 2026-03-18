const SCROLL_SPY_BOTTOM_THRESHOLD_PX = 8;
const SCROLL_SPY_MARKER_MIN_PX = 120;
const SCROLL_SPY_MARKER_MAX_PX = 220;
const SCROLL_SPY_MARKER_RATIO = 0.28;

function isHeadingHorizontallyVisible(element: HTMLElement, windowObject: Window) {
  const { left, right } = element.getBoundingClientRect();
  return right > 0 && left < windowObject.innerWidth;
}

function isHeadingInViewport(element: HTMLElement, windowObject: Window) {
  const { top, bottom } = element.getBoundingClientRect();
  return bottom > 0 && top < windowObject.innerHeight;
}

function resolveLastVisibleHeadingId(headingElements: HTMLElement[], windowObject: Window) {
  for (let index = headingElements.length - 1; index >= 0; index -= 1) {
    const element = headingElements[index];

    if (isHeadingHorizontallyVisible(element, windowObject) && isHeadingInViewport(element, windowObject)) {
      return element.id;
    }
  }

  return "";
}

export function getScrollSpyMarkerOffset(viewportHeight: number) {
  return Math.min(
    SCROLL_SPY_MARKER_MAX_PX,
    Math.max(SCROLL_SPY_MARKER_MIN_PX, Math.round(viewportHeight * SCROLL_SPY_MARKER_RATIO))
  );
}

export function isScrollSpyNearBottom(windowObject: Window, documentObject: Document) {
  const maxScrollY = Math.max(0, documentObject.documentElement.scrollHeight - windowObject.innerHeight);
  return windowObject.scrollY >= maxScrollY - SCROLL_SPY_BOTTOM_THRESHOLD_PX;
}

export function resolveActiveHeadingIdFromScroll(
  headingElements: HTMLElement[],
  windowObject: Window,
  documentObject: Document
) {
  if (headingElements.length === 0) {
    return "";
  }

  if (isScrollSpyNearBottom(windowObject, documentObject)) {
    const lastVisibleHeadingId = resolveLastVisibleHeadingId(headingElements, windowObject);
    if (lastVisibleHeadingId) {
      return lastVisibleHeadingId;
    }
  }

  const markerOffset = getScrollSpyMarkerOffset(windowObject.innerHeight);
  let nextActiveId = headingElements[0].id;

  for (const element of headingElements) {
    const { top } = element.getBoundingClientRect();
    if (!isHeadingHorizontallyVisible(element, windowObject)) {
      continue;
    }

    if (top <= markerOffset) {
      nextActiveId = element.id;
    } else {
      break;
    }
  }

  return nextActiveId;
}
