type ScrapeOptions = {
  dedupe?: boolean; // elimina repetidos
  minLength?: number; // filtra textos muy cortos
  onlyVisible?: boolean; // solo texto visible
  includeLinkText?: boolean; // incluye o no textos dentro de enlaces
  excludeUrlLikeText?: boolean; // filtra textos que son URL
  chunkSize?: number; // imprime en bloques (0 = todo)
  debug?: boolean; // logs de consola para depuracion (override explicito)
};

function parseDebugFlag(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const normalized = raw.trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function shouldEnableScrapingDebug(explicitDebug: boolean | undefined): boolean {
  if (typeof explicitDebug === "boolean") {
    return explicitDebug;
  }

  const windowDebug =
    typeof window !== "undefined" &&
    Boolean((window as Window & { __NAVAI_SCRAPE_DEBUG__?: unknown }).__NAVAI_SCRAPE_DEBUG__);

  const envDebug = parseDebugFlag(import.meta.env.PUBLIC_NAVAI_SCRAPE_DEBUG);
  const devDebug = Boolean(import.meta.env.DEV);

  return windowDebug || envDebug || devDebug;
}

export function scrapePageText(options: ScrapeOptions = {}): string[] {
  const {
    dedupe = true,
    minLength = 2,
    onlyVisible = true,
    includeLinkText = false,
    excludeUrlLikeText = true,
    chunkSize = 200,
    debug,
  } = options;
  const debugEnabled = shouldEnableScrapingDebug(debug);

  if (typeof window === "undefined" || typeof document === "undefined") {
    return [];
  }

  const SKIP_TAGS = new Set<string>([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEMPLATE",
    "SVG",
    "CANVAS",
    "IFRAME",
    "META",
    "LINK",
    "HEAD",
  ]);

  const normalize = (value: unknown): string =>
    String(value ?? "")
      .replace(/\s+/g, " ")
      .replace(/\u00A0/g, " ")
      .trim();

  const isUrlLikeText = (text: string): boolean =>
    /^(https?:\/\/|www\.)\S+$/i.test(text) || /^(mailto:|tel:)\S+$/i.test(text);

  const styleVisibilityCache = new WeakMap<Element, boolean>();
  const boxVisibilityCache = new WeakMap<Element, boolean>();

  const isElementStyleVisible = (el: Element): boolean => {
    const cached = styleVisibilityCache.get(el);
    if (typeof cached === "boolean") return cached;

    let current: Element | null = el;
    const visited: Element[] = [];

    while (current) {
      const cachedCurrent = styleVisibilityCache.get(current);
      if (typeof cachedCurrent === "boolean") {
        for (const item of visited) styleVisibilityCache.set(item, cachedCurrent);
        return cachedCurrent;
      }

      visited.push(current);
      const htmlEl = current as HTMLElement;

      if (htmlEl.hidden || htmlEl.getAttribute("aria-hidden") === "true") {
        for (const item of visited) styleVisibilityCache.set(item, false);
        return false;
      }

      const style = window.getComputedStyle(htmlEl);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number.parseFloat(style.opacity || "1") <= 0
      ) {
        for (const item of visited) styleVisibilityCache.set(item, false);
        return false;
      }

      current = current.parentElement;
    }

    for (const item of visited) styleVisibilityCache.set(item, true);
    return true;
  };

  const hasRenderableBox = (el: Element): boolean => {
    const cached = boxVisibilityCache.get(el);
    if (typeof cached === "boolean") return cached;

    const htmlEl = el as HTMLElement;
    const rect = htmlEl.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      boxVisibilityCache.set(el, true);
      return true;
    }

    if (htmlEl.getClientRects().length > 0) {
      boxVisibilityCache.set(el, true);
      return true;
    }

    boxVisibilityCache.set(el, false);
    return false;
  };

  const texts: string[] = [];

  const treeWalkerFilter: NodeFilter = {
    acceptNode(node: Node): number {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_SKIP;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (!includeLinkText && parent.closest("a")) return NodeFilter.FILTER_REJECT;

        if (onlyVisible && (!isElementStyleVisible(parent) || !hasRenderableBox(parent))) {
          return NodeFilter.FILTER_REJECT;
        }

        const text = normalize(node.nodeValue);
        if (text.length < minLength) return NodeFilter.FILTER_REJECT;
        if (excludeUrlLikeText && isUrlLikeText(text)) return NodeFilter.FILTER_REJECT;

        return NodeFilter.FILTER_ACCEPT;
      }

      return NodeFilter.FILTER_REJECT;
    },
  };

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    treeWalkerFilter
  );

  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeType !== Node.TEXT_NODE) continue;

    const text = normalize(node.nodeValue);
    if (!text || text.length < minLength) continue;
    if (excludeUrlLikeText && isUrlLikeText(text)) continue;

    const parent = node.parentElement;
    if (!parent) continue;
    if (!includeLinkText && parent.closest("a")) continue;

    texts.push(text);
  }

  let output = texts;

  if (dedupe) {
    const seen = new Set<string>();
    output = output.filter((text) => {
      const key = text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (onlyVisible && output.length <= 1) {
    const relaxedOutput = scrapePageText({
      dedupe,
      minLength,
      onlyVisible: false,
      includeLinkText,
      excludeUrlLikeText,
      chunkSize: 0,
      debug: false,
    });
    if (relaxedOutput.length > output.length) {
      if (debugEnabled) {
        console.warn(
          `[NAVAI][scrape_page_text] Resultado bajo con onlyVisible=true (${output.length}). Aplicando fallback con onlyVisible=false (${relaxedOutput.length}).`
        );
      }
      output = relaxedOutput;
    }
  }

  if (debugEnabled) {
    console.log(
      `[NAVAI][scrape_page_text] Textos extraidos: ${output.length} | onlyVisible=${onlyVisible} | includeLinkText=${includeLinkText} | excludeUrlLikeText=${excludeUrlLikeText} | minLength=${minLength}`
    );
    console.log("[NAVAI][scrape_page_text] Payload exacto que usa NAVAI (array):", output);

    if (!chunkSize || chunkSize <= 0) {
      console.log("[NAVAI][scrape_page_text] Texto completo usado por NAVAI:");
      console.log(output.join("\n"));
    } else {
      for (let i = 0; i < output.length; i += chunkSize) {
        const chunkIndex = Math.floor(i / chunkSize) + 1;
        console.log(`[NAVAI][scrape_page_text] Chunk ${chunkIndex}`);
        console.log(output.slice(i, i + chunkSize).join("\n"));
      }
    }
  }

  return output;
}

// Ejemplo:
// scrapePageText({ onlyVisible: true, includeLinkText: false, debug: true });
