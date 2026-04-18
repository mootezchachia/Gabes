#!/usr/bin/env node
/**
 * Copy Cesium's build-time static assets (Assets/, Workers/, Widgets/,
 * ThirdParty/) from `node_modules/cesium/Build/Cesium/` into `public/cesium/`.
 *
 * Cesium ships a prebuilt bundle with assets that must be served as static
 * files at a known path. We set `window.CESIUM_BASE_URL = '/cesium'` in
 * the browser before importing Cesium so it resolves these at runtime.
 *
 * Runs automatically via `postinstall`. Safe to re-run.
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "node_modules", "cesium", "Build", "Cesium");
const dst = join(root, "public", "cesium");

if (!existsSync(src)) {
  console.warn("[cesium-assets] node_modules/cesium not installed — skip.");
  process.exit(0);
}

mkdirSync(dst, { recursive: true });

const subdirs = ["Assets", "Workers", "Widgets", "ThirdParty"];
for (const sub of subdirs) {
  const from = join(src, sub);
  const to = join(dst, sub);
  if (!existsSync(from)) continue;
  cpSync(from, to, { recursive: true, force: true });
  console.log(`[cesium-assets] copied ${sub}`);
}

console.log(`[cesium-assets] done → ${dst}`);
