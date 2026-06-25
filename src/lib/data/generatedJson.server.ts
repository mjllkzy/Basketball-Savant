import fs from "node:fs";
import path from "node:path";

if (typeof window !== "undefined") {
  throw new Error("Generated data files can only be loaded on the server.");
}

const generatedDataDirectory = path.join(process.cwd(), "src", "lib", "data", "generated");
const jsonCache = new Map<string, unknown>();

function generatedDataPath(relativePath: string) {
  const resolved = path.resolve(generatedDataDirectory, relativePath);
  if (!resolved.startsWith(`${generatedDataDirectory}${path.sep}`)) {
    throw new Error(`Invalid generated data path: ${relativePath}`);
  }
  return resolved;
}

export function readGeneratedJsonSync<T>(relativePath: string): T {
  const cached = jsonCache.get(relativePath);
  if (cached !== undefined) return cached as T;

  const parsed = JSON.parse(fs.readFileSync(generatedDataPath(relativePath), "utf8")) as T;
  jsonCache.set(relativePath, parsed);
  return parsed;
}

export function resolveGeneratedDataPath(relativePath: string) {
  return generatedDataPath(relativePath);
}
