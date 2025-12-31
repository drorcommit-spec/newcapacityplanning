# Full-Time Schedule Field - Implementation Complete

## Overview
Added a "full-time schedule" field to track each team member's work schedule percentage (100% = full-time, 50% = half-time, etc.).

## Database Changes

### New Column Added
```sql
ALTER TABLE team_members 
ADD COLUMN full_time_schedule INTEGER DEFAULT 100 
CHECK (full_time_schedule > 0 AND full_time_schedule <= 100);
```

**Field Properties:**
- **Type**: INTEGER
- **Default**: 100 (representing 100% full-time)
- **Constraint**: Must be between 1 and 100
- **Purpose**: Track part-time vs full-time work schedules

### Migration Script
**File**: `add-full-time-schedule-field.sql`
- Adds the new column with default value
- Updates existing members to 100%
- Adds performance index
- Includes verification query

## Code Changes

### 1. TypeScript Types
**File**: `src/types/index.ts`
- Added `fullTimeSchedule?: number` to `TeamMember` interface
- Default value: 100 (full-time)
- Optional field with proper typing

### 2. Data Transformation
**File**: `src/services/supabaseApi.ts`
- Updated `transformTeamMember()` to handle `full_time_schedule` → `fullTimeSchedule`
- Updated `transformTeamMemberToSupabase()` to handle `fullTimeSchedule` → `full_time_schedule`
- Default value: 100 if not specified

### 3. Excel Import Scripts
**File**: `excel-to-sql-migration.js`
- Updated member creation SQL to include `full_time_schedule = 100`
- Ensures all imported members default to full-time

## Usage Examples

### Database Values
```sql
-- Full-time member
INSERT INTO team_members (full_name, full_time_schedule) VALUES ('John Doe', 100);

-- Half-time member  
INSERT INTO team_members (full_name, full_time_schedule) VALUES ('Jane Smith', 50);

-- 80% schedule member
INSERT INTO team_members (full_name, full_time_schedule) VALUES ('Mike Johnson', 80);
```

### TypeScript Usage
```typescript
interface TeamMember {
  fullName: string;
  fullTimeSchedule?: number; // 100 = full-time, 50 = half-time, etc.
}

// Example usage
const member: TeamMember = {
  fullName: 'John Doe',
  fullTimeSchedule: 80 // 80% schedule
};
```

## Capacity Calculation Impact

This field can be used to calculate realistic capacity:
```typescript
// Example capacity calculation
const effectiveCapacity = (allocationPercentage * fullTimeSchedule) / 100;

// Example: 50% allocation on 80% schedule = 40% effective capacity
const effective = (50 * 80) / 100; // = 40%
```

## Migration Steps

### 1. Run Database Migration
```sql
-- Execute in Supabase dashboard
\i add-full-time-schedule-field.sql
```

### 2. Verify Migration
```sql
SELECT 
    full_name,
    role,
    full_time_schedule,
    is_active
FROM team_members 
ORDER BY full_name;
```

### 3. Update Application
The TypeScript changes are already in place and will automatically handle the new field.

## Default Behavior

### New Members
- **Database**: Automatically get `full_time_schedule = 100`
- **Application**: Default to 100% if not specified
- **Excel Import**: All imported members set to 100%

### Existing Members
- **Migration**: All existing members updated to 100%
- **Backward Compatibility**: Optional field, defaults to 100%

## Future Enhancements

### UI Integration (Future)
Could add to team member forms:
```typescript
<Input
  label="Full-Time Schedule (%)"
  type="number"
  min={1}
  max={100}
  defaultValue={100}
  value={member.fullTimeSchedule}
/>
```

### Capacity Planning Integration (Future)
Could use in capacity calculations:
```typescript
const adjustedCapacity = (allocation * member.fullTimeSchedule) / 100;
```

### Reporting Integration (Future)
Could show in member cards:
```typescript
{member.fullTimeSchedule < 100 && (
  <span className="text-blue-600 text-xs">
    {member.fullTimeSchedule}% schedule
  </span>
)}
```

## Verification Queries

### Check All Members
```sql
SELECT 
    full_name,
    full_time_schedule,
    CASE 
        WHEN full_time_schedule = 100 THEN 'Full-time'
        WHEN full_time_schedule >= 80 THEN 'Nearly full-time'
        WHEN full_time_schedule >= 50 THEN 'Part-time'
        ELSE 'Minimal schedule'
    END as schedule_type
FROM team_members 
WHERE is_active = true
ORDER BY full_time_schedule DESC, full_name;
```

### Summary Statistics
```sql
SELECT 
    COUNT(*) as total_members,
    COUNT(CASE WHEN full_time_schedule = 100 THEN 1 END) as full_time_members,
    COUNT(CASE WHEN full_time_schedule < 100 THEN 1 END) as part_time_members,
    ROUND(AVG(full_time_schedule), 1) as avg_schedule_percentage
FROM team_members 
WHERE is_active = true;
```

## Implementation Status

✅ **Database Schema** - Column added with constraints and defaults  
✅ **TypeScript Types** - Interface updated with optional field  
✅ **Data Transformation** - API functions handle field mapping  
✅ **Excel Import** - Scripts include full-time schedule field  
✅ **Migration Script** - Ready to execute database changes  
⏳ **UI Integration** - Can be added to member management forms  
⏳ **Capacity Calculations** - Can be integrated into planning logic  

The full-time schedule field is now ready to use throughout the system!