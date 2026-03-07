import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const workerBundlePath = path.resolve("dist", "retro_aviator_crash", "index.js");

if (!existsSync(workerBundlePath)) {
  console.log(`[deploy] Worker bundle not found at ${workerBundlePath}. Skipping sourcemap sanitize.`);
  process.exit(0);
}

const source = readFileSync(workerBundlePath, "utf8");

const sanitized = source
  // Remove inline source map URL comments, which Wrangler rejects.
  .replace(/\n\/\/# sourceMappingURL=data:[^\n]+\n?/g, "\n")
  .replace(/\n\/\*# sourceMappingURL=data:[\s\S]*?\*\/\n?/g, "\n");

if (sanitized !== source) {
  writeFileSync(workerBundlePath, sanitized, "utf8");
  console.log("[deploy] Removed inline source map data URL from worker bundle.");
} else {
  console.log("[deploy] No inline source map data URL found in worker bundle.");
}
