// Auto-generated file - do not edit manually
// Generated at build time

export const VERSION_INFO = {
  "version": "1.2.2",
  "gitHash": "6385eab",
  "gitBranch": "main",
  "buildTime": "2025-12-09T20:01:09.828Z",
  "fullVersion": "1.2.2 (6385eab)"
} as const;

export const APP_VERSION = VERSION_INFO.fullVersion;

export const getVersionString = () => VERSION_INFO.fullVersion;
export const getVersion = () => VERSION_INFO.version;
export const getGitHash = () => VERSION_INFO.gitHash;
export const getBuildTime = () => VERSION_INFO.buildTime;
