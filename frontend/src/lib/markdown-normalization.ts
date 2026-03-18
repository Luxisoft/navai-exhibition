export function normalizeMarkdownBlockFormatting(markdown: string) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const normalizedLines: string[] = [];

  for (const rawLine of lines) {
    const pendingLines = [rawLine];

    while (pendingLines.length > 0) {
      const currentLine = pendingLines.shift()!.replace(/^(#{1,6})([^#\s])/u, "$1 $2");
      const leadingFenceWithTrailingContentMatch = currentLine.match(/^```(.+)$/u);

      if (leadingFenceWithTrailingContentMatch) {
        const trailingContent = leadingFenceWithTrailingContentMatch[1];
        if (/^[a-zA-Z0-9_+-]+\s*$/u.test(trailingContent)) {
          normalizedLines.push(currentLine);
        } else {
          normalizedLines.push("```");
          pendingLines.unshift(trailingContent);
        }
        continue;
      }

      const inlineFenceMatch = currentLine.match(/^(.*\S)```([a-zA-Z0-9_+-]+)\s*$/u);
      if (inlineFenceMatch) {
        normalizedLines.push(inlineFenceMatch[1]);
        pendingLines.unshift(`\`\`\`${inlineFenceMatch[2]}`);
        continue;
      }

      normalizedLines.push(currentLine);
    }
  }

  return normalizedLines.join("\n");
}
