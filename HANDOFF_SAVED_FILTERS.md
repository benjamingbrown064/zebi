# Saved Filters Implementation Handoff

## Status: Server layer complete, UI needs implementation

### What's Done
- ✅ Server actions (`/app/actions/filters.ts`):
  - `getFilters(workspaceId)` - Fetch all saved filters
  - `createFilter(workspaceId, input)` - Create new filter
  - `updateFilter(workspaceId, filterId, updates)` - Edit filter
  - `deleteFilter(filterId)` - Delete filter
  - `applyFilter(tasks, filter)` - Apply filter logic to task list
- ✅ Database schema ready (SavedFilter table in Prisma)
- ✅ useWorkspace hook (provides workspaceId)
- ✅ Database persistence for tasks/statuses

---

## What Needs Implementation

### Priority 1: `/filters` Page (CRUD Management)
**File:** `/app/filters/page.tsx` (create new)

Features:
1. **List view:** Show all saved filters with:
   - Filter name
   - Filter description (e.g., "P1 tasks due this week")
   - Badge showing filter criteria (e.g., "P1-2, Due 7d")
   - Edit/delete buttons
   - "Set as default" checkbox

2. **Create filter modal:**
   - Name input (required)
   - Description textarea (optional)
   - Filter builder:
     - [ ] Statuses (checkboxes: Inbox, Planned, Doing, Blocked, Done)
     - [ ] Priorities (checkboxes: P1, P2, P3, P4)
     - [ ] Tags (multi-select search)
     - [ ] Due date range (from/to date pickers)
     - [ ] Project (dropdown)
     - [ ] Goal (dropdown)
   - Save/Cancel buttons

3. **Edit filter modal:**
   - Same form as create
   - Pre-populate current values
   - Delete button

4. **Quick filter chips (below list):**
   - Preset filters: "Due today", "Overdue", "Blocked", "Done this week"
   - Each chip: `<quick-filter>` button → creates temp filter in sidebar

### Priority 2: Wire Filters into Views

#### Dashboard (`/app/dashboard/page.tsx`)
Add to header:
```
[Dashboard] [Filter dropdown ▼]
```
- Dropdown shows: "All tasks" (default) + saved filters
- Clicking filter applies it to Today/Attention/Goals panels
- Shows filter badge: "📋 P1 tasks due this week"
- Clear filter button

#### Board (`/app/board/page.tsx`)
Same filter dropdown + apply logic:
- Filter reduces visible tasks in columns
- Drag-drop still works on filtered tasks
- Show "X tasks (filtered from Y total)"

#### Tasks (`/app/tasks/page.tsx`)
Sidebar integration (instead of separate page):
- Sidebar section: "Filters"
- List saved filters with click-to-apply
- "Manage filters" link → goes to /filters page
- Active filter highlighted

### Priority 3: Components (Create if not exist)

#### `FilterDropdown.tsx`
```typescript
interface FilterDropdownProps {
  activeFilterId?: string
  onFilterSelect: (filterId?: string) => void
  onManageClick: () => void
}
// Dropdown showing: All | [Saved filters list] | Manage filters
```

#### `FilterBuilder.tsx`
```typescript
interface FilterBuilderProps {
  definition?: FilterDefinition
  onChange: (def: FilterDefinition) => void
  workspaceId: string
}
// Multi-step form: statuses → priorities → tags → dates → projects
```

#### `FilterChip.tsx`
```typescript
interface FilterChipProps {
  filter: SavedFilter
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}
// Shows filter with delete icon
```

---

## Data Flow

### Creating a Filter
1. User clicks "New filter" on `/filters` page
2. Opens `FilterBuilder` modal
3. User selects criteria (statuses, priorities, tags, dates)
4. Clicks "Save filter"
5. Calls `createFilter(workspaceId, { name, definition })`
6. Filter added to sidebar/dropdowns
7. User can click filter → applies to current view

### Applying a Filter
1. User clicks filter in dropdown or sidebar
2. Page calls `applyFilter(tasks, selectedFilter)`
3. Returns filtered task list
4. UI updates to show only matching tasks
5. Badge shows "📋 P1 tasks" (filter name)
6. Clear button visible to reset to "All tasks"

### Editing a Filter
1. User clicks edit icon next to filter
2. `FilterBuilder` modal opens with current values
3. User changes criteria
4. Calls `updateFilter(workspaceId, filterId, { definition })`
5. Filter updates everywhere it's applied

---

## Implementation Order

1. **Create `/app/filters/page.tsx`** with:
   - List of saved filters (initially empty)
   - "New filter" button → opens modal
   - Edit/delete buttons on each filter
   - Edit modal with FilterBuilder

