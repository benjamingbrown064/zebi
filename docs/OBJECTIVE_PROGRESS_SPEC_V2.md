# Objective Progress: Task Completion Model (V2 - Production Ready)

**Goal:** Objectives track progress based on completion of linked tasks, not manual numeric entries.

**Status:** Ready for implementation  
**Priority:** High  
**Estimated effort:** 4-5 days  
**Created:** 2026-03-09  
**Updated:** 2026-03-09 (v2 with reliability amendments)

---

## Executive Summary

**What we're building:**
- Auto-progress objectives calculate completion from unique linked tasks
- Progress updates asynchronously (fast writes, near-real-time UI)
- Explicit task deduplication prevents double-counting
- Users see clear explanations of how progress is calculated
- Backwards compatible with existing numeric objectives

**What we're NOT building (avoided risks):**
- ❌ Synchronous blocking recalculation on every task change
- ❌ In-memory cache dependency across serverless instances
- ❌ Ambiguous counting of tasks vs projects
- ❌ Silent AI task creation without review
- ❌ Conflating progress percentage with completion state

---

## Problem Statement

**Current state:**
- Objectives have manual numeric progress (targetValue/currentValue)
- Tasks link to objectives but don't affect progress
- Users track work in tasks but update progress separately
- Disconnect between execution and reporting
- App performance degrading

**User need:**
- Create objective → break into tasks → progress auto-updates
- Clear visibility: what's done vs what remains
- Fast, reliable, trustworthy

---

## Design Principles

1. **Async by default** - Writes commit fast, updates propagate quickly
2. **Source of truth** - Always calculate from current persisted data
3. **Deduplicate rigorously** - Count each task exactly once
4. **Explain changes** - Users understand why percentages shift
5. **Scalable** - Works with 10 tasks or 1000 tasks
6. **Backwards compatible** - Existing objectives keep working

---

## Data Model

### Objective Schema Changes

**Keep existing (for compatibility):**
```typescript
targetValue: Decimal?     // Optional (only for manual mode)
currentValue: Decimal?    // Optional (only for manual mode)
unit: string?             // Optional (only for manual mode)
metricType: string        // "completion" | "numeric" | "currency" | "percentage"
progressPercent: Decimal  // PERSISTED calculated field (source of truth)
```

**Add new:**
```typescript
progressMode: enum        // "auto" | "manual" (default: "auto" for new objectives)
completedTaskCount: int?  // Cached for display (recalculated)
totalTaskCount: int?      // Cached for display (recalculated)
lastProgressRecalc: DateTime?  // When progress was last updated
scopeChangeNote: string?  // Explanation if progress changed due to scope
```

**Indexes for performance:**
```sql
CREATE INDEX idx_objective_workspace_status ON "Objective"(workspaceId, status);
CREATE INDEX idx_task_objective_complete ON "Task"(objectiveId, completedAt) 
  WHERE objectiveId IS NOT NULL AND archivedAt IS NULL;
CREATE INDEX idx_task_project_complete ON "Task"(projectId, completedAt) 
  WHERE projectId IS NOT NULL AND archivedAt IS NULL;
CREATE INDEX idx_project_objective_active ON "Project"(objectiveId) 
  WHERE objectiveId IS NOT NULL AND archivedAt IS NULL;
```

---

## Progress Calculation Logic (Amended)

### Formula (MVP)

```typescript
progressPercent = (completed_unique_active_linked_tasks / total_unique_active_linked_tasks) * 100

Where:
- unique = deduplicated by task ID
- active = archivedAt IS NULL AND deletedAt IS NULL
- linked = direct objective tasks + tasks in active linked projects
- completed = completedAt IS NOT NULL
```

### Implementation (Production Safe)

