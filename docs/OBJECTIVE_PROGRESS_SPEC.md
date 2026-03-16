# Objective Progress: Task/Project Completion Model

**Goal:** Objectives track progress based on completion of linked tasks and projects, not manual numeric entries.

**Status:** Planning  
**Priority:** High  
**Estimated effort:** 3-4 days  
**Created:** 2026-03-09

---

## Problem Statement

**Current state:**
- Objectives have manual numeric progress (targetValue/currentValue)
- Tasks and projects link to objectives but don't affect progress
- Users track work in tasks but progress updates separately
- Disconnect between execution (tasks) and reporting (progress)
- App performance degrading (mentioned by user)

**What users want:**
- Create objective → AI suggests breakdown → User refines via voice
- Progress auto-updates as tasks complete
- Objective "done" when all tasks done
- Fast, reliable, intuitive

---

## Design Principles

1. **Automatic by default** - Progress updates without manual intervention
2. **Fast calculations** - Sub-100ms response times
3. **Conflict-free** - No race conditions on concurrent task updates
4. **Backwards compatible** - Existing objectives continue working
5. **User trust** - Clear visibility into how progress is calculated

---

## Data Model

### Objective Schema Changes

**Keep existing fields (for backwards compatibility):**
```typescript
targetValue: Decimal      // NOW OPTIONAL (only for numeric objectives)
currentValue: Decimal     // NOW OPTIONAL
unit: string             // NOW OPTIONAL
metricType: string       // "completion" | "numeric" | "currency" | "percentage"
progressPercent: Decimal // Calculated field (never manually set)
```

**Add new fields:**
```typescript
progressMode: enum       // "auto" | "manual" (default: "auto")
completedAt: DateTime?   // When objective reached 100%
```

**Add index for performance:**
```sql
CREATE INDEX idx_objective_workspace_status ON "Objective"(workspaceId, status);
CREATE INDEX idx_task_objective_status ON "Task"(objectiveId, completedAt) WHERE objectiveId IS NOT NULL;
CREATE INDEX idx_project_objective ON "Project"(objectiveId) WHERE objectiveId IS NOT NULL;
```

### Task Schema (no changes needed)
```typescript
objectiveId: string?     // Link to objective
projectId: string?       // Link to project
completedAt: DateTime?   // Task completion timestamp
archivedAt: DateTime?    // Soft delete
```

### Project Schema (no changes needed)
```typescript
objectiveId: string?     // Link to objective
archivedAt: DateTime?    // Soft delete
```

---

## Progress Calculation Logic

### Auto Mode (completion-based)

```typescript
interface ProgressCalculation {
  totalTasks: number
  completedTasks: number
  progressPercent: number
  
  // Breakdown by source
  directTasks: { total: number, completed: number }
  projectTasks: { total: number, completed: number }
}

function calculateObjectiveProgress(objectiveId: string): ProgressCalculation {
  // 1. Count direct tasks (tasks directly linked to objective)
  const directTasks = await prisma.task.findMany({
    where: {
      objectiveId,
      archivedAt: null,
    },
    select: {
      id: true,
      completedAt: true,
    }
  })
  
  // 2. Count project tasks (tasks linked to projects under this objective)
  const projects = await prisma.project.findMany({
    where: {
      objectiveId,
      archivedAt: null,
    },
    select: { id: true }
  })
  
  const projectTasks = await prisma.task.findMany({
    where: {
      projectId: { in: projects.map(p => p.id) },
      archivedAt: null,
    },
    select: {
      id: true,
      completedAt: true,
    }
  })
  
  // 3. Combine and calculate
  const allTasks = [...directTasks, ...projectTasks]
  const totalTasks = allTasks.length
  const completedTasks = allTasks.filter(t => t.completedAt !== null).length
  
  const progressPercent = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0
  
  return {
    totalTasks,
    completedTasks,
    progressPercent,
    directTasks: {
      total: directTasks.length,
      completed: directTasks.filter(t => t.completedAt).length
    },
    projectTasks: {
      total: projectTasks.length,
      completed: projectTasks.filter(t => t.completedAt).length
    }
  }
}
```

