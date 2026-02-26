import fs from "node:fs";
import path from "node:path";

function hasProjectMarkers(dir: string) {
  return (
    fs.existsSync(path.join(dir, "package.json")) &&
    fs.existsSync(path.join(dir, "src", "content", "navai-readmes"))
  );
}

export function resolveProjectRoot(startDir = process.cwd()) {
  let current = path.resolve(startDir);
  for (let level = 0; level < 8; level += 1) {
    if (hasProjectMarkers(current)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return path.resolve(startDir);
}
