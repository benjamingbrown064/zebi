# Performance Optimization - Phase 2 Implementation Plan

**Date Started:** 2026-03-15  
**Status:** 🚧 IN PROGRESS  
**Phase:** 2 of 2

---

## 🎯 Phase 2 Objectives

### 1. WebSockets for Real-time Updates ⏳
- Replace server-side revalidation (5s) with Supabase Realtime
- Implement for: tasks, projects, objectives
- **Goal:** Zero polling, instant collaboration

### 2. React Query Optimization ⏳
- Already installed ✅ - just needs optimization
- Implement smart caching strategies
- Add optimistic UI updates
- **Goal:** Reduce redundant API calls by 70%

### 3. Virtual Scrolling ⏳
- Install react-window
- Apply to task list and board view
- **Goal:** Handle 10,000+ tasks smoothly

### 4. Static Data Caching ⏳
- Cache statuses, tags, areas in localStorage
- Implement cache invalidation strategy
- **Goal:** Eliminate repeated static data queries

---

## 📊 Current State Analysis

### React Query Status
- ✅ Installed: @tanstack/react-query v5.90.21
- ✅ Provider configured with sensible defaults:
  - staleTime: 30s
  - gcTime: 5min
  - retry: 1
  - refetchOnWindowFocus: false

### Polling Status
- Board: Server-side revalidation every 5s
- Tasks: Client-side data fetching (no interval polling detected)
- Dashboard: Server-side revalidation every 5s

### Current Dependencies
```json
{
  "@supabase/supabase-js": "^2.38.0",
  "@tanstack/react-query": "^5.90.21"
}
```

---

## 🚀 Implementation Steps

### Step 1: Supabase Realtime Setup
**Files to create:**
- `/lib/realtime/useRealtimeSubscription.ts` - Generic realtime hook
- `/lib/realtime/useRealtimeTasks.ts` - Tasks realtime hook
- `/lib/realtime/useRealtimeProjects.ts` - Projects realtime hook

**Files to modify:**
- `/app/board/page.tsx` - Remove revalidate, add realtime
- `/app/dashboard/page.tsx` - Remove revalidate, add realtime
- `/components/providers/QueryProvider.tsx` - Update cache settings

### Step 2: React Query Optimization
**Files to create:**
- `/lib/queries/tasks.ts` - Task query keys and functions
- `/lib/queries/projects.ts` - Project query keys
- `/lib/queries/statuses.ts` - Static data queries

**Files to modify:**
- `/app/tasks/page.tsx` - Use optimized queries
- `/app/board/client.tsx` - Use optimized queries

### Step 3: Virtual Scrolling
**Dependencies to add:**
- `react-window`
- `@types/react-window`

**Files to create:**
- `/components/VirtualTaskList.tsx`
- `/components/VirtualBoardColumn.tsx`

### Step 4: Static Data Caching
**Files to create:**
- `/lib/cache/staticDataCache.ts`
- `/lib/cache/useStaticData.ts`

---

## 📈 Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Real-time latency | 5s (revalidation) | <500ms | 90% ⬇ |
| Redundant API calls | High | Low | 70% ⬇ |
| Large list rendering | Laggy (1000+ items) | Smooth (10,000+) | 90% ⬆ |
| Static data queries | Every page load | Once per session | 95% ⬇ |
| Network traffic | High | Low | 60% ⬇ |

---

## 🔐 Security Checklist

- [ ] Realtime subscriptions respect RLS policies
- [ ] All queries include workspaceId filtering
- [ ] Cache invalidation prevents stale cross-workspace data
- [ ] No sensitive data in localStorage

---

## ✅ Testing Checklist

- [ ] Realtime updates work across multiple tabs
- [ ] Optimistic updates rollback on error
- [ ] Virtual scrolling handles 10,000+ items
- [ ] Static cache invalidates on workspace switch
- [ ] All existing tests pass
- [ ] RLS verification script passes

---

## 📝 Progress Log

### 2026-03-15 06:50 - Phase 2 Started
- Analyzed codebase structure
- React Query already installed ✅
- Supabase client configured ✅
- Created implementation plan
- **Next:** Implement Supabase Realtime subscriptions
