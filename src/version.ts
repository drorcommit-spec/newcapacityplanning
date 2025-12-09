// Auto-generated file - do not edit manually
// This file is generated at build time by scripts/generate-version.js

export const VERSION_INFO = {
  version: "1.2.2",
  gitHash: "c103a3b",
  gitBranch: "main",
  buildTime: "2024-12-09T00:00:00.000Z",
  fullVersion: "1.2.2 (c103a3b)"
} as const;

export const APP_VERSION = VERSION_INFO.fullVersion;

export const getVersionString = () => VERSION_INFO.fullVersion;
export const getVersion = () => VERSION_INFO.version;
export const getGitHash = () => VERSION_INFO.gitHash;
export const getBuildTime = () => VERSION_INFO.buildTime;