```typescript
interface ProgressResult {
  totalTasks: number
  completedTasks: number
  progressPercent: number
  scopeChangeNote?: string  // NEW: Explain if scope changed
}

async function calculateObjectiveProgress(
  objectiveId: string,
  previousTotal?: number
): Promise<ProgressResult> {
  
  // Step 1: Get all unique task IDs (deduplication is CRITICAL)
  const directTaskIds = await prisma.task.findMany({
    where: {
      objectiveId,
      archivedAt: null,
    },
    select: { id: true, completedAt: true }
  })
  
  const linkedProjects = await prisma.project.findMany({
    where: {
      objectiveId,
      archivedAt: null,
    },
    select: { id: true }
  })
  
  const projectTaskIds = await prisma.task.findMany({
    where: {
      projectId: { in: linkedProjects.map(p => p.id) },
      archivedAt: null,
    },
    select: { id: true, completedAt: true }
  })
  
  // Step 2: DEDUPLICATE by task ID
  const allTasksMap = new Map<string, { id: string, completedAt: Date | null }>()
  
  for (const task of directTaskIds) {
    allTasksMap.set(task.id, task)
  }
  
  for (const task of projectTaskIds) {
    if (!allTasksMap.has(task.id)) {  // Only add if not already present
      allTasksMap.set(task.id, task)
    }
  }
  
  const uniqueTasks = Array.from(allTasksMap.values())
  
  // Step 3: Calculate
  const totalTasks = uniqueTasks.length
  const completedTasks = uniqueTasks.filter(t => t.completedAt !== null).length
  const progressPercent = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0
  
  // Step 4: Detect scope changes
  let scopeChangeNote: string | undefined
  if (previousTotal !== undefined && previousTotal !== totalTasks) {
    const delta = totalTasks - previousTotal
    if (delta > 0) {
      scopeChangeNote = `${delta} new task${delta > 1 ? 's' : ''} added`
    } else {
      scopeChangeNote = `${Math.abs(delta)} task${Math.abs(delta) > 1 ? 's' : ''} removed`
    }
  }
  
  return {
    totalTasks,
    completedTasks,
    progressPercent,
    scopeChangeNote
  }
}
```

### Optimized Version (Using Raw SQL for Speed)

```typescript
// For production: single query with deduplication
async function calculateObjectiveProgressOptimized(
  objectiveId: string
): Promise<ProgressResult> {
  
  const result = await prisma.$queryRaw<[{
    total_tasks: bigint
    completed_tasks: bigint
  }]>`
    WITH unique_tasks AS (
      SELECT DISTINCT ON (t.id)
        t.id,
        t.completed_at
      FROM "Task" t
      LEFT JOIN "Project" p ON t.project_id = p.id
      WHERE 
        (t.objective_id = ${objectiveId} OR 
         (p.objective_id = ${objectiveId} AND p.archived_at IS NULL))
        AND t.archived_at IS NULL
    )
    SELECT 
      COUNT(*) as total_tasks,
      COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed_tasks
    FROM unique_tasks
  `
  
  const totalTasks = Number(result[0].total_tasks)
  const completedTasks = Number(result[0].completed_tasks)
  const progressPercent = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0
  
  return { totalTasks, completedTasks, progressPercent }
}
```

---

## Event-Driven Recalculation (Critical Amendment)

**DO NOT recalculate synchronously in the task update transaction.**

### Architecture

```
Task Update Request
  ↓
[1] Update task (fast commit)
  ↓
[2] Emit recalculation event
  ↓
[3] Return success to user
  ↓
[Event Queue] ← Deduplicates within 2-second window
  ↓
[4] Recalculate progress (async)
  ↓
[5] Atomic write to objective
  ↓
[6] Broadcast update to UI (websocket/polling)
```

### Implementation

**Option A: Vercel Edge Functions + Upstash Queue (Recommended)**

```typescript
// app/api/tasks/[id]/route.ts
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  
  // 1. Update task (fast)
  const task = await prisma.task.update({
    where: { id: params.id },
    data: body,
    select: { id: true, objectiveId: true, projectId: true }
  })
  
  // 2. Determine affected objective(s)
  const objectiveIds = new Set<string>()
  
  if (task.objectiveId) {
    objectiveIds.add(task.objectiveId)
  }
  
  if (task.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      select: { objectiveId: true }
    })
    if (project?.objectiveId) {
      objectiveIds.add(project.objectiveId)
    }
  }
  
  // 3. Queue recalculation (async, deduplicated)
  for (const objectiveId of objectiveIds) {
    await queueProgressRecalculation(objectiveId)
  }
  
  // 4. Return immediately (user sees fast response)
  return NextResponse.json({ success: true, task })
}
```

**Queue implementation with deduplication:**

