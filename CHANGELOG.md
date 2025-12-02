# Changelog

All notable changes to the Product Capacity Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-12-02

### Added
- **Manager Filter Feature**: New filter on Members page to show only members who are assigned as managers
  - Filter dropdown displays only actual managers (members who manage at least one other member)
  - "No Manager" option to show unassigned members
  - "All Managers" option to show everyone
- Version display in footer showing current version and environment (Local/Production)
- Changelog file for tracking version history

### Changed
- Updated TeamMember schema to use `teams` array instead of single `team` string
- Improved team management with multi-select support

### Fixed
- TypeScript compilation errors related to team/teams property migration
- CapacityOverview component to handle teams as arrays
- MemberManagement component to support multiple teams per member

## [1.0.1] - 2024-11-29

### Added
- Initial production release
- Core capacity planning features
- Member, project, and team management
- Allocation tracking and reporting
- Dashboard with KPIs
- Supabase integration for data persistence

