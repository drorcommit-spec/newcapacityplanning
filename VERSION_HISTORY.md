# Version History

## How to Update Version

When releasing a new version:
1. Open `src/version.ts`
2. Increment the last 3 digits by 1 (e.g., 1.0.001 → 1.0.002)
3. Update `package.json` version to match
4. Add entry below with changes
5. Commit with message: "Release v{version}"

## Versions

### v1.0.001 (2025-01-23)
**Initial Release**

Features:
- ✅ HubSpot Email Import - Automatic project creation from deal emails
- ✅ Region & Activity Close Date fields for projects
- ✅ Project max capacity warnings with red exclamation mark
- ✅ Allocation sorting by size (descending)
- ✅ Team multi-select filter with "No Team" option
- ✅ Redesigned Allocation Board layout for maximum screen space
- ✅ No vertical scrollbars in sprint cards
- ✅ SPA routing support for Vercel deployment
- ✅ LocalStorage-only mode (no backend required)
- ✅ Version numbering system

Core Functionality:
- Team Management
- Project Management  
- Allocation Planning (Rawdata & Board views)
- Capacity Overview with thresholds
- Allocation History
- CSV Import/Export
- Role-based permissions (Admin/PMO/Product Manager)

---

## Version Format

Format: `MAJOR.MINOR.PATCH`
- **MAJOR** (1.x.xxx): Breaking changes, major features
- **MINOR** (x.0.xxx): New features, non-breaking changes
- **PATCH** (x.x.001): Bug fixes, minor improvements

Example progression:
- 1.0.001 → 1.0.002 → 1.0.003 (bug fixes)
- 1.0.010 → 1.1.001 (new feature)
- 1.9.999 → 2.0.001 (major release)