```typescript
// lib/progress-queue.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
})

const DEDUP_WINDOW_MS = 2000  // 2 seconds

export async function queueProgressRecalculation(objectiveId: string) {
  const key = `recalc:${objectiveId}`
  
  // Check if already queued recently
  const exists = await redis.get(key)
  if (exists) {
    console.log(`[Progress] Dedup: ${objectiveId} already queued`)
    return
  }
  
  // Mark as queued (with expiry)
  await redis.set(key, Date.now(), { px: DEDUP_WINDOW_MS })
  
  // Trigger background function
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/objectives/${objectiveId}/recalculate-progress`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.INTERNAL_API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  })
}
```

**Option B: Simple polling (MVP fallback if no queue)**

```typescript
// Client-side: Poll for updated progress after task change
async function completeTask(taskId: string) {
  await updateTask(taskId, { completedAt: new Date() })
  
  // Wait briefly then refetch objective
  setTimeout(async () => {
    await refetchObjective()
  }, 1500)
}
```

**Recalculation endpoint (authenticated, internal only):**

```typescript
// app/api/objectives/[id]/recalculate-progress/route.ts
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  // Auth check
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (token !== process.env.INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const objectiveId = params.id
  
  // Get previous values for scope change detection
  const objective = await prisma.objective.findUnique({
    where: { id: objectiveId },
    select: { totalTaskCount: true }
  })
  
  // Recalculate from source of truth
  const result = await calculateObjectiveProgressOptimized(objectiveId)
  
  // Detect scope changes
  let scopeChangeNote: string | undefined
  if (objective?.totalTaskCount && objective.totalTaskCount !== result.totalTasks) {
    const delta = result.totalTasks - objective.totalTaskCount
    if (delta > 0) {
      scopeChangeNote = `${delta} task${delta > 1 ? 's' : ''} added`
    } else {
      scopeChangeNote = `${Math.abs(delta)} task${Math.abs(delta) > 1 ? 's' : ''} removed`
    }
  }
  
  // Atomic write
  await prisma.objective.update({
    where: { id: objectiveId },
    data: {
      progressPercent: result.progressPercent,
      completedTaskCount: result.completedTasks,
      totalTaskCount: result.totalTasks,
      lastProgressRecalc: new Date(),
      scopeChangeNote: scopeChangeNote || null,
      updatedAt: new Date()
    }
  })
  
  return NextResponse.json({ 
    success: true, 
    progress: result,
    scopeChangeNote
  })
}
```

---

## Reliability Guardrails

### 1. Reconciliation Job (Safety Net)

```typescript
// app/api/cron/reconcile-progress/route.ts
export async function GET(req: Request) {
  // Auth: Vercel cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Recalculate all auto-progress objectives
  const objectives = await prisma.objective.findMany({
    where: { progressMode: 'auto' },
    select: { id: true }
  })
  
  let fixed = 0
  
  for (const obj of objectives) {
    try {
      const calculated = await calculateObjectiveProgressOptimized(obj.id)
      
      const current = await prisma.objective.findUnique({
        where: { id: obj.id },
        select: { progressPercent: true }
      })
      
      // Only update if different (avoid unnecessary writes)
      if (current && Math.abs(Number(current.progressPercent) - calculated.progressPercent) > 0.5) {
        await prisma.objective.update({
          where: { id: obj.id },
          data: {
            progressPercent: calculated.progressPercent,
            completedTaskCount: calculated.completedTasks,
            totalTaskCount: calculated.totalTasks,
            lastProgressRecalc: new Date()
          }
        })
        fixed++
      }
    } catch (err) {
      console.error(`[Reconcile] Failed for ${obj.id}:`, err)
    }
  }
  
  return NextResponse.json({ 
    success: true, 
    checked: objectives.length,
    fixed
  })
}
```

**Vercel cron config:**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/reconcile-progress",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### 2. Monitoring & Observability

```typescript
// lib/monitoring.ts
import { datadogLogs } from '@datadog/browser-logs'