2. **Create `FilterBuilder.tsx` component:**
   - Checkboxes for statuses/priorities
   - Multi-select for tags
   - Date range picker
   - Project/goal dropdowns
   - Save/Cancel

3. **Create `FilterDropdown.tsx` component:**
   - Dropdown showing filters
   - "Manage filters" link
   - "Clear" option

4. **Wire into Dashboard:**
   - Import FilterDropdown
   - Add to header
   - State for activeFilter
   - Apply logic: `applyFilter(tasks, activeFilter)`
   - Show filtered results only

5. **Wire into Board:**
   - Same FilterDropdown
   - Apply filter before rendering columns
   - Show "X tasks (filtered)" badge

6. **Wire into Sidebar:**
   - Add "Filters" section
   - List saved filters
   - Click → apply to current view
   - "Manage" link

---

## UI Pattern Reference

### Filter Dropdown (Top Right of Header)
```
[Dashboard] [All tasks ▼]
            └─ All tasks
               └─ P1 tasks due this week
               └─ Love Warranty work
               └─ Blocked tasks
               └─ [Divider]
               └─ Manage filters →
```

### Filter Badge (When Active)
```
📋 P1 tasks due this week [X]
```
Shows active filter + clear button

### Sidebar Filters Section
```
Filters
├─ P1 tasks
├─ Overdue (badge: 2)
├─ Love Warranty
└─ [+] Manage filters
```

---

## TypeScript Interfaces

Already defined in `/app/actions/filters.ts`:
```typescript
interface FilterDefinition {
  statuses?: string[]           // ["inbox-id", "planned-id", ...]
  priorities?: number[]         // [1, 2]
  tags?: string[]              // ["urgent", "love-warranty"]
  dueDateWindow?: {
    from?: string              // ISO date "2026-02-20"
    to?: string
  }
  project?: string             // project ID
  goal?: string                // goal ID
  assignedTo?: string
  hasAttachments?: boolean
  isBlocked?: boolean
}

interface SavedFilter {
  id: string
  workspaceId: string
  name: string                 // "P1 tasks due this week"
  definition: FilterDefinition
  defaultView: 'list' | 'board'
  createdAt: string
  updatedAt: string
}
```

---

## Gotchas

### 1. Status/Tag/Project IDs
- Filters store IDs, not names
- When displaying filter criteria, need to look up names from database
- Example: `definition.statuses = ["abc-123", "def-456"]` → Display "Inbox, Planned"

### 2. Multi-Select with Search
- Tags/Projects multi-select needs search
- Recommend: `react-select` or `headlessui` for UX
- Already available in package.json? Check dependencies

### 3. Date Range Picker
- "Due between Feb 20 and Feb 27"
- Browser date input works, but UX is rough
- Consider `react-day-picker` for better calendar UI

### 4. Applying Filters Across Views
- Dashboard filters Today/Attention/Goals all by same filter
- Board filters by status + filter criteria
- Tasks filters by all criteria

### 5. Default Filter
- Filters can have `defaultView` (list vs board)
- Not critical for MVP, can skip for now

---

## Testing Checklist

- [ ] Create filter via /filters page
- [ ] Edit filter
- [ ] Delete filter
- [ ] Apply filter in dashboard (shows only matching tasks)
- [ ] Apply filter in board (shows only matching tasks)
- [ ] Clear filter returns to "All tasks"
- [ ] Filter badge shows in header
- [ ] Multiple filter criteria work together (P1 AND due today AND love-warranty tag)
- [ ] Editing task shows it in/out of active filter
- [ ] Saved filters persist after page refresh
- [ ] Sidebar filters list shows correct badge counts

---

## Success Criteria

When complete:
1. `/filters` page fully functional (CRUD)
2. Filters apply to dashboard/board/tasks views
3. "All tasks" + saved filters in dropdowns
4. Filter badges show active filter
5. Multi-criteria filters work (AND logic)
6. Zero TypeScript errors
7. Ready for Part C (Hardening/Launch)

---

**Files to Create:**
- `/app/filters/page.tsx`
- `/components/FilterBuilder.tsx`
- `/components/FilterDropdown.tsx`
- `/components/FilterChip.tsx` (optional)

**Files to Update:**
- `/app/dashboard/page.tsx` - Add FilterDropdown + apply logic
- `/app/board/page.tsx` - Add FilterDropdown + apply logic
- `/components/Sidebar.tsx` - Add Filters section

**Do NOT Modify:**
- `/app/actions/filters.ts` (complete)
- `/lib/workspace.ts` (complete)
- Database schema (complete)
