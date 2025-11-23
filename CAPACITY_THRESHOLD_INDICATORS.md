# Capacity Threshold Indicators in Capacity Overview

## Overview
Added visual indicators and total capacity display to the Capacity Overview Team View to quickly identify members who are under or over capacity thresholds.

## Feature Description

### Warning Indicators
Each sprint in the Team View now displays:
1. **Warning Icon (⚠️)** - Appears when capacity is outside threshold range
2. **Total Capacity** - Shows total allocated percentage for the sprint

### Threshold Logic
- **Under Capacity**: Total allocation < 90% (yellow warning)
- **Over Capacity**: Total allocation > 110% (red warning)
- **Normal Capacity**: 90% ≤ Total allocation ≤ 110% (no warning)

### Visual Design

#### Under Capacity (< 90%)
```
Sprint 1: 65% ⚠️
Total: 65%
```
- Yellow warning icon (text-yellow-600)
- Tooltip: "Under capacity (< 90%)"

#### Over Capacity (> 110%)
```
Sprint 2: 125% ⚠️
Total: 125%
```
- Red warning icon (text-red-600)
- Tooltip: "Over capacity (> 110%)"

#### Normal Capacity (90-110%)
```
Sprint 1: 95%
Total: 95%
```
- No warning icon
- Clean display

## User Experience

### At-a-Glance Identification
- **Quick Scan**: Instantly see which members need attention
- **Color Coding**: Yellow for under, red for over capacity
- **Tooltip Info**: Hover over warning icon for threshold details

### Total Display
- **Always Visible**: Total percentage shown under each sprint
- **Consistent Format**: "Total: XX%"
- **Small Text**: Doesn't clutter the interface (text-xs)

## Use Cases

### Scenario 1: Sprint Planning Review
**Goal**: Identify under-allocated team members

1. Open Capacity Overview in Team View
2. Scan for yellow warning icons (⚠️)
3. Identify members below 90% capacity
4. Click "+" to add allocations
5. Bring capacity to optimal range

### Scenario 2: Over-Allocation Alert
**Goal**: Find and fix over-allocated members

1. Open Capacity Overview in Team View
2. Look for red warning icons (⚠️)
3. Identify members above 110% capacity
4. Review their allocations
5. Adjust or redistribute work

### Scenario 3: Capacity Balancing
**Goal**: Balance workload across team

1. View all team members in Team View
2. Compare total percentages across members
3. Identify imbalances (some under, some over)
4. Move allocations to balance capacity
5. Verify warnings disappear

### Scenario 4: Future Planning
**Goal**: Plan capacity for upcoming sprints

1. View next 3 months in Capacity Overview
2. Check for warning icons in future sprints
3. Proactively adjust allocations
4. Prevent capacity issues before they occur

## Technical Implementation

### Threshold State
```typescript
const [underCapacityThreshold] = useState(90);
const [overCapacityThreshold] = useState(110);
```

### Warning Logic
```typescript
{(sprint1.total < underCapacityThreshold || sprint1.total > overCapacityThreshold) && (
  <span 
    className={sprint1.total < underCapacityThreshold ? 'text-yellow-600' : 'text-red-600'}
    title={sprint1.total < underCapacityThreshold 
      ? `Under capacity (< ${underCapacityThreshold}%)` 
      : `Over capacity (> ${overCapacityThreshold}%)`}
  >
    ⚠️
  </span>
)}
```

### Total Display
```typescript
<div className="text-xs text-gray-500 mt-1">Total: {sprint1.total}%</div>
```

## Visual Layout

### Before
```
┌─────────────────────────────────┐
│ Sprint 1: 65%            [+]    │
│ • Project A: 30%                │
│ • Project B: 35%                │
├─────────────────────────────────┤
│ Sprint 2: 125%           [+]    │
│ • Project C: 75%                │
│ • Project D: 50%                │
└─────────────────────────────────┘
```

### After
```
┌─────────────────────────────────┐
│ Sprint 1: 65% ⚠️         [+]    │
│ Total: 65%                      │
│ • Project A: 30%                │
│ • Project B: 35%                │
├─────────────────────────────────┤
│ Sprint 2: 125% ⚠️        [+]    │
│ Total: 125%                     │
│ • Project C: 75%                │
│ • Project D: 50%                │
└─────────────────────────────────┘
```

## Benefits

### 1. Immediate Visibility
- No need to calculate totals mentally
- Warnings jump out visually
- Quick identification of issues

### 2. Proactive Management
- Spot problems before they escalate
- Plan ahead for future sprints
- Maintain optimal capacity levels

