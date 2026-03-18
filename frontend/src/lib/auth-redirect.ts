const POST_AUTH_REDIRECT_STORAGE_KEY = "navai-post-auth-redirect";

export const NAVAI_PANEL_HREF = "/panel";
export const REQUEST_IMPLEMENTATION_HREF = "/request-implementation";

export function storePostAuthRedirect(href: string = NAVAI_PANEL_HREF) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(POST_AUTH_REDIRECT_STORAGE_KEY, href);
}

export function readPostAuthRedirect() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.sessionStorage.getItem(POST_AUTH_REDIRECT_STORAGE_KEY) ?? "";
}

export function consumePostAuthRedirect() {
  if (typeof window === "undefined") {
    return "";
  }

  const nextHref = readPostAuthRedirect();
  if (nextHref) {
    window.sessionStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY);
  }

  return nextHref;
}