export function trackProgressRecalculation(
  objectiveId: string,
  duration: number,
  taskCount: number,
  success: boolean,
  error?: Error
) {
  datadogLogs.logger.info('progress_recalculation', {
    objectiveId,
    duration,
    taskCount,
    success,
    error: error?.message,
    timestamp: new Date().toISOString()
  })
  
  // Alert if slow
  if (duration > 5000) {
    console.warn(`[Progress] Slow recalculation: ${objectiveId} took ${duration}ms`)
  }
}
```

**Metrics to track:**
- Recalculation duration (p50, p95, p99)
- Recalculation failure rate
- Queue depth (if using queue)
- Progress drift corrections (reconciliation job)
- Slow task update endpoints

### 3. Hard Limits for Large Objectives

```typescript
const MAX_TASKS_FAST_PREVIEW = 100
const MAX_TASKS_INLINE_CALC = 500

async function shouldUseQueuedRecalculation(objectiveId: string): Promise<boolean> {
  const count = await prisma.task.count({
    where: {
      OR: [
        { objectiveId },
        { project: { objectiveId, archivedAt: null } }
      ],
      archivedAt: null
    }
  })
  
  return count > MAX_TASKS_INLINE_CALC
}
```

---

## Separation of Progress and Completion

**Progress calculation:**
- Automatic based on task completion
- Always represents `completed / total`
- Can go up or down as scope changes

**Completion state:**
- User or system can mark objective as complete
- 100% progress does NOT automatically complete objective
- Allows for workflows like "all tasks done but waiting approval"

**Schema:**
```typescript
status: enum  // "active" | "on_track" | "at_risk" | "blocked" | "complete" | "cancelled"
completedAt: DateTime?  // When objective was marked complete (may differ from 100% progress)
```

**Logic:**
```typescript
// Reaching 100% does NOT auto-complete
if (progressPercent === 100) {
  // Suggest completion in UI, but don't force it
  showCompletionPrompt()
}

// Manual completion
async function completeObjective(objectiveId: string) {
  await prisma.objective.update({
    where: { id: objectiveId },
    data: {
      status: 'complete',
      completedAt: new Date()
    }
  })
}
```

---

## UI/UX Design (Amended)

### Objective Detail Page

**Header:**
```
┌─────────────────────────────────────────────────────┐
│ Launch New Product                        On Track  │
│                                                     │
│ Progress: 67% (16 of 24 tasks completed)           │
│ ████████████████████░░░░░░░░  67%                  │
│                                                     │
│ ℹ️ Progress is based on completed tasks linked to  │
│   this objective and tasks in linked projects.     │
│                                                     │
│ Due: Jun 1, 2026 (83 days remaining)               │
└─────────────────────────────────────────────────────┘
```

**Scope change notification (when visible):**
```
┌─────────────────────────────────────────────────────┐
│ ℹ️ Progress updated: 3 tasks added                  │
│   Progress recalculated from 71% to 67%            │
│   [Dismiss]                                        │
└─────────────────────────────────────────────────────┘
```

**Progress breakdown (expandable):**
```
┌─────────────────────────────────────────────────────┐
│ Progress Details ▼                                  │
│                                                     │
│ Direct Tasks:    8 / 10 completed (80%)            │
│ Project Tasks:   8 / 14 completed (57%)            │
│ ─────────────────────────────────────              │
│ Total (unique):  16 / 24 completed (67%)           │
│                                                     │
│ ℹ️ Tasks are counted once, even if linked both     │
│   directly and through a project.                  │
└─────────────────────────────────────────────────────┘
```

**Empty state:**
```
┌─────────────────────────────────────────────────────┐
│        No tasks yet                                 │
│                                                     │
│  Break this objective into tasks to track          │
│  progress automatically.                            │
│                                                     │
│  [ + Add Task ]  [ 🎤 AI Suggestions ]            │
└─────────────────────────────────────────────────────┘
```

**AI suggestion workflow (requires approval):**
```
Step 1: User clicks "AI Suggestions"

┌─────────────────────────────────────────────────────┐
│ AI-Suggested Breakdown                              │
│                                                     │
│ I suggest 3 projects:                              │
│                                                     │
│ Backend Development (6 tasks)                      │
│  ✓ Setup Express server                            │
│  ✓ Configure database                              │
│  ✓ Implement auth                                  │
│  ○ Build REST API                                  │
│  ○ Add validation                                  │
│  ○ Write tests                                     │
│                                                     │
│ Frontend (8 tasks)                                 │
│  ✓ Setup React                                     │
│  ...                                               │
│                                                     │
│ Testing & Launch (10 tasks)                       │
│  ...                                               │
│                                                     │
│ Total: 24 tasks across 3 projects                 │
│                                                     │
│  [ ✏️ Edit ] [ ✅ Approve & Create ] [ ✖ Cancel ]  │
└─────────────────────────────────────────────────────┘