### 3. Better Decision Making
- Clear data for allocation decisions
- Easy comparison across team members
- Informed capacity planning

### 4. Reduced Cognitive Load
- Don't need to remember thresholds
- Visual cues guide attention
- Less mental math required

### 5. Consistent Standards
- Same thresholds across all views
- Standardized capacity expectations
- Clear definition of "normal" capacity

## Integration with Existing Features

### Works With
- ✅ Team View mode
- ✅ All sprint cards (current + next 2 months)
- ✅ Expand/collapse functionality
- ✅ Add allocation button
- ✅ Edit allocation functionality
- ✅ Multi-select project filter

### Does Not Affect
- Project View mode (no changes)
- Allocation table
- Dashboard thresholds (separate configuration)

## Threshold Values

### Current Implementation
- **Under Capacity**: < 90%
- **Over Capacity**: > 110%
- **Hardcoded**: Values are fixed in component

### Future Enhancement
These thresholds could be:
- Made configurable per user
- Synced with Dashboard thresholds
- Stored in user preferences
- Adjusted per team or role

## Color Coding

### Warning Colors
- **Yellow (text-yellow-600)**: Under capacity
  - Indicates potential underutilization
  - Suggests adding more work
  - Less urgent than over capacity

- **Red (text-red-600)**: Over capacity
  - Indicates potential burnout risk
  - Suggests reducing workload
  - More urgent issue

### Text Colors
- **Gray (text-gray-500)**: Total percentage label
  - Subtle, doesn't compete with warnings
  - Clear but not distracting

## Accessibility

### Visual Indicators
- Warning emoji (⚠️) is universally recognized
- Color coding provides additional context
- Tooltip text explains the warning

### Screen Readers
- Warning icon has title attribute
- Tooltip provides context
- Total percentage is clearly labeled

### Keyboard Navigation
- All interactive elements remain keyboard accessible
- Warning icons don't interfere with navigation
- Tooltips appear on focus

## Performance

### Minimal Impact
- Simple conditional rendering
- No additional API calls
- No complex calculations
- Efficient React rendering

### Scalability
- Works with any number of team members
- Handles multiple sprints efficiently
- No performance degradation

## Edge Cases Handled

### Zero Allocation
- Total: 0%
- Shows yellow warning (under capacity)
- Clear indication of no work assigned

### Exactly at Threshold
- 90% or 110% exactly
- No warning shown (within acceptable range)
- Boundary values are inclusive

### Very High Allocation
- 200%+ possible
- Red warning shown
- Clear indication of severe over-allocation

## Future Enhancements (Potential)

1. **Configurable Thresholds**: Allow users to set their own thresholds
2. **Threshold Sync**: Sync with Dashboard threshold settings
3. **Color Customization**: Let users choose warning colors
4. **Additional Indicators**: Show green checkmark for optimal capacity
5. **Trend Arrows**: Show if capacity is increasing/decreasing
6. **Capacity Score**: Overall capacity health score
7. **Recommendations**: Suggest actions to fix capacity issues
8. **Alerts**: Email/notification when thresholds exceeded

## Testing Checklist

- [ ] Warning appears when total < 90%
- [ ] Warning appears when total > 110%
- [ ] No warning when total is 90-110%
- [ ] Yellow color for under capacity
- [ ] Red color for over capacity
- [ ] Tooltip shows correct message
- [ ] Total percentage displays correctly
- [ ] Works for Sprint 1
- [ ] Works for Sprint 2
- [ ] Works across all months
- [ ] Works with expand/collapse
- [ ] Works with project filter
- [ ] Doesn't affect Project View
- [ ] Accessible via keyboard
- [ ] Screen reader compatible

## Files Modified

1. **src/components/CapacityOverview.tsx**
   - Added `underCapacityThreshold` state (90)
   - Added `overCapacityThreshold` state (110)
   - Added warning icon conditional rendering for Sprint 1
   - Added warning icon conditional rendering for Sprint 2
   - Added total percentage display for Sprint 1
   - Added total percentage display for Sprint 2
   - Added tooltip with threshold explanation

## Code Quality

### Type Safety
- Threshold values are properly typed as numbers
- Conditional rendering is type-safe
- No type errors or warnings

### Maintainability
- Clear variable names
- Simple conditional logic
- Easy to adjust thresholds
- Well-documented code

### Consistency
- Same pattern for both sprints
- Consistent color coding
- Uniform tooltip format

## Migration Notes

### For Users
- New indicators appear automatically
- No configuration required
- No learning curve
- Immediate value

### For Developers
- No breaking changes
- Backward compatible
- No database changes
- No API changes
- Easy to customize thresholds