**Performance optimization:**
- Use aggregation instead of fetching all records
- Cache calculation results for 30 seconds
- Only recalculate on task completion/uncomplete events

**Optimized version:**
```typescript
// Uses Prisma aggregation (faster)
async function calculateObjectiveProgressOptimized(objectiveId: string) {
  const [directCount, projectIds] = await Promise.all([
    // Count direct tasks
    prisma.task.aggregate({
      where: { objectiveId, archivedAt: null },
      _count: { id: true },
    }),
    // Get project IDs
    prisma.project.findMany({
      where: { objectiveId, archivedAt: null },
      select: { id: true }
    })
  ])
  
  const [directCompleted, projectCount, projectCompleted] = await Promise.all([
    // Count completed direct tasks
    prisma.task.count({
      where: { objectiveId, archivedAt: null, completedAt: { not: null } }
    }),
    // Count project tasks
    prisma.task.count({
      where: { projectId: { in: projectIds.map(p => p.id) }, archivedAt: null }
    }),
    // Count completed project tasks
    prisma.task.count({
      where: { 
        projectId: { in: projectIds.map(p => p.id) }, 
        archivedAt: null, 
        completedAt: { not: null } 
      }
    })
  ])
  
  const totalTasks = directCount._count.id + projectCount
  const completedTasks = directCompleted + projectCompleted
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  
  return { totalTasks, completedTasks, progressPercent }
}
```

### Manual Mode (numeric-based)

For backwards compatibility and metric-based objectives (revenue, users, etc.):

```typescript
// Keep existing behavior
progressPercent = (currentValue / targetValue) * 100
```

---

## Update Triggers

**When to recalculate progress:**

1. **Task completed** → Recalculate objective progress
2. **Task uncompleted** → Recalculate objective progress
3. **Task created/deleted** → Recalculate objective progress
4. **Task linked/unlinked to objective** → Recalculate both objectives
5. **Project linked/unlinked to objective** → Recalculate objective progress
6. **Task archived/unarchived** → Recalculate objective progress

**Implementation: Background job vs Real-time**

Option A: Real-time (chosen for user trust)
```typescript
// In task update API
await updateTask(taskId, { completedAt: new Date() })

// Immediate recalculation
if (task.objectiveId || task.projectId) {
  const objectiveId = task.objectiveId || task.project.objectiveId
  if (objectiveId) {
    await recalculateObjectiveProgress(objectiveId)
  }
}
```

Option B: Background job (better for scale, but adds delay)
```typescript
// Queue recalculation job
await queueJob('recalculate-objective-progress', { objectiveId })
```

**Decision: Use real-time with 30-second cache**
- Progress updates feel instant
- Cache prevents duplicate calculations
- Fast enough for current scale (<1000 objectives)

---

## API Design

### New endpoint: Calculate and update progress

```typescript
POST /api/objectives/[id]/recalculate-progress

Response:
{
  success: true,
  objective: {
    id: "...",
    progressPercent: 67,
    totalTasks: 24,
    completedTasks: 16,
    breakdown: {
      directTasks: { total: 10, completed: 8 },
      projectTasks: { total: 14, completed: 8 }
    },
    updatedAt: "2026-03-09T19:32:00Z"
  }
}
```

### Update task completion endpoint

```typescript
PATCH /api/tasks/[id]
Body: { completedAt: "2026-03-09T19:32:00Z" | null }

// Auto-triggers objective recalculation
Response:
{
  success: true,
  task: { ... },
  affectedObjectives: [
    {
      id: "obj-123",
      progressPercent: 67,
      totalTasks: 24,
      completedTasks: 16
    }
  ]
}
```

### Get objective with progress details

```typescript
GET /api/objectives/[id]?includeProgressBreakdown=true

Response:
{
  success: true,
  objective: {
    id: "...",
    title: "Launch new product",
    progressMode: "auto",
    progressPercent: 67,
    status: "on_track",
    
    // New: progress breakdown
    progressBreakdown: {
      totalTasks: 24,
      completedTasks: 16,
      directTasks: { total: 10, completed: 8 },
      projectTasks: { total: 14, completed: 8 }
    },
    
    // Standard fields
    deadline: "2026-06-01",
    company: { ... },
    projects: [...],
    tasks: [...]
  }
}
```

