# Focus App - Core Fixes Handoff (Path A)

## Mission: Make Focus a Real Product

**Current state:** Beautiful UI, zero persistence. Every refresh loses data.

**Goal:** Fix 4 critical blockers so the app actually saves data and maintains privacy.

**Timeline:** 10 hours / 1-2 days

**Deliverable:** Production-ready app where you can:
1. Create a task → refresh → task still exists
2. Create a filter → apply it → see filtered tasks
3. Switch user → see only your data (not others')
4. See who changed what (activity log)

---

## Blocker 1: Database Connection (2-3 hours)

**Problem:** Prisma fails to connect on Vercel. Pages error out when calling getTasks/createTask.

**Current state:**
- Database URL set in Vercel env vars
- Prisma client created (`lib/prisma.ts`)
- Server actions exist (`app/actions/tasks.ts`, `app/actions/filters.ts`)
- Pages revert to mock data to avoid crashes

**What to fix:**
1. **Verify DATABASE_URL on Vercel** is correct:
   - `postgres://postgres:patxev-sodhyn-2mebQo@db.btuphkievfekuwkfqnib.supabase.co:6543/postgres`
   - Port 6543 (pgBouncer) for app queries ✅
   - Test connection: `psql $DATABASE_URL -c "SELECT 1"`

2. **Check Prisma client setup** (`lib/prisma.ts`)
   - Make sure connection pooling is correct
   - Add retry logic for failed connections
   - Test locally: `npm run dev` and call getTasks manually

3. **Debug Vercel logs** when pages fail
   - Check build logs: any Prisma generation errors?
   - Check runtime logs: what's the actual error from getTasks?
   - Might be: timeout, auth, pgBouncer connection limits, migrations not run

4. **If still failing, use localStorage fallback** (temporary)
   - Save getTasks/createTask to localStorage temporarily
   - Real database next

**Files to check/fix:**
- `lib/prisma.ts` — Client setup
- `app/actions/tasks.ts` — error handling
- `.env.local` — DATABASE_URL correct?
- Vercel project settings → Environment Variables

---

## Blocker 2: Re-wire Pages (2 hours)

**Problem:** Pages use MOCK_TASKS instead of getTasks().

**Current state:**
- Dashboard, board, tasks, filters all have hardcoded MOCK_* arrays
- Server actions exist but aren't called
- No persistence

**What to do:**

### Dashboard (`app/dashboard/page.tsx`)
```typescript
// Replace:
const [tasks, setTasks] = useState(MOCK_TASKS)

// With:
import { getTasks } from '@/app/actions/tasks'

const [tasks, setTasks] = useState<Task[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  getTasks('ws_default')  // TODO: get actual workspaceId
    .then(setTasks)
    .catch(err => {
      console.error('Failed to load tasks:', err)
      setTasks(MOCK_TASKS) // Fallback
    })
    .finally(() => setLoading(false))
}, [])
```

### Board (`app/board/page.tsx`)
```typescript
// Same getTasks pattern
// Wire drag-drop to updateTask:
const handleDrop = async (status: string) => {
  if (!draggedTask) return
  await updateTask('ws_default', draggedTask.id, { status })
  // Refresh task list
}
```

### Tasks (`app/tasks/page.tsx`)
```typescript
// Same getTasks pattern
// Wire QuickAddModal to createTask:
onAdd={(task) => {
  createTask('ws_default', {
    title: task.title,
    priority: task.priority,
    statusId: 'inbox-id',
    tags: task.tags
  })
  // Refresh list
}
```

### Filters (`app/filters/page.tsx`)
```typescript
// Wire to getFilters/createFilter:
useEffect(() => {
  getFilters('ws_default').then(setFilters)
}, [])

const handleAddFilter = async (filter) => {
  await createFilter('ws_default', filter)
  // Refresh
}
```

**Key point:** Hardcode workspaceId as `'ws_default'` for now. Real workspace selection comes later.

**Files to update:**
- `app/dashboard/page.tsx`
- `app/board/page.tsx`
- `app/tasks/page.tsx`
- `app/filters/page.tsx`

---

## Blocker 3: Wire Filters (1 hour)

**Problem:** Filters exist but don't actually filter tasks.

**Current state:**
- Filters page created
- FilterDropdown component built
- But clicking filter does nothing

**What to do:**

### Dashboard: Add active filter state
```typescript
const [activeFilterId, setActiveFilterId] = useState<string | null>(null)

// Apply filter to Today panel
const filteredTasks = activeFilterId
  ? applyFilter(tasks, filters.find(f => f.id === activeFilterId))
  : tasks
```

### Render FilterDropdown in header
```typescript
<FilterDropdown
  filters={filters}
  activeFilterId={activeFilterId}
  onSelect={setActiveFilterId}
  onManageClick={() => router.push('/filters')}
/>
```

### Show active filter badge
```typescript
{activeFilterId && (
  <div className="px-3 py-1 bg-accent-100 text-accent-700 rounded-lg text-sm">
    📋 {filters.find(f => f.id === activeFilterId)?.name}
    <button onClick={() => setActiveFilterId(null)}>×</button>
  </div>
)}
```

### Do same for board & tasks views

**Files to update:**
- `app/dashboard/page.tsx` — Add filter state + apply
- `app/board/page.tsx` — Same
- `app/tasks/page.tsx` — Same
- `components/FilterDropdown.tsx` — Ensure working

**Note:** `applyFilter()` function already exists in `lib/filterUtils.ts`

---

## Blocker 4: RLS Policies (2 hours)

**Problem:** No workspace isolation. Any user can see any user's data.

**Current state:**
- Supabase RLS policies written but not enforced
- All queries filter by workspaceId in code (not at DB level)

**What to do:**

1. **Enable RLS on Task table** (Supabase console)
   - Go to Authentication → Policies
   - Task table → New Policy → RLS for SELECT/INSERT/UPDATE/DELETE
   ```sql
   -- SELECT: only user's own workspace tasks
   SELECT: (auth.uid()::text = (SELECT owner_id FROM workspace WHERE id = tasks.workspace_id))
   
   -- INSERT/UPDATE/DELETE: same
   ```

2. **Do same for SavedFilter, Goal, Tag tables**

3. **Test:** Try to getTasks with a different user ID — should fail

**Files to reference:**
- Database schema has RLS placeholders
- Supabase docs on RLS: https://supabase.com/docs/guides/auth/row-level-security

**Note:** This is security-critical. Don't skip.

---

## Bonus: Goal-Task Linking (1 hour)

**Problem:** Goals exist but tasks aren't linked to them.

**What to do:**

1. **Add goal selection to TaskDetailModal**
   ```typescript
   <select value={goalId} onChange={setGoalId}>
     {goals.map(g => <option value={g.id}>{g.name}</option>)}
   </select>
   ```

2. **Update task when goalId changes**
   ```typescript
   await updateTask(workspaceId, taskId, { goalId })
   ```

3. **On Dashboard, show which goal each task belongs to**
   ```typescript
   {task.goalId && <span>Goal: {goals.find(g => g.id === task.goalId)?.name}</span>}
   ```

---

## Bonus: Activity Log (1 hour)

**Problem:** No way to know who changed what.

**What to do:**

1. **Hook into updateTask/deleteTask**
   ```typescript
   // In server action after task update:
   await prisma.activityLog.create({
     data: {
       workspaceId,
       taskId,
       action: 'UPDATE',
       userId: user.id,
       changes: { before, after },
       timestamp: new Date()
     }
   })
   ```

2. **Show on TaskDetailModal**
   ```typescript
   const history = await getTaskHistory(taskId)
   // Display: "Updated 2 hours ago by you"
   // "Created yesterday"
   ```

---

## Testing Checklist

After each blocker fix:

- [ ] Database works: Task created → DB saved → refresh → still there
- [ ] Filters work: Create filter → apply to dashboard → shows only filtered tasks
- [ ] RLS works: Log in as user A, create task → Log in as user B, can't see task A's data
- [ ] Goals work: Link task to goal → shown on dashboard
- [ ] Activity works: Update task → see "Modified 1 min ago" in history
- [ ] Board works: Drag task to "Done" → refresh → still in Done
- [ ] QuickAdd works: Create task via modal → appears in dashboard immediately

---

## Critical Notes

1. **Workspace ID:** Currently hardcoded as `'ws_default'`. Real multi-workspace comes later.
2. **Error handling:** When database fails, fall back to mock data (already in place).
3. **Testing:** Test locally first (`npm run dev`), then deploy to Vercel.
4. **Fallbacks:** Keep MOCK_TASKS as fallback, don't delete.
5. **Git:** Commit after each blocker fix.

---

## File Structure (What Exists)

**Server Actions (Ready to Use):**
- `app/actions/tasks.ts` — getTasks, createTask, updateTask, deleteTask
- `app/actions/filters.ts` — getFilters, createFilter, updateFilter, deleteFilter
- `app/actions/goals.ts` — (if exists, same pattern)

**Components:**
- `components/FilterDropdown.tsx` — Filter selector
- `components/TaskDetailModal.tsx` — Task editor
- `components/QuickAddModal.tsx` — Task creator

**Utilities:**
- `lib/filterUtils.ts` — applyFilter() function
- `lib/prisma.ts` — Database client

**Pages (Need Rewiring):**
- `app/dashboard/page.tsx`
- `app/board/page.tsx`
- `app/tasks/page.tsx`
- `app/filters/page.tsx`

---

## Success Criteria

When complete:
1. ✅ Create task → Refresh → Task still there
2. ✅ Create filter → Apply → Dashboard shows only filtered tasks
3. ✅ Multiple users → Each sees only their own data
4. ✅ Drag task on board → Persists across refresh
5. ✅ Zero mock data visible (all real DB data)
6. ✅ Can launch to production

---

## Next: Questions for Ben

1. What workspaceId should we use? Default to user's first workspace? (Currently hardcoded)
2. Which features are MVP-blocking? (All 4 blockers? Or can we ship without activity log?)
3. Timeline: Ship by 2026-02-24?

Ready to implement. Send go-ahead.
