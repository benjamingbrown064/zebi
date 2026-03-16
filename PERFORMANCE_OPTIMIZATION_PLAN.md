# Zebi Performance Optimization Plan
**Created:** 2026-03-14  
**Problem:** Slow navigation between pages, every click requires full data refetch from database

---

## 🔍 Current Issues Identified

### 1. **No Client-Side Caching**
- Every page navigation fetches data from scratch
- No data persistence between page loads
- Same data refetched multiple times (e.g., statuses, workspace info)

### 2. **Multiple Database Queries Per Page**
- Dashboard: 5 parallel Prisma queries on every load
- Tasks page: Fetches tasks + statuses on every mount
- No query result caching at database level

### 3. **Client-Side Fetching Pattern**
- Pages use `useEffect` to fetch data after mount
- Causes blank screen → loading spinner → data appears delay
- Poor perceived performance

### 4. **No Optimistic Updates**
- Every action (complete task, update status) requires full server round-trip
- UI doesn't update until server confirms
- Feels slow even if server is fast

---

## 🚀 Solutions (Ordered by Impact)

### Solution 1: Add React Query (TanStack Query) ⚡ **HIGHEST IMPACT**

**What it does:**
- Caches API responses in memory
- Automatically refetches stale data
- Deduplicates concurrent requests
- Enables optimistic updates

**Implementation:**
```bash
npm install @tanstack/react-query
```

**Impact:**
- **80-90% faster** navigation between pages (instant cached data)
- **50-70% reduction** in database queries
- **Zero perceived latency** for cached data

**Example:**
```typescript
// Before (slow)
useEffect(() => {
  async function load() {
    const tasks = await getTasks(workspaceId)
    setTasks(tasks)
  }
  load()
}, [])

// After (instant)
const { data: tasks } = useQuery({
  queryKey: ['tasks', workspaceId],
  queryFn: () => getTasks(workspaceId),
  staleTime: 30000, // Cache for 30 seconds
})
```

**Effort:** Medium (2-3 days to implement across all pages)

---

### Solution 2: LocalStorage for Static Data 💾 **QUICK WIN**

**What it does:**
- Store rarely-changing data in browser storage
- Instant load on page refresh
- Survive browser sessions

**What to cache:**
- Workspace metadata (name, settings)
- User preferences (sidebar state, theme)
- Status list (rarely changes)
- Company list (changes infrequently)

**Implementation:**
```typescript
// utils/local-cache.ts
export const localCache = {
  set: (key: string, data: any, ttl: number) => {
    const item = {
      data,
      expiry: Date.now() + ttl
    }
    localStorage.setItem(key, JSON.stringify(item))
  },
  
  get: (key: string) => {
    const item = localStorage.getItem(key)
    if (!item) return null
    
    const parsed = JSON.parse(item)
    if (Date.now() > parsed.expiry) {
      localStorage.removeItem(key)
      return null
    }
    
    return parsed.data
  }
}

// Usage
const cached = localCache.get('statuses')
if (cached) {
  setStatuses(cached)
} else {
  const fresh = await getStatuses()
  localCache.set('statuses', fresh, 3600000) // 1 hour
  setStatuses(fresh)
}
```

**Impact:**
- **Instant load** for static data
- **Reduces** initial page load time by 200-500ms
- Works offline

**Effort:** Low (1 day to implement for key data)

---

### Solution 3: Database Query Optimization 🗄️ **MEDIUM IMPACT**

**Current Issues:**
- Some queries load too much data (all fields when only few needed)
- Missing indexes on frequently queried columns
- N+1 query patterns in some places

**Optimizations:**

**3a. Add Database Indexes**
```sql
-- Tasks queries (most frequent)
CREATE INDEX IF NOT EXISTS "Task_workspaceId_archivedAt_statusId_idx" 
  ON "Task"("workspaceId", "archivedAt", "statusId");

CREATE INDEX IF NOT EXISTS "Task_workspaceId_todayPinDate_idx" 
  ON "Task"("workspaceId", "todayPinDate") 
  WHERE "archivedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Task_workspaceId_completedAt_idx" 
  ON "Task"("workspaceId", "completedAt") 
  WHERE "completedAt" IS NOT NULL;

-- Objectives queries
CREATE INDEX IF NOT EXISTS "Objective_workspaceId_status_idx" 
  ON "Objective"("workspaceId", "status");
```

**3b. Use `select` to limit fields**
```typescript
// Before (loads everything)
const tasks = await prisma.task.findMany({ where: { workspaceId } })

// After (only needed fields)
const tasks = await prisma.task.findMany({
  where: { workspaceId },
  select: {
    id: true,
    title: true,
    statusId: true,
    priority: true,
    dueAt: true,
    // Only fields actually used
  }
})
```

**3c. Use aggregation instead of loading all data**
```typescript
// Before (loads all tasks to count)
const allTasks = await prisma.task.findMany({ where: { projectId } })
const completed = allTasks.filter(t => t.completedAt).length

// After (database aggregation)
const { _count } = await prisma.task.aggregate({
  where: { projectId },
  _count: {
    _all: true,
    completedAt: true
  }
})
```

