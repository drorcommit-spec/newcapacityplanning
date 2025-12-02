// App version - Semantic Versioning (MAJOR.MINOR.PATCH)
// MAJOR: Breaking changes
// MINOR: New features (backward compatible)
// PATCH: Bug fixes
export const APP_VERSION = '1.1.0';

// Version History:
// 1.1.0 - Manager Filter Feature: Filter members by their assigned manager
// 1.0.1 - Initial production release

// Build info
export const BUILD_DATE = __BUILD_DATE__;
export const GIT_COMMIT = __GIT_COMMIT__;

// Environment detection
export const IS_PRODUCTION = import.meta.env.PROD;
export const IS_LOCAL = import.meta.env.DEV;
