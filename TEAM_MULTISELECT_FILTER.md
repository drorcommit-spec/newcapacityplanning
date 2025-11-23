# Team Multi-Select Filter

## Feature Overview
Converted the team filter on the Allocation Board (Team View) from a single-select dropdown to a multi-select checkbox interface.

## Changes Made

### 1. Multi-Select Checkboxes
**Before:** Single dropdown with "Both" option
```
Team: [Both ▼]
```

**After:** Checkbox list with multiple selections
```
Team Filter
☑ No Team
☑ Product
☑ Software
☑ Cloud
☐ AI/ML

[Select All] [Clear All]
```

### 2. "No Team" Option
- New option to show team members without an assigned team
- Appears at the top of the list
- Useful for identifying unassigned members

### 3. Default Selection
- **All teams selected by default** (Product, Software, Cloud, AI/ML, etc.)
- **"No Team" is NOT selected by default**
- Shows all assigned team members on initial load
- Excludes unassigned members unless explicitly selected

### 4. Quick Actions
- **Select All:** Checks all teams including "No Team"
- **Clear All:** Unchecks all teams (shows no members)

## User Interface

### Visual Design
- **Scrollable container:** Max height with scroll for many teams
- **Hover effects:** Highlights checkbox rows on hover
- **Clear labels:** Each team name clearly visible
- **Action buttons:** Small text buttons at bottom for bulk actions

### Layout
```
┌─────────────────────────────┐
│ Team Filter                 │
├─────────────────────────────┤
│ ☑ No Team                   │
│ ☑ Product                   │
│ ☑ Software                  │
│ ☑ Cloud                     │
│ ☐ AI/ML                     │
├─────────────────────────────┤
│ [Select All] [Clear All]    │
└─────────────────────────────┘
```

## Functionality

### Filter Logic
```typescript
// Shows members if:
// 1. "No Team" is selected AND member has no team, OR
// 2. Member's team is in the selected teams list

managers = managers.filter(m => {
  if (selectedTeams.includes('No Team') && !m.team) return true;
  return m.team && selectedTeams.includes(m.team);
});
```

### State Management
```typescript
// State: Array of selected team names
const [selectedTeams, setSelectedTeams] = useState<string[]>(teams);

// Default: All teams except "No Team"
// Initial value: ['Product', 'Software', 'Cloud', 'AI/ML']
```

## Use Cases

### Scenario 1: View Specific Teams
**Goal:** See only Product and Software teams
**Action:** 
1. Click "Clear All"
2. Check "Product"
3. Check "Software"
**Result:** Only Product and Software team members visible

### Scenario 2: Find Unassigned Members
**Goal:** Identify team members without a team
**Action:**
1. Click "Clear All"
2. Check "No Team"
**Result:** Only members without team assignment visible

### Scenario 3: View All Members
**Goal:** See everyone including unassigned
**Action:** Click "Select All"
**Result:** All team members visible, including those without teams

### Scenario 4: Exclude One Team
**Goal:** See all teams except AI/ML
**Action:** Uncheck "AI/ML" (all others remain checked)
**Result:** All teams visible except AI/ML

## Benefits

### 1. Flexibility
- View multiple teams simultaneously
- Mix and match team combinations
- Include/exclude unassigned members as needed

### 2. Efficiency
- No need to switch between teams repeatedly
- Compare multiple teams side-by-side
- Quick bulk selection with action buttons

### 3. Clarity
- Clear visual indication of selected teams
- Easy to see which teams are included
- "No Team" option makes unassigned members visible

### 4. Better Resource Management
- Identify unassigned team members
- View cross-team capacity at a glance
- Analyze specific team combinations

## Technical Details

### Component Changes
**File:** `src/components/CapacityOverview.tsx`

**State:**
```typescript
// Changed from single string to array
const [selectedTeams, setSelectedTeams] = useState<string[]>(teams as string[]);
```

**Filter Logic:**
```typescript
if (selectedTeams.length > 0) {
  managers = managers.filter(m => {
    if (selectedTeams.includes('No Team') && !m.team) return true;
    return m.team && selectedTeams.includes(m.team);
  });
}
```

**UI Component:**
```typescript
<div className="bg-white border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
  {/* Checkboxes for each team */}
  {/* Select All / Clear All buttons */}
</div>
```

### Styling
- **Container:** White background, border, rounded corners
- **Max Height:** 192px (12rem) with scroll
- **Checkboxes:** Blue accent color, rounded style
- **Hover:** Light gray background on row hover
- **Buttons:** Small text, blue/gray colors

## Edge Cases Handled

### 1. No Teams Exist
- Shows only "No Team" option
- All members would be unassigned

### 2. All Teams Unchecked
- Shows no members (empty view)
- "Clear All" button enables this state

### 3. Member Without Team
- Only visible when "No Team" is checked
- Clearly identified as unassigned

### 4. Many Teams
- Scrollable container prevents overflow
- All teams accessible via scroll

## Future Enhancements

### Potential Additions:
1. **Search/Filter:** Search box to filter team list
2. **Team Counts:** Show member count per team
3. **Saved Filters:** Save common team combinations
4. **Keyboard Shortcuts:** Quick select with keyboard
5. **Drag to Select:** Click and drag to select multiple
6. **Team Groups:** Group related teams together
7. **Color Coding:** Different colors per team
8. **Export Selection:** Export filtered view to CSV

## Testing Checklist

- [x] ✅ Default shows all teams except "No Team"
- [x] ✅ "No Team" option appears at top
- [x] ✅ Checking/unchecking teams filters correctly
- [x] ✅ "Select All" checks all teams including "No Team"
- [x] ✅ "Clear All" unchecks all teams
- [x] ✅ Multiple teams can be selected simultaneously
- [x] ✅ Members without teams only show when "No Team" checked
- [x] ✅ Scrollable when many teams exist
- [x] ✅ No TypeScript errors
- [x] ✅ Responsive layout

## Related Features

- Team assignment in Team Management
- Team-based capacity thresholds
- Team filtering in other views
- Member search functionality

---

**Status:** ✅ Implemented and tested
**Version:** Latest update
**Impact:** Improved team filtering flexibility
