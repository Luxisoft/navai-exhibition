'use client';

import { Check, Copy } from "lucide-react";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import ini from "highlight.js/lib/languages/ini";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { useEffect, useMemo, useState } from "react";

type DocsCodeEditorProps = {
  code: string;
  language?: string | null;
  copyLabel?: string;
  copiedLabel?: string;
};

const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  shell: "bash",
  sh: "bash",
  zsh: "bash",
  yml: "yaml",
  env: "ini",
  dotenv: "ini",
  html: "xml",
  md: "markdown",
  markdown: "markdown",
  plaintext: "plaintext",
  text: "plaintext",
  txt: "plaintext",
};
const LANGUAGE_TOKEN_PATTERN = /^[a-z0-9_+-]+$/i;

function registerHighlightLanguage(name: string, syntax: (hljsApi: typeof hljs) => unknown) {
  if (!hljs.getLanguage(name)) {
    hljs.registerLanguage(name, syntax);
  }
}

registerHighlightLanguage("bash", bash);
registerHighlightLanguage("cpp", cpp);
registerHighlightLanguage("csharp", csharp);
registerHighlightLanguage("css", css);
registerHighlightLanguage("go", go);
registerHighlightLanguage("java", java);
registerHighlightLanguage("javascript", javascript);
registerHighlightLanguage("ini", ini);
registerHighlightLanguage("json", json);
registerHighlightLanguage("kotlin", kotlin);
registerHighlightLanguage("markdown", markdown);
registerHighlightLanguage("php", php);
registerHighlightLanguage("plaintext", plaintext);
registerHighlightLanguage("python", python);
registerHighlightLanguage("rust", rust);
registerHighlightLanguage("sql", sql);
registerHighlightLanguage("swift", swift);
registerHighlightLanguage("typescript", typescript);
registerHighlightLanguage("xml", xml);
registerHighlightLanguage("yaml", yaml);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeCodeLanguage(language?: string | null) {
  if (!language) {
    return null;
  }

  const normalized = language.trim().toLowerCase().replace(/^language-/, "");
  if (!normalized) {
    return null;
  }

  const resolved = LANGUAGE_ALIASES[normalized] ?? normalized;
  if (!LANGUAGE_TOKEN_PATTERN.test(resolved)) {
    return null;
  }

  return resolved;
}

export function extractCodeLanguageFromClassName(className?: string | null) {
  if (!className) {
    return null;
  }

  const token = className
    .split(/\s+/)
    .find((part) => part.toLowerCase().startsWith("language-"));

  return normalizeCodeLanguage(token ?? null);
}