---

## UI/UX Design

### Objective Detail Page

**Header section:**
```
┌─────────────────────────────────────────────────────┐
│ Launch New Product                                  │
│ Progress: 67% (16 of 24 tasks completed)           │
│                                                     │
│ ████████████████████░░░░░░░░  67%                  │
│                                                     │
│ Due: Jun 1, 2026 (83 days remaining)               │
└─────────────────────────────────────────────────────┘
```

**Progress breakdown card (expandable):**
```
┌─────────────────────────────────────────────────────┐
│ Progress Details ▼                                  │
│                                                     │
│ Direct Tasks:    8 / 10 completed (80%)            │
│ Project Tasks:   8 / 14 completed (57%)            │
│                                                     │
│ Total:          16 / 24 completed (67%)            │
└─────────────────────────────────────────────────────┘
```

**Task list grouped by project:**
```
┌─────────────────────────────────────────────────────┐
│ Tasks (24)                                          │
│                                                     │
│ ✓ Setup infrastructure                             │
│ ✓ Design database schema                           │
│ ○ Implement API endpoints                          │
│ ○ Build frontend                                   │
│                                                     │
│ Project: Backend Development (3/6 tasks)           │
│   ✓ Setup Express server                           │
│   ✓ Configure database                             │
│   ✓ Implement auth                                 │
│   ○ Build REST API                                 │
│   ○ Add validation                                 │
│   ○ Write tests                                    │
│                                                     │
│ Project: Frontend (5/8 tasks)                      │
│   ✓ Setup React app                                │
│   ✓ Design components                              │
│   ...                                              │
└─────────────────────────────────────────────────────┘
```

**Empty state (no tasks yet):**
```
┌─────────────────────────────────────────────────────┐
│        No tasks yet                                 │
│                                                     │
│  Break down this objective into tasks              │
│  to track progress automatically.                  │
│                                                     │
│  [ + Add Task ]  [ 🎤 AI Suggestions ]            │
└─────────────────────────────────────────────────────┘
```

### Objectives List Page

**Card view with progress:**
```
┌───────────────────────────────────┐
│ Launch New Product                │
│ ████████████████░░░░░  67%        │
│ 16/24 tasks • Due Jun 1           │
└───────────────────────────────────┘
```

### Task Detail Page

**Show objective impact:**
```
┌─────────────────────────────────────────────────────┐
│ Task: Build REST API                                │
│                                                     │
│ Objective: Launch New Product                      │
│ Completing this task will increase progress to 71% │
│                                                     │
│ [ Mark Complete ]                                  │
└─────────────────────────────────────────────────────┘
```

---

## User Workflows

### Workflow 1: Create new objective with AI breakdown

**Step 1: Create objective**
```
User: "Create objective: Launch new product by June 1st"
System: Creates objective with progressMode="auto"
```

**Step 2: AI suggests breakdown**
```
System: "I've created your objective. Would you like me to suggest 
         a breakdown into projects and tasks?"

User: "Yes"

System: *Calls AI to generate breakdown*
        "I suggest 3 projects:
         1. Backend Development (6 tasks)
         2. Frontend Development (8 tasks)
         3. Testing & Launch (10 tasks)
         
         Total: 24 tasks
         
         Review and edit in the objective detail page."
```

**Step 3: User refines via voice**
```
User: 🎤 "Add a task to set up CI/CD pipeline under Backend Development"

System: "Added task 'Set up CI/CD pipeline' to Backend Development project.
         Objective now has 25 tasks total."
```

**Step 4: Work progresses**
```
User: Completes task "Setup Express server"
System: Updates objective progress: 0% → 4% (1/25 tasks)
```

### Workflow 2: Link existing tasks to objective

**Step 1: User has orphan tasks**
```
Tasks:
- Build API (no objective)
- Design UI (no objective)
- Write tests (no objective)
```

**Step 2: Create objective and link tasks**
```
User: Creates "Launch MVP" objective
User: Bulk-selects tasks → "Link to Launch MVP"
System: 0/3 tasks → Progress: 0%
```

**Step 3: Complete tasks**
```
User: Completes "Build API"
System: 1/3 tasks → Progress: 33%
```

