import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Cesium ships a prebuilt bundle that ESM-resolves fine in the browser,
  // but we mark it as an external package for the server runtime so Next
  // doesn't try to bundle its worker scripts. Workers are served as static
  // assets from /public/cesium (copied by scripts/copy-cesium-assets.mjs).
  serverExternalPackages: ["cesium"],
};

export default nextConfig;
