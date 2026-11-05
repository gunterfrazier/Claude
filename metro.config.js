// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// The bundled Bible translations (assets/bible/**/*.txt) are loaded on demand as assets,
// not inlined into the JavaScript bundle.
config.resolver.assetExts.push("txt");

module.exports = config;
