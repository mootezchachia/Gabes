/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cesium ships a prebuilt bundle that ESM-resolves fine in the browser,
  // but we mark it as an external package for the server runtime so Next
  // doesn't try to bundle its worker scripts. Workers are served as static
  // assets from /public/cesium (copied by scripts/copy-cesium-assets.mjs).
  serverExternalPackages: ["cesium"],

  webpack: (config, { webpack }) => {
    // Cesium's KmlDataSource imports a subpath of @zip.js/zip.js that is
    // blocked by the package's exports field. NormalModuleReplacementPlugin
    // rewrites the request before resolution, bypassing the exports check.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^@zip\.js\/zip\.js\/lib\/zip-no-worker\.js$/,
        "@zip.js/zip.js"
      )
    );
    return config;
  },
};

export default nextConfig;