Step 2: User approves → tasks created → progress updates
```

**Migration UI (manual → auto):**
```
┌─────────────────────────────────────────────────────┐
│ Switch to Task-Based Progress?                     │
│                                                     │
│ Current mode: Manual numeric tracking              │
│ Current progress: 67% (67 / 100 customers)         │
│                                                     │
│ New mode: Task completion tracking                 │
│ New progress: Will be calculated from linked tasks │
│                                                     │
│ What will change:                                  │
│ ✓ Progress updates automatically when tasks done   │
│ ✓ No more manual progress entries                  │
│ ⚠️ Progress percentage may change after switch     │
│                                                     │
│ What stays:                                        │
│ ✓ Your current numeric values (67/100) will be     │
│   kept for reference                               │
│                                                     │
│  [ Switch to Auto Progress ] [ Keep Manual ]      │
└─────────────────────────────────────────────────────┘
```

---

## API Design (Updated)

### GET /api/objectives/[id]

```typescript
Response:
{
  success: true,
  objective: {
    id: "obj-123",
    title: "Launch new product",
    progressMode: "auto",
    progressPercent: 67,
    completedTaskCount: 16,
    totalTaskCount: 24,
    lastProgressRecalc: "2026-03-09T19:32:00Z",
    scopeChangeNote: null,  // or "3 tasks added"
    status: "on_track",
    deadline: "2026-06-01",
    
    // Standard fields
    company: { ... },
    projects: [...],
    tasks: [...]
  }
}
```

### GET /api/objectives/[id]?includeBreakdown=true

```typescript
Response:
{
  success: true,
  objective: { ... },
  progressBreakdown: {
    totalTasks: 24,
    completedTasks: 16,
    progressPercent: 67,
    
    // Detailed breakdown
    directTasks: {
      total: 10,
      completed: 8,
      tasks: [
        { id: "t1", title: "Setup infra", completedAt: "..." },
        ...
      ]
    },
    projectTasks: {
      total: 14,
      completed: 8,
      byProject: [
        {
          projectId: "p1",
          projectName: "Backend",
          total: 6,
          completed: 3
        },
        ...
      ]
    },
    
    // Deduplication info
    duplicateCount: 0,  // Should always be 0
    uniqueTaskIds: 24
  }
}
```

### POST /api/objectives/[id]/recalculate-progress

```typescript
// Internal only (INTERNAL_API_TOKEN required)
Response:
{
  success: true,
  objective: {
    id: "obj-123",
    progressPercent: 67,
    completedTaskCount: 16,
    totalTaskCount: 24,
    updatedAt: "2026-03-09T19:32:00Z"
  },
  scopeChangeNote: "3 tasks added",  // if scope changed
  duration: 87  // ms
}
```

### PATCH /api/tasks/[id]

```typescript
// Now triggers async progress recalculation
Request:
{ completedAt: "2026-03-09T19:32:00Z" }

