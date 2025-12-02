# Project Screen Updates

## Changes Made

### 1. Screen Title
- **Changed from**: "Customers & Projects"
- **Changed to**: "Projects"

### 2. Table Column Order
**Before:**
- Alert | Customer | Project | Type | Status | Region | Max Capacity | Close Date | PMO Contact | Actions

**After:**
- Alert | **Project** | **Customer** | Type | Status | Region | Close Date | PMO Contact | Actions

**Changes:**
- Project column moved before Customer column
- Max Capacity column removed

### 3. Form Field Order
**Before:**
1. Customer Name (first field)
2. Project Name (second field)
3. Other fields...

**After:**
1. **Project Name** (first field)
2. **Customer Name** (second field)
3. Other fields...

## Rationale
- **Project-first approach**: Projects are the primary entity, customers are secondary
- **Removed Max Capacity**: Field was not being actively used and cluttered the interface
- **Consistency**: Form order now matches the importance hierarchy (Project → Customer)

## Files Modified
- `src/pages/ProjectManagement.tsx`
  - Updated page title
  - Reordered table columns
  - Reordered form fields
  - Removed Max Capacity column from table

## Navigation
The navigation menu already displayed "Projects" (not "Customers & Projects"), so no changes were needed there.

## Impact
- **Users**: Will see a cleaner, more focused project management interface
- **Data**: No data changes - only UI presentation updated
- **Functionality**: All existing features remain intact