**Impact:**
- **30-50% faster** database queries
- **Reduced** data transfer from database
- **Lower** memory usage

**Effort:** Medium (2-3 days to audit and optimize all queries)

---

### Solution 4: Next.js App Router Optimizations 🎯 **MEDIUM IMPACT**

**What to do:**
1. **Use Server Components for initial data**
   - Fetch data server-side (zero JS to client)
   - Stream UI as data arrives
   - Better perceived performance

2. **Prefetch links**
   ```typescript
   <Link href="/tasks" prefetch={true}>Tasks</Link>
   ```

3. **Use `loading.tsx` files**
   - Show instant skeleton UI while data loads
   - Better UX than blank screen

4. **Cache server actions**
   ```typescript
   import { unstable_cache } from 'next/cache'
   
   export const getCachedStatuses = unstable_cache(
     async (workspaceId: string) => {
       return await prisma.status.findMany({ where: { workspaceId } })
     },
     ['statuses'],
     { revalidate: 3600, tags: ['statuses'] }
   )
   ```

**Impact:**
- **Faster** initial page loads
- **Better** perceived performance
- **Lower** server load

**Effort:** Medium (3-4 days to refactor critical pages)

---

### Solution 5: Optimistic Updates 🚀 **HIGH UX IMPACT**

**What it does:**
- Update UI immediately (before server confirms)
- Roll back if server rejects
- Feels instant to user

**Example:**
```typescript
const mutation = useMutation({
  mutationFn: (taskId: string) => completeTask(taskId),
  
  onMutate: async (taskId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['tasks'] })
    
    // Snapshot current state
    const previous = queryClient.getQueryData(['tasks'])
    
    // Optimistically update
    queryClient.setQueryData(['tasks'], (old: Task[]) =>
      old.map(t => t.id === taskId ? { ...t, completedAt: new Date() } : t)
    )
    
    return { previous }
  },
  
  onError: (err, taskId, context) => {
    // Roll back on error
    queryClient.setQueryData(['tasks'], context.previous)
  },
  
  onSettled: () => {
    // Refetch to sync with server
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }
})
```

**Impact:**
- **Zero perceived latency** for user actions
- **Feels instant** even on slow connections
- **Huge** UX improvement

**Effort:** Medium (requires React Query, 2-3 days to implement across app)

---

## 📊 Recommended Implementation Order

### Phase 1: Quick Wins (Week 1)
1. ✅ **Add React Query** (2 days)
   - Install and configure
   - Wrap app in QueryClientProvider
   - Refactor Tasks page as proof of concept

2. ✅ **LocalStorage for statuses** (1 day)
   - Cache status list
   - Cache workspace metadata
   - Implement TTL logic

3. ✅ **Add database indexes** (1 day)
   - Create index migration
   - Test query performance

**Expected result:** 60-80% faster page navigation

---

### Phase 2: Optimization (Week 2)
4. ✅ **Refactor all pages to React Query** (3 days)
   - Dashboard
   - Objectives
   - Companies
   - Projects
   - Goals

5. ✅ **Optimize database queries** (2 days)
   - Add `select` clauses
   - Replace N+1 queries
   - Use aggregation where possible

**Expected result:** 40-60% reduction in database load

---

### Phase 3: Polish (Week 3)
6. ✅ **Implement optimistic updates** (3 days)
   - Task completion
   - Status changes
   - Priority updates

7. ✅ **Add loading states** (2 days)
   - Skeleton screens
   - Progressive loading
   - Prefetching

**Expected result:** App feels instant, even on slow connections

---

## 🎯 Expected Performance Gains

| Metric | Current | After Phase 1 | After Phase 3 |
|--------|---------|---------------|---------------|
| Page navigation | 1-2s | 100-300ms | <100ms |
| Task completion | 500ms | 500ms | <50ms (optimistic) |
| Initial load | 2-3s | 1-2s | 800ms-1.5s |
| Database queries/min | ~1000 | ~400 | ~200 |

---

## 🛠️ Next Steps

**Immediate (today):**
1. Approve this plan
2. Install React Query
3. Create proof of concept on Tasks page

**This week:**
1. Implement Phase 1 (React Query + LocalStorage + Indexes)
2. Test on production with real usage
3. Measure performance gains

**Next week:**
1. Phase 2 (refactor all pages)
2. Phase 3 (optimistic updates)

---

## 📝 Notes

- **Breaking changes:** None (all changes are additive)
- **Migration:** Can be done incrementally (page by page)
- **Rollback:** Easy (remove React Query wrapper, revert to old fetch pattern)
- **Cost:** Zero additional infrastructure cost
- **Compatibility:** Works with existing Supabase/Prisma setup

---

**Bottom line:** React Query + LocalStorage + Indexes will make Zebi feel 5-10x faster with minimal risk and ~1 week of work.