Response:
{
  success: true,
  task: { ... },
  affectedObjectives: ["obj-123"],  // NEW: which objectives will recalculate
  note: "Progress will update in a moment"
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('calculateObjectiveProgress with deduplication', () => {
  it('deduplicates task linked both directly and via project', async () => {
    // Setup: 
    // - Task T1 directly linked to objective
    // - Task T1 also in project P1
    // - Project P1 linked to objective
    const result = await calculateObjectiveProgress(objectiveId)
    
    expect(result.totalTasks).toBe(1)  // Not 2
  })
  
  it('excludes archived tasks', async () => {
    // 5 active, 2 archived
    const result = await calculateObjectiveProgress(objectiveId)
    expect(result.totalTasks).toBe(5)
  })
  
  it('detects scope changes', async () => {
    const previous = await calculateObjectiveProgress(objectiveId)
    await createTask({ objectiveId })
    const updated = await calculateObjectiveProgress(objectiveId, previous.totalTasks)
    
    expect(updated.scopeChangeNote).toContain('1 task added')
  })
})
```

### Integration Tests

```typescript
describe('Event-driven recalculation', () => {
  it('updates progress after task completion', async () => {
    const task = await createTask({ objectiveId })
    
    // Complete task
    await completeTask(task.id)
    
    // Wait for async recalculation
    await sleep(3000)
    
    // Check progress updated
    const objective = await getObjective(objectiveId)
    expect(objective.progressPercent).toBeGreaterThan(0)
  })
})
```

### Performance Tests

```typescript
describe('Performance', () => {
  it('calculates progress in < 100ms (small objective)', async () => {
    // 20 tasks
    const start = Date.now()
    await calculateObjectiveProgressOptimized(objectiveId)
    expect(Date.now() - start).toBeLessThan(100)
  })
  
  it('calculates progress in < 500ms (large objective)', async () => {
    // 500 tasks
    const start = Date.now()
    await calculateObjectiveProgressOptimized(objectiveId)
    expect(Date.now() - start).toBeLessThan(500)
  })
})
```

---

## Migration Strategy

### Phase 1: Foundation (Week 1)
- [ ] Add schema fields (progressMode, completedTaskCount, etc.)
- [ ] Add database indexes
- [ ] Implement calculation function with deduplication
- [ ] Deploy schema migration

### Phase 2: Backend (Week 2)
- [ ] Implement event queue or debouncing
- [ ] Add recalculation endpoint
- [ ] Update task completion API
- [ ] Add reconciliation cron job
- [ ] Add monitoring/logging
- [ ] Performance testing

### Phase 3: Frontend (Week 3)
- [ ] Update objective detail page UI
- [ ] Add progress breakdown component
- [ ] Add scope change notifications
- [ ] Add migration UI (manual → auto)
- [ ] Add AI suggestion workflow (approval required)
- [ ] Mobile responsive

### Phase 4: Launch (Week 4)
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Fix bugs
- [ ] Deploy to production
- [ ] Monitor metrics
- [ ] Gather feedback

---

## Success Metrics

**Technical:**
- ✅ Task update response < 200ms (p95)
- ✅ Progress recalculation < 500ms (p95)
- ✅ Zero double-counting bugs
- ✅ 99.9% uptime

**User Experience:**
- ✅ 80%+ of new objectives use auto-progress
- ✅ <1% user confusion about progress changes
- ✅ Positive feedback on clarity
- ✅ Zero performance complaints

**Business:**
- ✅ Foundation for AI suggestions
- ✅ Foundation for voice input
- ✅ Improved task completion rates

---

## What Changed from V1

1. **Async recalculation** - Removed synchronous blocking logic
2. **No in-memory cache** - Persisted progressPercent is source of truth
3. **Explicit deduplication** - Count each task exactly once
4. **Scope change explanations** - UI explains progress drops
5. **Separated completion** - 100% ≠ auto-complete
6. **Reconciliation job** - Safety net for missed updates
7. **Hard limits** - Protection for large objectives
8. **Monitoring** - Observability requirements added
9. **AI approval workflow** - No silent task creation
10. **Stronger migration UX** - Clear explanations

---

## Open Questions

- ❓ Use Upstash queue or simple polling for MVP? → **Polling for MVP, queue later**
- ❓ Reconciliation frequency? → **Every 6 hours**
- ❓ Alert threshold for slow recalculation? → **> 5 seconds**
- ❓ Max tasks before forcing queued recalc? → **500 tasks**

---

## Risks & Mitigation

**Risk 1: Async delay feels broken**
- Mitigation: Optimistic UI updates
- Mitigation: "Updating..." indicator
- Mitigation: Target <3 second actual delay

**Risk 2: Deduplication bugs**
- Mitigation: Comprehensive tests
- Mitigation: Reconciliation job catches drift
- Mitigation: Breakdown UI exposes counting logic

**Risk 3: Performance at scale**
- Mitigation: Indexes
- Mitigation: Hard limits
- Mitigation: Queue for large objectives

**Risk 4: User confusion on migration**
- Mitigation: Clear explanation UI
- Mitigation: Preview new progress before commit
- Mitigation: Allow rollback

---

**End of spec**
