# Member Capacity-Based Thresholds

## Overview
Updated capacity threshold calculations to be based on each member's individual capacity percentage instead of a fixed 100%.

## Problem
Previously, capacity thresholds were calculated against a fixed 100% baseline:
- Under Capacity: < 70% (of 100%)
- Over Capacity: > 100% (of 100%)

This didn't account for members with reduced capacity (e.g., part-time at 50%).

## Solution
Thresholds now calculate based on each member's individual capacity:
- Under Capacity: < 70% of member's capacity
- Over Capacity: > 100% of member's capacity

### Examples

**Full-time member (100% capacity)**:
- Under: < 70% (70% of 100%)
- Good: 70-100%
- Over: > 100%

**Part-time member (50% capacity)**:
- Under: < 35% (70% of 50%)
- Good: 35-50%
- Over: > 50%

**Reduced capacity member (80% capacity)**:
- Under: < 56% (70% of 80%)
- Good: 56-80%
- Over: > 80%

## Changes Made

### 1. Updated Filter Logic (Team View)
```typescript
// Before
if (capacityFilter === 'under') return total < 70;
if (capacityFilter === 'over') return total > 100;

// After
const memberCapacity = member.capacity ?? 100;
const underThreshold = (memberCapacity * 70) / 100;
const overThreshold = (memberCapacity * 100) / 100;

if (capacityFilter === 'under') return total < underThreshold;
if (capacityFilter === 'over') return total > overThreshold;
```

### 2. Updated Visual Indicators
```typescript
// Before
const getCapacityColor = (total: number) => {
  if (total < 70) return 'text-yellow-600 bg-yellow-50';
  if (total > 100) return 'text-red-600 bg-red-50';
  return 'text-green-600 bg-green-50';
};

// After
const getCapacityColor = (total: number, memberCapacity: number = 100) => {
  const underThreshold = (memberCapacity * 70) / 100;
  const overThreshold = (memberCapacity * 100) / 100;
  
  if (total < underThreshold) return 'text-yellow-600 bg-yellow-50';
  if (total > overThreshold) return 'text-red-600 bg-red-50';
  return 'text-green-600 bg-green-50';
};
```

### 3. Updated Display
Shows both allocated and total capacity:
```
Total: 40% / 50%
```
Instead of just:
```
Total: 40%
```

## Benefits

✅ **Fair Comparison**: Part-time members aren't always flagged as under-capacity
✅ **Accurate Filtering**: "Under Capacity" filter shows members truly under-allocated for their availability
✅ **Better Planning**: Managers can see capacity relative to each member's availability
✅ **Flexible Workforce**: Supports mixed full-time/part-time teams

## Use Cases

### Part-Time Employee
- Member: John (50% capacity)
- Allocated: 45%
- Status: ✓ Good (90% of his capacity)
- Before: Would show as ⚠️ Under (45% < 70%)

### Contractor with Limited Hours
- Member: Jane (60% capacity)
- Allocated: 65%
- Status: ❗ Over (108% of her capacity)
- Before: Would show as ✓ Good (65% < 100%)

### Reduced Availability
- Member: Bob (80% capacity due to other commitments)
- Allocated: 75%
- Status: ✓ Good (94% of his capacity)
- Before: Would show as ✓ Good (75% < 100%)

## Technical Details

### Threshold Calculation
```typescript
const memberCapacity = member.capacity ?? 100; // Default to 100% if not set
const underThreshold = (memberCapacity * underCapacityThreshold) / 100;
const overThreshold = (memberCapacity * overCapacityThreshold) / 100;
```

Where:
- `underCapacityThreshold` = 70 (70%)
- `overCapacityThreshold` = 100 (100%)

### Filter Application
Applied in:
1. **Team View Capacity Filter** - Filters members by their capacity status
2. **Visual Indicators** - Colors (yellow/green/red) and badges (⚠️/✓/❗)
3. **Display** - Shows "Total: X% / Y%" format

## Files Modified

- `src/pages/CapacityPlanning.tsx`
  - Updated `getMembersForSprint` capacity filter logic
  - Updated `getCapacityColor` function to accept member capacity
  - Updated `getCapacityBadge` function to accept member capacity
  - Updated member display to show both allocated and total capacity

## Backward Compatibility

✅ **Fully Compatible**: Members without capacity set default to 100%
✅ **No Data Migration Needed**: Existing members already have capacity=100
✅ **Gradual Adoption**: Can set capacity for new members as needed

## Future Enhancements (Optional)

- Show capacity utilization percentage (e.g., "90% utilized")
- Filter by capacity utilization range
- Capacity trend charts
- Capacity planning recommendations
