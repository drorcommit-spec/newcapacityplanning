# Changelog

All notable changes to the Product Capacity Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2024-12-03

### Fixed
- **Resource Types Not Loading**: Fixed resource types not appearing in member form dropdown
  - Added fallback to extract resource types from existing members if resource_types table is empty
  - Fixed create new resource type to use proper API instead of hardcoded localhost URL
  - Now works correctly in both local and production environments
- **Teams Not Loading**: Fixed teams not appearing in member form
  - Added fallback to extract teams from existing members if teams table doesn't exist
  - Teams now load correctly in production
- **Create New Resource Type**: Fixed functionality to properly save to Supabase in production

## [1.1.1] - 2024-12-03

### Fixed
- **Manager Field Persistence**: Fixed manager field not saving in production
  - Added missing `manager_id` column to Supabase schema
  - Updated transform functions to properly handle manager_id field
  - Added proper null handling for empty manager selections
- **Resource Type Display**: Fixed resource types not showing in member form dropdown
  - Updated transform functions to ensure proper data type handling
  - Added array validation for teams field
- Database schema migration script for production deployment

## [1.1.0] - 2024-12-02

### Added
- **Manager Filter Feature**: New filter on Members page to show only members who are assigned as managers
  - Filter dropdown displays only actual managers (members who manage at least one other member)
  - "No Manager" option to show unassigned members
  - "All Managers" option to show everyone
- Version display in footer showing current version and environment (Local/Production)
- Changelog file for tracking version history
- Active menu highlighting with blue background for current page

### Changed
- Updated TeamMember schema to use `teams` array instead of single `team` string
- Improved team management with multi-select support

### Fixed
- TypeScript compilation errors related to team/teams property migration
- CapacityOverview component to handle teams as arrays
- MemberManagement component to support multiple teams per member
- User activation feature - ability to reactivate deactivated users

## [1.0.1] - 2024-11-29

### Added
- Initial production release
- Core capacity planning features
- Member, project, and team management
- Allocation tracking and reporting
- Dashboard with KPIs
- Supabase integration for data persistence

