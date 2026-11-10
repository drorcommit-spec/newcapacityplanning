// Auto-generated file - do not edit manually
// Generated at build time

export const VERSION_INFO = {
  "version": "1.2.8",
  "gitHash": "43c84ab",
  "gitBranch": "main",
  "buildTime": "2026-09-06T15:21:31.500Z",
  "fullVersion": "1.2.8 (43c84ab)"
} as const;

export const APP_VERSION = VERSION_INFO.fullVersion;

export const getVersionString = () => VERSION_INFO.fullVersion;
export const getVersion = () => VERSION_INFO.version;
export const getGitHash = () => VERSION_INFO.gitHash;
export const getBuildTime = () => VERSION_INFO.buildTime;