export function inferCodeLanguageFromContent(code: string) {
  const trimmed = code.trim();
  if (!trimmed) {
    return "plaintext";
  }

  if (/^\s*(npm|pnpm|yarn|bun|npx|pnpx|git|curl|wget|docker|kubectl|cd|ls|cp|mv|rm|mkdir|cat|echo)\b/mu.test(trimmed)) {
    return "bash";
  }

  if (/^\s*[{[]/u.test(trimmed)) {
    return "json";
  }

  if (/^\s*[A-Z_][A-Z0-9_]*=.*/mu.test(trimmed)) {
    return "ini";
  }

  if (/^\s*(import|export|const|let|var|function|class)\b/mu.test(trimmed)) {
    return "typescript";
  }

  if (/^\s*</u.test(trimmed)) {
    return "xml";
  }

  return "plaintext";
}

function safeHighlightCode(code: string, language: string | null) {
  if (!code) {
    return "&nbsp;";
  }

  try {
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    }

    return hljs.highlightAuto(code).value;
  } catch {
    return escapeHtml(code);
  }
}

type ActiveTag = {
  name: string;
  open: string;
  close: string;
};

function extractTagName(tag: string) {
  const match = tag.match(/^<\s*\/?\s*([a-zA-Z0-9:-]+)/u);
  return match?.[1]?.toLowerCase() ?? null;
}

function splitHighlightedHtmlByLine(html: string) {
  const lines: string[] = [];
  const activeTags: ActiveTag[] = [];
  const tagRegex = /<\/?[^>]+>/gu;
  let cursor = 0;
  let currentLine = "";

  const closeActiveTags = () => activeTags
    .slice()
    .reverse()
    .map((tag) => tag.close)
    .join("");
  const reopenActiveTags = () => activeTags.map((tag) => tag.open).join("");

  const pushLine = () => {
    lines.push(currentLine.trim() ? currentLine : "&nbsp;");
    currentLine = reopenActiveTags();
  };

  const appendText = (chunk: string) => {
    if (!chunk) {
      return;
    }

    const parts = chunk.split("\n");
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (part) {
        currentLine += part;
      }

      if (index < parts.length - 1) {
        currentLine += closeActiveTags();
        pushLine();
      }
    }
  };

  let tagMatch = tagRegex.exec(html);
  while (tagMatch) {
    const tag = tagMatch[0];
    appendText(html.slice(cursor, tagMatch.index));
    currentLine += tag;

    const tagName = extractTagName(tag);
    const isClosingTag = /^<\s*\//u.test(tag);
    const isSelfClosingTag = /\/\s*>$/u.test(tag);

    if (tagName) {
      if (isClosingTag) {
        for (let index = activeTags.length - 1; index >= 0; index -= 1) {
          if (activeTags[index].name === tagName) {
            activeTags.splice(index, 1);
            break;
          }
        }
      } else if (!isSelfClosingTag) {
        activeTags.push({
          name: tagName,
          open: tag,
          close: `</${tagName}>`,
        });
      }
    }

    cursor = tagMatch.index + tag.length;
    tagMatch = tagRegex.exec(html);
  }

  appendText(html.slice(cursor));

  if (!currentLine && lines.length > 0) {
    return lines;
  }

  currentLine += closeActiveTags();
  lines.push(currentLine.trim() ? currentLine : "&nbsp;");
  return lines;
}

function copyWithFallback(code: string) {
  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = code;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let success = false;
  try {
    success = document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }

  return success;
}

export default function DocsCodeEditor({
  code,
  language,
  copyLabel = "Copiar",
  copiedLabel = "Copiado",
}: DocsCodeEditorProps) {
  const [copied, setCopied] = useState(false);
  const normalizedCode = useMemo(() => code.replace(/\r\n/g, "\n").replace(/\n$/, ""), [code]);
  const resolvedLanguage = useMemo(
    () => normalizeCodeLanguage(language) ?? inferCodeLanguageFromContent(normalizedCode),
    [language, normalizedCode]
  );
  const highlightedHtml = useMemo(
    () => safeHighlightCode(normalizedCode, resolvedLanguage),
    [normalizedCode, resolvedLanguage]
  );
  const lineHtml = useMemo(() => {
    return splitHighlightedHtmlByLine(highlightedHtml);
  }, [highlightedHtml]);

  const displayLanguage = useMemo(() => {
    const normalized = normalizeCodeLanguage(resolvedLanguage);
    if (!normalized) {
      return "CODE";
    }

    const uppercaseLanguage = normalized.toUpperCase().trim();
    return uppercaseLanguage.includes("#") ? "CODE" : uppercaseLanguage;
  }, [resolvedLanguage]);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    let success = false;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalizedCode);
        success = true;
      }
    } catch {
      success = false;
    }

    if (!success) {
      success = copyWithFallback(normalizedCode);
    }

    if (success) {
      setCopied(true);
    }
  };

  return (
    <div className="docs-code-editor">
      <div className="docs-code-editor-scroll">
        <div className="docs-code-editor-header">
          <span className="docs-code-editor-lang">{displayLanguage}</span>
          <button
            type="button"
            className={`docs-code-editor-copy${copied ? " is-copied" : ""}`}
            onClick={handleCopy}
            aria-label={copied ? copiedLabel : copyLabel}
            title={copied ? copiedLabel : copyLabel}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span>{copied ? copiedLabel : copyLabel}</span>
          </button>
        </div>

        <pre className="docs-code-editor-pre">
          <code className={`hljs${resolvedLanguage ? ` language-${resolvedLanguage}` : ""}`}>
            {lineHtml.map((htmlLine, index) => (
              <span key={`code-line-${index + 1}`} className="docs-code-editor-line">
                <span className="docs-code-editor-line-number" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="docs-code-editor-line-content" dangerouslySetInnerHTML={{ __html: htmlLine }} />
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
