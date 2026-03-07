const DECORATIVE_GLYPHS_PATTERN = /(?:[\p{Extended_Pictographic}\u2600-\u27BF]|\uFE0F|\u200D)+/gu;
const LEADING_DECORATIVE_SEPARATORS_PATTERN = /^[\s:;,.|\-—–]+/u;
const EXTRA_WHITESPACE_PATTERN = /\s{2,}/g;
const WHITESPACE_BEFORE_PUNCTUATION_PATTERN = /\s+([,.;:!?])/g;
const MARKDOWN_TEXT_PREFIX_PATTERN = /^(\s*(?:(?:#{1,6}\s+)|(?:>\s*)|(?:[-*+]\s+)|(?:\d+\.\s+))*)/u;

export function stripLeadingDecorativeText(value: string) {
  if (!value) {
    return value;
  }

  const withoutGlyphs = value.replace(DECORATIVE_GLYPHS_PATTERN, " ");
  return withoutGlyphs
    .replace(WHITESPACE_BEFORE_PUNCTUATION_PATTERN, "$1")
    .replace(EXTRA_WHITESPACE_PATTERN, " ")
    .replace(LEADING_DECORATIVE_SEPARATORS_PATTERN, "")
    .trim();
}

function stripLeadingDecorativeTextFromMarkdownLine(line: string) {
  if (!line.trim() || /^\s*</u.test(line)) {
    return line;
  }

  const prefixMatch = line.match(MARKDOWN_TEXT_PREFIX_PATTERN);
  const prefix = prefixMatch?.[1] ?? "";
  const content = line.slice(prefix.length);

  if (!content || /^\s*</u.test(content)) {
    return line;
  }

  const strippedContent = stripLeadingDecorativeText(content);
  return strippedContent === content ? line : `${prefix}${strippedContent}`;
}

export function stripLeadingDecorativeMarkdownText(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  let insideCodeFence = false;

  return lines
    .map((line) => {
      if (/^\s*```/u.test(line)) {
        insideCodeFence = !insideCodeFence;
        return line;
      }

      if (insideCodeFence) {
        return line;
      }

      return stripLeadingDecorativeTextFromMarkdownLine(line);
    })
    .join("\n");
}