### Workflow 3: Migrate existing numeric objective

**Existing objective:**
```
Title: "Reach 100 customers"
progressMode: "manual"
targetValue: 100
currentValue: 67
progressPercent: 67
```

**User wants task-based tracking:**
```
User: Clicks "Switch to task-based progress"

System: Shows warning:
        "This will switch to tracking completion of tasks instead
         of manual numeric values. Current progress (67%) will be
         preserved but won't auto-update.
         
         Continue?"

User: Confirms

System: 
- Sets progressMode = "auto"
- Keeps currentValue/targetValue for reference
- Recalculates progress from linked tasks
- Updates progressPercent based on task completion
```

---

## Performance Optimizations

### Problem: App getting slow

**Identified bottlenecks:**

1. **Heavy queries fetching all relations**
   - Solution: Use `select` to only fetch needed fields
   - Solution: Implement pagination (limit/offset)
   - Solution: Add database indexes

2. **N+1 query problems**
   - Solution: Use Prisma `include` for eager loading
   - Solution: DataLoader pattern for repeated queries

3. **Recalculating progress on every page load**
   - Solution: Store `progressPercent` in database
   - Solution: Only recalculate on task changes
   - Solution: Cache results for 30 seconds

### Implementation: Caching layer

```typescript
// Simple in-memory cache with TTL
const progressCache = new Map<string, {
  data: ProgressCalculation
  expiresAt: number
}>()

async function getObjectiveProgress(objectiveId: string): Promise<ProgressCalculation> {
  const cached = progressCache.get(objectiveId)
  const now = Date.now()
  
  if (cached && cached.expiresAt > now) {
    return cached.data
  }
  
  const data = await calculateObjectiveProgressOptimized(objectiveId)
  
  progressCache.set(objectiveId, {
    data,
    expiresAt: now + 30_000 // 30 seconds
  })
  
  return data
}

function invalidateProgressCache(objectiveId: string) {
  progressCache.delete(objectiveId)
}
```

### Database query optimizations

**Before (slow):**
```typescript
const objective = await prisma.objective.findUnique({
  where: { id },
  include: {
    company: true,
    goal: true,
    milestones: true,
    progressEntries: true,
    blockers: true,
    projects: {
      include: {
        tasks: true
      }
    },
    tasks: {
      include: {
        status: true,
        project: true
      }
    }
  }
})
// Fetches 100+ records, slow join
```

**After (fast):**
```typescript
const objective = await prisma.objective.findUnique({
  where: { id },
  select: {
    id: true,
    title: true,
    progressPercent: true,
    deadline: true,
    status: true,
    company: {
      select: { id: true, name: true }
    },
    projects: {
      where: { archivedAt: null },
      select: { id: true, name: true }
    }
  }
})
// Minimal fields, much faster
```

**For progress calculation:**
```typescript
// Use COUNT aggregation instead of fetching all records
const result = await prisma.$queryRaw`
  SELECT 
    COUNT(*) FILTER (WHERE completed_at IS NULL) as incomplete_tasks,
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed_tasks,
    COUNT(*) as total_tasks
  FROM "Task"
  WHERE 
    (objective_id = ${objectiveId} OR project_id IN (
      SELECT id FROM "Project" WHERE objective_id = ${objectiveId} AND archived_at IS NULL
    ))
    AND archived_at IS NULL
`
// Single query, super fast
```

### Response time targets

- Objective list page: < 200ms
- Objective detail page: < 300ms
- Task completion: < 150ms (including progress update)
- Progress recalculation: < 100ms

---

## Edge Cases & Validation

### Edge Case 1: No tasks linked
```
Objective: "Launch product"
Tasks: 0
Progress: 0%
Status: "Not started - no tasks defined"
```

### Edge Case 2: All tasks completed
```
Tasks: 24 total, 24 completed
Progress: 100%
Auto-set: completedAt = now()
Status: "complete"
```

### Edge Case 3: Task unlinked from objective
```
Before: 10 tasks (5 completed) → 50%
Unlink 1 completed task
After: 9 tasks (4 completed) → 44%
```

### Edge Case 4: Project deleted with tasks
```
Project has 10 tasks (5 completed)
User deletes project
Decision: Archive tasks (don't delete)
Result: Progress recalculates without those tasks
```

