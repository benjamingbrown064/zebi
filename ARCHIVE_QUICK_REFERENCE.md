# Task Archiving - Quick Reference

## Import Everything

```typescript
import {
  archiveTask,
  restoreTask,
  bulkArchiveTasks,
  autoArchiveCompleted,
  getCompletedTasks,
  getArchivedTasks,
  getArchiveSettings,
  updateArchiveSettings,
} from '@/app/actions/archive'

import {
  getTasks,
  createTask,
  updateTask,
} from '@/app/actions/tasks'

import ViewToggle from '@/components/ViewToggle'
import CompletionToast from '@/components/CompletionToast'
import ArchiveActionsMenu from '@/components/ArchiveActionsMenu'
```

## Common Tasks

### Complete a Task

```typescript
// Mark as done
await updateTask(workspaceId, taskId, {
  completedAt: new Date().toISOString()
})

// Toast appears automatically (if implemented)
// Message: "Task completed · Will archive in 7 days"
```

### Archive Immediately

```typescript
await archiveTask(workspaceId, taskId)
```

### Restore from Archive

```typescript
await restoreTask(workspaceId, taskId)
```

### Bulk Archive

```typescript
const count = await bulkArchiveTasks(workspaceId, [
  'task-id-1',
  'task-id-2',
  'task-id-3'
])
console.log(`Archived ${count} tasks`)
```

### Get Tasks by Status

```typescript
// Active tasks (not completed, not archived)
const active = await getTasks(workspaceId)

// Completed tasks (not archived)
const completed = await getCompletedTasks(workspaceId)

// Archived tasks
const archived = await getArchivedTasks(workspaceId)
```

### Archive Settings

```typescript
// Get current setting
const settings = await getArchiveSettings(workspaceId)
console.log(settings.autoArchiveRetentionDays) // 7

// Update setting
await updateArchiveSettings(workspaceId, 14) // 14 days
await updateArchiveSettings(workspaceId, 1)  // 1 day
await updateArchiveSettings(workspaceId, 0)  // Never
```

## UI Components

### ViewToggle

```tsx
<ViewToggle
  activeView={view}
  onViewChange={handleViewChange}
  completedCount={123}
  archivedCount={45}
/>
```

**Events:**
- `onViewChange('active' | 'completed' | 'archived')`

### CompletionToast

```tsx
<CompletionToast
  isVisible={showToast}
  onClose={() => setShowToast(false)}
  onArchiveNow={() => archiveTask(workspaceId, taskId)}
  onUndo={() => updateTask(workspaceId, taskId, { completedAt: null })}
  retentionDays={7}
  taskTitle="Buy groceries"
/>
```

**Actions:**
- `onArchiveNow()` - Archive immediately
- `onUndo()` - Mark task incomplete
- `onClose()` - Dismiss toast

### ArchiveActionsMenu

```tsx
<ArchiveActionsMenu
  taskId={taskId}
  isArchived={!!task.archivedAt}
  onArchive={(id) => archiveTask(workspaceId, id)}
  onRestore={(id) => restoreTask(workspaceId, id)}
  archivedAt={task.archivedAt}
  onActionStart={() => setLoading(true)}
  onActionComplete={() => setLoading(false)}
/>
```

**Props:**
- `isArchived: boolean` - Is task archived?
- `archivedAt?: string` - When archived (ISO date)

**Events:**
- `onArchive(taskId)` - Archive the task
- `onRestore(taskId)` - Restore the task

## Cron Setup (One-Liner for Testing)

```bash
curl -X POST http://localhost:3000/api/cron/auto-archive
```

With authentication:
```bash
curl -X POST http://localhost:3000/api/cron/auto-archive \
  -H "x-cron-token: your-secret-token"
```

For specific workspace:
```bash
curl -X POST http://localhost:3000/api/cron/auto-archive \
  -H "x-cron-token: your-secret-token" \
  -H "x-workspace-id: workspace-123"
```

## Database Queries

### Check if Archived

```typescript
const task = await prisma.task.findUnique({
  where: { id: taskId },
  select: { archivedAt: true }
})

if (task?.archivedAt) {
  console.log('Archived on:', task.archivedAt)
}
```

### Filter Archive Status

```typescript
// Active only
const active = await prisma.task.findMany({
  where: {
    workspaceId,
    archivedAt: null
  }
})

// Completed but not archived
const completed = await prisma.task.findMany({
  where: {
    workspaceId,
    completedAt: { not: null },
    archivedAt: null
  }
})

// Archived only
const archived = await prisma.task.findMany({
  where: {
    workspaceId,
    archivedAt: { not: null }
  }
})
```

