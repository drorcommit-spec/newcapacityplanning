// Auto-generated file - do not edit manually
// Generated at build time

export const VERSION_INFO = {
  "version": "1.2.2",
  "gitHash": "292b8d5",
  "gitBranch": "main",
  "buildTime": "2025-12-09T19:56:08.453Z",
  "fullVersion": "1.2.2 (292b8d5)"
} as const;

export const APP_VERSION = VERSION_INFO.fullVersion;

export const getVersionString = () => VERSION_INFO.fullVersion;
export const getVersion = () => VERSION_INFO.version;
export const getGitHash = () => VERSION_INFO.gitHash;
export const getBuildTime = () => VERSION_INFO.buildTime;
