function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function cleanHeadingText(value: string) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~]/g, "")
    .trim();
}

type BuildHeadingIdInput = {
  title: string;
  offset?: number | null;
  line?: number | null;
  column?: number | null;
};

export function buildStableHeadingId({
  title,
  offset: _offset,
  line: _line,
  column: _column,
}: BuildHeadingIdInput) {
  const slug = slugifyHeading(cleanHeadingText(title));
  return slug || "section";
}
