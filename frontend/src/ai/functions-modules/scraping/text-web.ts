type ScrapeOptions = {
  dedupe?: boolean; // elimina repetidos
  minLength?: number; // filtra textos muy cortos
  onlyVisible?: boolean; // solo texto visible
  includeLinkText?: boolean; // incluye o no textos dentro de enlaces
  excludeUrlLikeText?: boolean; // filtra textos que son URL
  chunkSize?: number; // imprime en bloques (0 = todo)
  debug?: boolean; // logs de consola para depuracion
};

export function scrapePageText(options: ScrapeOptions = {}): string[] {
  const {
    dedupe = true,
    minLength = 2,
    onlyVisible = true,
    includeLinkText = false,
    excludeUrlLikeText = true,
    chunkSize = 200,
    debug = false,
  } = options;

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

  const visibilityCache = new WeakMap<Element, boolean>();

  const isElementVisible = (el: Element): boolean => {
    const cached = visibilityCache.get(el);
    if (typeof cached === "boolean") return cached;

    const htmlEl = el as HTMLElement;
    if (htmlEl.hidden || htmlEl.getAttribute("aria-hidden") === "true") {
      visibilityCache.set(el, false);
      return false;
    }

    const style = window.getComputedStyle(htmlEl);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number.parseFloat(style.opacity || "1") <= 0
    ) {
      visibilityCache.set(el, false);
      return false;
    }

    const rect = htmlEl.getBoundingClientRect();
    const visible = !(rect.width === 0 && rect.height === 0);
    visibilityCache.set(el, visible);
    return visible;
  };

  const texts: string[] = [];

  const treeWalkerFilter: NodeFilter = {
    acceptNode(node: Node): number {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
        if (onlyVisible && !isElementVisible(el)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_SKIP;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (onlyVisible && !isElementVisible(parent)) return NodeFilter.FILTER_REJECT;
        if (!includeLinkText && parent.closest("a")) return NodeFilter.FILTER_REJECT;

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

  if (debug) {
    console.log(`Textos extraidos: ${output.length}`);

    if (!chunkSize || chunkSize <= 0) {
      console.log(output.join("\n"));
    } else {
      for (let i = 0; i < output.length; i += chunkSize) {
        console.log(output.slice(i, i + chunkSize).join("\n"));
      }
    }
  }

  return output;
}

// Ejemplo:
// scrapePageText({ onlyVisible: true, includeLinkText: false, debug: true });
