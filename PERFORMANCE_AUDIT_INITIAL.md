# Performance Audit - Initial Findings

**Date:** 2026-03-07  
**Project:** Zebi App  
**Status:** Audit in Progress

---

## 🔍 Critical Performance Issues Identified

### 1. **Board Page (`/board`) - CRITICAL**
- **Issue:** Loading ALL tasks with no pagination/limits
- **Query:** `prisma.task.findMany({ where: { workspaceId, archivedAt: null }, include: { tags: { include: { tag: true } } } })`
- **Impact:** With 100+ tasks, this loads everything into memory
- **Fix:** Add pagination, lazy loading, or virtual scrolling

### 2. **Tasks Page (`/tasks`) - CRITICAL**
- **Issue 1:** Fetching ALL tasks every 5 seconds
- **Issue 2:** Also fetching goals and statuses every 5 seconds
- **Impact:** Constant database load, unnecessary network traffic
- **Fix:** Add pagination, increase poll interval, use WebSockets or SSE for updates

### 3. **Dashboard Page (`/dashboard`) - MEDIUM**
- **Issue:** Projects query includes ALL tasks per project
- **Query:** `include: { tasks: { where: { archivedAt: null }, select: { id, completedAt } } }`
- **Impact:** If projects have 100+ tasks each, this multiplies quickly
- **Fix:** Add `take` limit or use aggregation query

### 4. **Missing Database Indexes - HIGH**
**Columns frequently filtered/sorted but not indexed:**
- `Task.archivedAt` - filtered on almost every query
- `Task.assigneeId` - used for user task queries
- `Task.createdAt` - used for sorting (only has composite indexes)
- `Task.updatedAt` - used for sorting
- `Project.archivedAt` - filtered frequently
- `Project.createdAt` - used for sorting

**Composite indexes needed:**
- `Task(workspaceId, archivedAt, statusId)` - for board queries
- `Task(workspaceId, archivedAt, createdAt)` - for task list queries
- `Task(workspaceId, todayPinDate, todayOrder)` - for dashboard today view

### 5. **Tag Operations - LOW**
- **Issue:** Sequential tag creation/updates in loops
- **Location:** `app/actions/tasks.ts` in `createTask()` and `updateTask()`
- **Impact:** Minor N+1 query pattern
- **Fix:** Batch tag operations or use `createMany`

---

## 📊 Query Analysis

### Most Common Query Patterns
1. **Board view:** `WHERE workspaceId = X AND archivedAt IS NULL` (needs composite index)
2. **Task list:** `WHERE workspaceId = X AND archivedAt IS NULL ORDER BY createdAt DESC`
3. **Dashboard today:** `WHERE workspaceId = X AND todayPinDate >= TODAY`
4. **Project tasks:** `WHERE projectId = X AND archivedAt IS NULL`

---

## 🎯 Optimization Plan

### Phase 1: Database Indexes (30 min)
✅ Add missing single-column indexes
✅ Add composite indexes for common queries
✅ Create and apply Prisma migration

### Phase 2: Query Optimization (1 hour)
- Add pagination to board page
- Add pagination to tasks list
- Limit dashboard project task includes
- Optimize tag operations

### Phase 3: Frontend Optimization (1 hour)
- Reduce polling frequency (5s → 30s or use WebSockets)
- Implement virtual scrolling for large lists
- Add proper React memoization
- Cache static data (statuses)

### Phase 4: Testing & Verification (30 min)
- Test RLS policies still work
- Measure before/after load times
- Verify all functionality intact

---

## 🚨 Security Note
- All optimizations MUST preserve RLS policies
- Workspace isolation MUST remain intact
- Auth middleware MUST continue to work

---

**Next Steps:**
1. Create Prisma migration with new indexes
2. Test migration on development database
3. Apply query optimizations
4. Measure improvements