### Edge Case 5: Circular references
```
Invalid: Objective A → Project B → Objective A
Validation: Reject project assignment if creates cycle
```

### Edge Case 6: Mixed mode (some auto, some manual)
```
Workspace has:
- 10 auto-progress objectives (task-based)
- 5 manual-progress objectives (numeric)

System handles both simultaneously (progressMode field)
```

---

## Migration Strategy

### Phase 1: Additive changes only (safe)

1. Add new fields to schema (nullable, with defaults)
2. Add new indexes
3. Deploy database migration
4. Add progress calculation functions (don't use yet)
5. Add cache layer
6. Test on staging

### Phase 2: Enable for new objectives

1. New objectives default to progressMode="auto"
2. Existing objectives stay progressMode="manual"
3. Monitor performance
4. Fix issues

### Phase 3: Gradual migration

1. Add UI toggle: "Switch to task-based progress"
2. Users opt-in to migrate
3. System recalculates on migration
4. Preserve old values in metadata

### Phase 4: Optimize

1. Monitor slow queries (enable Prisma query logging)
2. Add missing indexes
3. Tune cache TTL
4. Implement background recalculation for large objectives (>100 tasks)

### Migration script

```typescript
// Run once after schema migration
async function migrateExistingObjectives() {
  const objectives = await prisma.objective.findMany({
    where: { progressMode: null }
  })
  
  for (const objective of objectives) {
    // Determine mode based on usage
    const hasNumericTarget = objective.targetValue > 0
    const hasTasks = await prisma.task.count({
      where: { 
        OR: [
          { objectiveId: objective.id },
          { project: { objectiveId: objective.id } }
        ]
      }
    }) > 0
    
    const mode = hasTasks && !hasNumericTarget ? 'auto' : 'manual'
    
    await prisma.objective.update({
      where: { id: objective.id },
      data: { progressMode: mode }
    })
  }
  
  console.log(`Migrated ${objectives.length} objectives`)
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('calculateObjectiveProgress', () => {
  it('calculates 0% when no tasks', async () => {
    const result = await calculateObjectiveProgress(objectiveId)
    expect(result.progressPercent).toBe(0)
  })
  
  it('calculates 50% when half tasks completed', async () => {
    // Setup: 4 tasks, 2 completed
    const result = await calculateObjectiveProgress(objectiveId)
    expect(result.progressPercent).toBe(50)
  })
  
  it('includes project tasks in calculation', async () => {
    // Setup: 5 direct tasks, 5 project tasks
    const result = await calculateObjectiveProgress(objectiveId)
    expect(result.totalTasks).toBe(10)
  })
  
  it('excludes archived tasks', async () => {
    // Setup: 5 active, 2 archived
    const result = await calculateObjectiveProgress(objectiveId)
    expect(result.totalTasks).toBe(5)
  })
})
```

### Integration Tests

```typescript
describe('Task completion flow', () => {
  it('updates objective progress when task completed', async () => {
    // Create objective with 2 tasks
    const objective = await createTestObjective()
    const task = await createTestTask({ objectiveId: objective.id })
    
    // Complete task
    await updateTask(task.id, { completedAt: new Date() })
    
    // Check objective progress updated
    const updated = await getObjective(objective.id)
    expect(updated.progressPercent).toBe(50)
  })
})
```

### Performance Tests

```typescript
describe('Performance', () => {
  it('calculates progress in < 100ms', async () => {
    // Setup: Objective with 50 tasks across 5 projects
    const start = Date.now()
    await calculateObjectiveProgress(objectiveId)
    const duration = Date.now() - start
    expect(duration).toBeLessThan(100)
  })
})
```

### Load Tests

```bash
# Simulate 100 concurrent task completions
npx artillery quick --count 100 --num 10 \
  'PATCH http://localhost:3000/api/tasks/[id]' \
  --payload '{"completedAt":"2026-03-09T19:00:00Z"}'
  
# Target: <200ms p95
```

---

## Rollout Plan

### Week 1: Foundation
- [ ] Database schema migration
- [ ] Add indexes
- [ ] Implement calculation functions
- [ ] Add cache layer
- [ ] Write tests

### Week 2: Backend
- [ ] Update task completion API
- [ ] Add recalculation endpoint
- [ ] Update objective API responses
- [ ] Performance testing
- [ ] Fix bottlenecks

### Week 3: Frontend
- [ ] Update objective detail page UI
- [ ] Add progress breakdown component
- [ ] Update task completion UX
- [ ] Add migration toggle UI
- [ ] Mobile responsive

### Week 4: Launch
- [ ] Deploy to staging
- [ ] User testing
- [ ] Fix bugs
- [ ] Deploy to production
- [ ] Monitor performance
- [ ] Gather feedback

---

## Success Metrics

**Technical:**
- [ ] Objective list loads in <200ms (p95)
- [ ] Task completion response <150ms (p95)
- [ ] Zero progress calculation errors
- [ ] 99.9% uptime during rollout

**User Experience:**
- [ ] 80%+ of new objectives use auto-progress
- [ ] <5% of users need support with migration
- [ ] Positive feedback on progress clarity
- [ ] No complaints about performance

**Business:**
- [ ] Feature enables AI suggestion workflow
- [ ] Foundation for voice input features
- [ ] Improved task completion rates (measured)

---

## Future Enhancements (Not in scope)

1. **Weighted tasks** - Some tasks worth more than others
2. **Project progress rollup** - Show project-level progress
3. **Milestones as progress gates** - Lock tasks behind milestones
4. **Confidence intervals** - "70% likely to complete on time"
5. **Velocity tracking** - "Completing 2 tasks/day, ETA in 8 days"
6. **Progress forecasting** - AI predicts completion date
7. **Dependency tracking** - Tasks block other tasks
8. **Critical path analysis** - Highlight blocking tasks

---

## Open Questions

1. **Should archived tasks count?** → No (decided)
2. **Should AI-generated tasks count same as manual?** → Yes
3. **What if user adds task mid-objective?** → Progress recalculates, may drop
4. **Show progress history?** → Phase 2 (not MVP)
5. **Allow manual override of calculated progress?** → No (defeats purpose)

---

## Risks & Mitigation

**Risk 1: Performance degradation at scale**
- Mitigation: Cache, indexes, background jobs if needed
- Fallback: Manual mode for large objectives (>500 tasks)

**Risk 2: Users confused by automatic updates**
- Mitigation: Clear UI showing calculation
- Mitigation: Progress breakdown visible
- Mitigation: Audit log shows what changed

**Risk 3: Migration bugs**
- Mitigation: Staged rollout (new → existing)
- Mitigation: Comprehensive tests
- Mitigation: Rollback plan ready

**Risk 4: Breaking existing integrations**
- Mitigation: Backwards compatible (progressMode field)
- Mitigation: API versioning if needed

---

## Implementation Checklist

### Database
- [ ] Add `progressMode` column (enum: auto/manual)
- [ ] Add `completedAt` column to objectives
- [ ] Add indexes for performance
- [ ] Run migration on staging
- [ ] Run migration on production

### Backend
- [ ] Create `calculateObjectiveProgress()` function
- [ ] Add cache layer with TTL
- [ ] Update task completion to trigger recalculation
- [ ] Add `/api/objectives/[id]/recalculate-progress` endpoint
- [ ] Update `/api/objectives/[id]` to include breakdown
- [ ] Add migration script for existing objectives

### Frontend
- [ ] Update objective detail page UI
- [ ] Add progress breakdown card
- [ ] Update task list to show impact
- [ ] Add "Switch to auto-progress" toggle
- [ ] Update objectives list cards
- [ ] Mobile responsive all changes

### Testing
- [ ] Unit tests for calculation logic
- [ ] Integration tests for API
- [ ] Performance tests (load testing)
- [ ] Manual QA on staging
- [ ] User acceptance testing

### Documentation
- [ ] Update API docs
- [ ] Add user guide (in-app)
- [ ] Write migration guide
- [ ] Document troubleshooting

### Deployment
- [ ] Deploy to staging
- [ ] Run migration script
- [ ] Performance check
- [ ] Deploy to production
- [ ] Monitor errors
- [ ] Monitor performance

---

**End of spec**