### Pagination

```typescript
// Get page 1 (50 items per page)
const items = await getArchivedTasks(
  workspaceId,
  50,  // limit
  0    // offset (page 1)
)

// Get page 2
const page2 = await getArchivedTasks(workspaceId, 50, 50)
```

## Testing

### Manual Test Flow

1. Create task
2. Mark complete
3. Toast appears
4. Click "Archive now"
5. Task disappears
6. Switch to "Completed" - task appears
7. Switch to "Archived" - task appears with date
8. Click "Restore"
9. Task moves back to "Completed"
10. Undo on toast
11. Task becomes incomplete

### Unit Test Template

```typescript
import { archiveTask, restoreTask } from '@/app/actions/archive'
import { createTask, updateTask } from '@/app/actions/tasks'

it('should archive a task', async () => {
  const task = await createTask(workspaceId, userId, {
    title: 'Test',
    statusId: statusId
  })

  await archiveTask(workspaceId, task.id)

  const archived = await prisma.task.findUnique({
    where: { id: task.id }
  })

  expect(archived.archivedAt).not.toBeNull()
})
```

## Error Handling

```typescript
// Archive returns false on error
const success = await archiveTask(workspaceId, taskId)
if (!success) {
  console.error('Failed to archive task')
  // Show error to user
}

// Functions return null/0/empty array on error
const completed = await getCompletedTasks(workspaceId) // [] on error
const updated = await updateArchiveSettings(workspaceId, 7) // false on error
```

## Performance Tips

1. **Use pagination** - Don't fetch all archived tasks at once
   ```typescript
   const page1 = await getArchivedTasks(workspaceId, 50, 0)
   const page2 = await getArchivedTasks(workspaceId, 50, 50)
   ```

2. **Bulk operations** - Archive multiple tasks at once
   ```typescript
   await bulkArchiveTasks(workspaceId, selectedIds)
   // Instead of looping:
   // for (const id of selectedIds) await archiveTask(workspaceId, id)
   ```

3. **Cache settings** - Don't fetch archive settings on every operation
   ```typescript
   const settings = await getArchiveSettings(workspaceId)
   // Use settings.autoArchiveRetentionDays for toast message
   ```

4. **Filter early** - Use `archivedAt: null` in WHERE clause
   ```typescript
   // Good: Query respects the archive filter
   const tasks = await getTasks(workspaceId)
   
   // Avoid: Client-side filtering of large datasets
   const allTasks = await prisma.task.findMany({ where: { workspaceId } })
   const active = allTasks.filter(t => !t.archivedAt)
   ```

## Environment Variables

```bash
# Required for cron authentication (optional but recommended)
CRON_SECRET_TOKEN=your-secret-token-12345

# Database connection (existing)
DATABASE_URL=postgresql://user:password@host:5432/db

# Optional: Custom cron header for your provider
CRON_AUTH_HEADER=X-Custom-Auth
```

## Logging

The archive actions log important events:

```typescript
// Examples of logged events:
console.log(`Task ${taskId} archived`)
console.log(`Task ${taskId} restored`)
console.log(`Bulk archived ${count} tasks`)
console.log(`Auto-archived ${count} tasks in workspace ${workspaceId}`)
console.log(`Updated archive retention for workspace ${workspaceId} to ${days} days`)
```

## Schema Reference

### Workspace Model
```prisma
model Workspace {
  autoArchiveRetentionDays  Int  @default(7)  // Days before auto-archive
  // ... other fields
}
```

### Task Model
```prisma
model Task {
  completedAt  DateTime?    @db.Timestamptz()  // When marked done
  archivedAt   DateTime?    @db.Timestamptz()  // When archived
  // ... other fields
  
  @@index([workspaceId, completedAt, archivedAt])  // Archive queries
}
```

## Links

- **Schema:** `prisma/schema.prisma`
- **Actions:** `app/actions/archive.ts`
- **Components:** `components/View*.tsx`
- **Tests:** `__tests__/archive.test.ts`
- **Cron:** `app/api/cron/auto-archive/route.ts`
- **Docs:** See `ARCHIVE_INTEGRATION.md` for detailed examples

---

**Pro Tip:** Use Ctrl+F to find the task you need in this reference! 🔍
