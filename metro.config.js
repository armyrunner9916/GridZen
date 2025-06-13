const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add mp3 to asset extensions
config.resolver.assetExts.push('mp3');

// Ensure audio files are treated as assets
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config;
