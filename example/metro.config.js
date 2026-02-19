const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const sdkRoot = path.resolve(__dirname, '..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Include the SDK source (symlinked via file:..) in Metro's watch list
config.watchFolders = [...(config.watchFolders || []), sdkRoot];

// Ensure package exports (subpath exports) are enabled
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
