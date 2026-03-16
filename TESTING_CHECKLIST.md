# Focus App - Testing Checklist

## ✅ Core Fixes Complete (2026-02-22)

### Stage 1: Database Connection ✅
- [x] Prisma client connects to Supabase
- [x] getTasks returns data from database
- [x] createTask writes to database
- [x] Tasks persist across page refresh

### Stage 2: Re-wire Pages ✅
- [x] Dashboard loads tasks from database
- [x] Board loads tasks and statuses from database
- [x] Tasks page loads from database
- [x] Filters page loads from database
- [x] QuickAddModal creates tasks via createTask()
- [x] TaskDetailModal updates via updateTask()
- [x] Drag-drop on board persists via updateTask()
- [x] Mock data used as fallback when database unavailable

### Stage 3: Wire Filters ✅
- [x] FilterDropdown added to dashboard header
- [x] FilterDropdown added to board header
- [x] FilterDropdown added to tasks header
- [x] Selecting filter applies applyFilter() to task list
- [x] Active filter badge shows with clear button
- [x] Filters work in combination with priority quick-filter

### Stage 4: Security (RLS) ✅
- [x] getTasks filters by workspaceId
- [x] createTask validates workspace and status
- [x] updateTask validates workspace ownership before update
- [x] deleteTask validates workspace ownership before delete
- [x] getFilters filters by workspaceId
- [x] createFilter validates workspace
- [x] updateFilter validates workspace ownership
- [x] deleteFilter validates workspace ownership
- [x] RLS policies SQL script created (prisma/rls-policies.sql)

---

## Manual Testing Checklist

### Dashboard
- [ ] Page loads without errors
- [ ] Tasks appear in "Today" panel
- [ ] Click task → TaskDetailModal opens
- [ ] Edit task → Save → Task updated
- [ ] Click "Add task..." → QuickAddModal opens
- [ ] Create task via QuickAdd → Task appears in list
- [ ] Refresh page → Task still there
- [ ] Select filter → Tasks filtered
- [ ] Clear filter → All tasks shown

### Board
- [ ] Page loads with 5 columns (Inbox, Planned, Doing, Blocked, Done)
- [ ] Tasks appear in correct columns based on status
- [ ] Drag task to new column → Task moves
- [ ] Refresh page → Task still in new column
- [ ] Add task → Appears in Inbox
- [ ] Filter dropdown works

### Tasks
- [ ] Page loads with all tasks
- [ ] Priority filter buttons work
- [ ] Click task → TaskDetailModal opens
- [ ] Edit task → Save → Changes persist
- [ ] Delete task → Task removed
- [ ] Add task → Task appears
- [ ] Filter dropdown works

### Filters
- [ ] Page loads with saved filters (or empty state)
- [ ] Create new filter → Appears in list
- [ ] Filter shows criteria summary
- [ ] Delete filter → Removed from list
- [ ] Go to dashboard → New filter appears in dropdown

---

## E2E Test Results (2026-02-22)

```
=== Testing Database Operations ===
Inbox status: ec58cbab-dd5d-44f3-b46e-f452d9c0dc5c
✅ Created task: 48b83edb-97c2-479f-90bc-102842a4ab10
✅ Tasks in database: 2
✅ Filters in database: 0
=== All tests passed! ===
```

---

## Next Steps (Bonus Features)

### Goal-Task Linking
- [ ] Add goal selector to TaskDetailModal
- [ ] Update task with goalId
- [ ] Show goal tag on TaskCard

### Activity Log
- [ ] Create ActivityLog entries on task changes
- [ ] Show activity history in TaskDetailModal

### Supabase Auth Integration
- [ ] Implement login/signup with Supabase Auth
- [ ] Get userId from auth session instead of hardcoded
- [ ] Get workspaceId from user's first workspace
- [ ] Apply RLS policies from prisma/rls-policies.sql

---

## Known Limitations

1. **Auth not implemented** - Currently using hardcoded workspace and user IDs
2. **Signals panel** - Uses mock data (no backend implementation)
3. **Goals panel** - Uses mock data (getGoals not wired)
4. **TaskDetailModal status dropdown** - Uses hardcoded status names, not dynamic from database
