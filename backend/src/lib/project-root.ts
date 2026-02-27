import fs from "node:fs";
import path from "node:path";

function hasMonorepoMarkers(dir: string) {
  return (
    fs.existsSync(path.join(dir, "package.json")) &&
    fs.existsSync(path.join(dir, "backend", "src", "server.ts"))
  );
}

function hasBackendStandaloneMarkers(dir: string) {
  return (
    fs.existsSync(path.join(dir, "package.json")) &&
    fs.existsSync(path.join(dir, "src", "server.ts"))
  );
}

export function resolveProjectRoot(startDir = process.cwd()) {
  let current = path.resolve(startDir);

  for (let level = 0; level < 10; level += 1) {
    if (hasMonorepoMarkers(current) || hasBackendStandaloneMarkers(current)) {
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

