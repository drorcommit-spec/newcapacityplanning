// App version - Semantic Versioning (MAJOR.MINOR.PATCH)
// MAJOR: Breaking changes
// MINOR: New features (backward compatible)
// PATCH: Bug fixes
export const APP_VERSION = '1.2.1';

// Version History:
// 1.2.1 - Hotfix: Fixed missing currentUser reference in CapacityPlanning
// 1.2.0 - Team-based permissions system: Read-only access for users without teams or in "Member" team
//       - Immediate saves for team members and projects to prevent data loss
//       - Removed import features from Projects screen
//       - Settings menu hidden for read-only users
// 1.1.4 - Debug: Investigating save issues with allocation additions
// 1.1.3 - Critical fix: Immediate saves for add/delete allocations to prevent data loss
// 1.1.2 - Bug fixes: Resource types and teams loading/saving in production
// 1.1.1 - Bug fixes: Manager field persistence and resource type display in production
// 1.1.0 - Manager Filter Feature: Filter members by their assigned manager
// 1.0.1 - Initial production release
