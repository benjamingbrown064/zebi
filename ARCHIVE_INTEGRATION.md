# Task Archiving - Integration Guide

## Quick Start

### 1. Mark Task as Completed

```typescript
import { updateTask } from '@/app/actions/tasks'

// Mark task as done
await updateTask(workspaceId, taskId, {
  completedAt: new Date().toISOString()
})
```

This triggers the completion toast showing when the task will be auto-archived.

### 2. Archive Immediately

```typescript
import { archiveTask } from '@/app/actions/archive'

// Archive now (overrides auto-archive delay)
await archiveTask(workspaceId, taskId)
```

### 3. Restore Archived Task

```typescript
import { restoreTask } from '@/app/actions/archive'

// Restore to completed view
await restoreTask(workspaceId, taskId)
```

## UI Integration Examples

### Adding ViewToggle to a Page

```tsx
'use client'

import { useState } from 'react'
import ViewToggle from '@/components/ViewToggle'
import { getTasks } from '@/app/actions/tasks'
import { getCompletedTasks, getArchivedTasks } from '@/app/actions/archive'

export default function TasksPage() {
  const [view, setView] = useState<'active' | 'completed' | 'archived'>('active')
  const [tasks, setTasks] = useState([])

  const handleViewChange = async (newView) => {
    setView(newView)
    
    let newTasks
    switch (newView) {
      case 'active':
        newTasks = await getTasks(workspaceId)
        break
      case 'completed':
        newTasks = await getCompletedTasks(workspaceId)
        break
      case 'archived':
        newTasks = await getArchivedTasks(workspaceId)
        break
    }
    setTasks(newTasks)
  }

  return (
    <>
      <ViewToggle 
        activeView={view}
        onViewChange={handleViewChange}
        completedCount={completedTasks.length}
        archivedCount={archivedTasks.length}
      />
      {/* Task list */}
    </>
  )
}
```

### Adding Completion Toast

```tsx
'use client'

import { useState } from 'react'
import CompletionToast from '@/components/CompletionToast'
import { updateTask } from '@/app/actions/tasks'
import { archiveTask } from '@/app/actions/archive'
import { getArchiveSettings } from '@/app/actions/archive'

export default function TaskCard({ task, workspaceId }) {
  const [toastVisible, setToastVisible] = useState(false)
  const [retentionDays, setRetentionDays] = useState(7)

  const handleCompleteTask = async () => {
    await updateTask(workspaceId, task.id, {
      completedAt: new Date().toISOString()
    })

    // Get archive settings and show toast
    const settings = await getArchiveSettings(workspaceId)
    setRetentionDays(settings.autoArchiveRetentionDays)
    setToastVisible(true)
  }

  return (
    <>
      <div className="task-card">
        <button onClick={handleCompleteTask} className="complete-btn">
          Mark Done
        </button>
      </div>

      <CompletionToast
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        onArchiveNow={() => archiveTask(workspaceId, task.id)}
        onUndo={() => updateTask(workspaceId, task.id, { completedAt: null })}
        retentionDays={retentionDays}
        taskTitle={task.title}
      />
    </>
  )
}
```

### Adding Archive Menu Item

```tsx
'use client'

import ArchiveActionsMenu from '@/components/ArchiveActionsMenu'
import { archiveTask, restoreTask } from '@/app/actions/archive'

export default function TaskOverflowMenu({ task, workspaceId }) {
  return (
    <div className="overflow-menu">
      <ArchiveActionsMenu
        taskId={task.id}
        isArchived={!!task.archivedAt}
        onArchive={(id) => archiveTask(workspaceId, id)}
        onRestore={(id) => restoreTask(workspaceId, id)}
        archivedAt={task.archivedAt}
      />
    </div>
  )
}
```

### Bulk Archive in List View

```tsx
'use client'

import { bulkArchiveTasks } from '@/app/actions/archive'

export default function TaskListToolbar({ selectedTaskIds, workspaceId }) {
  const handleBulkArchive = async () => {
    const archivedCount = await bulkArchiveTasks(workspaceId, selectedTaskIds)
    console.log(`Archived ${archivedCount} tasks`)
    // Refresh list and clear selection
  }

  return (
    <div className="toolbar">
      <button onClick={handleBulkArchive} disabled={selectedTaskIds.length === 0}>
        Archive Selected
      </button>
    </div>
  )
}
```

## API Usage

### Cron Job Setup

#### Option 1: EasyCron
1. Go to https://www.easycron.com/
2. Create a new cron job
3. URL: `https://your-domain.com/api/cron/auto-archive`
4. Method: POST
5. Custom Headers:
   ```
   x-cron-token: your-secret-token
   ```
6. Schedule: `0 0 * * *` (daily at midnight UTC)

#### Option 2: AWS Lambda
```bash
# Create a Lambda function that calls:
curl -X POST https://your-domain.com/api/cron/auto-archive \
  -H "x-cron-token: your-secret-token"

# Schedule with EventBridge (CloudWatch Events)
# Rate: cron(0 0 * * ? *)  # Daily at midnight UTC
```

#### Option 3: Vercel Cron
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/auto-archive",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Environment variable:
```bash
CRON_SECRET_TOKEN=your-secret-token
```

#### Option 4: GitHub Actions
Create `.github/workflows/auto-archive.yml`:
```yaml
name: Auto-Archive Tasks
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC

jobs:
  auto-archive:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger auto-archive
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/auto-archive \
            -H "x-cron-token: ${{ secrets.CRON_SECRET_TOKEN }}"
```

Secrets:
- `APP_URL`: https://your-domain.com
- `CRON_SECRET_TOKEN`: your-secret-token

## Workspace Settings

### Getting Current Settings

```typescript
import { getArchiveSettings } from '@/app/actions/archive'

const settings = await getArchiveSettings(workspaceId)
console.log(settings.autoArchiveRetentionDays)  // 7
```

### Updating Settings

```typescript
import { updateArchiveSettings } from '@/app/actions/archive'

// Archive after 1 day
await updateArchiveSettings(workspaceId, 1)

// Archive same day
await updateArchiveSettings(workspaceId, 0)

// Never auto-archive (manual only)
await updateArchiveSettings(workspaceId, 0)

// Archive after 30 days
await updateArchiveSettings(workspaceId, 30)
```

### Settings UI Component

```tsx
'use client'

import { useState } from 'react'
import { updateArchiveSettings, getArchiveSettings } from '@/app/actions/archive'

export default function ArchiveSettings({ workspaceId }) {
  const [retention, setRetention] = useState(7)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateArchiveSettings(workspaceId, retention)
      // Show success message
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="settings-section">
      <h3>Auto-Archive Settings</h3>
      
      <label>
        Auto-archive completed tasks after:
        <select value={retention} onChange={(e) => setRetention(Number(e.target.value))}>
          <option value={0}>Same day</option>
          <option value={1}>1 day</option>
          <option value={7}>7 days (default)</option>
          <option value={30}>30 days</option>
          <option value={-1}>Never</option>
        </select>
      </label>

      <button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
```

## Data Queries

### Check if Task is Archived

```typescript
const task = await prisma.task.findUnique({
  where: { id: taskId }
})

if (task?.archivedAt) {
  console.log('Task is archived as of:', task.archivedAt)
} else {
  console.log('Task is active')
}
```

### Get Tasks by Status

```typescript
import { getTasks } from '@/app/actions/tasks'
import { getCompletedTasks, getArchivedTasks } from '@/app/actions/archive'

const activeTasks = await getTasks(workspaceId)      // NOT completed, NOT archived
const completedTasks = await getCompletedTasks(workspaceId)  // IS completed, NOT archived
const archivedTasks = await getArchivedTasks(workspaceId)   // IS archived
```

### Custom Query

```typescript
import { prisma } from '@/lib/prisma'

// Get all tasks with their status
const tasks = await prisma.task.findMany({
  where: {
    workspaceId,
  },
  select: {
    id: true,
    title: true,
    completedAt: true,
    archivedAt: true,
  }
})

// Categorize
const active = tasks.filter(t => !t.completedAt && !t.archivedAt)
const completed = tasks.filter(t => t.completedAt && !t.archivedAt)
const archived = tasks.filter(t => t.archivedAt)
```

## Testing

### Unit Tests

```typescript
// __tests__/archive.test.ts
import { archiveTask, restoreTask, getArchivedTasks } from '@/app/actions/archive'
import { createTask, updateTask } from '@/app/actions/tasks'

describe('Archive actions', () => {
  it('should archive a completed task', async () => {
    const task = await createTask(workspaceId, userId, {
      title: 'Test task',
      statusId: 'inbox'
    })

    await updateTask(workspaceId, task.id, {
      completedAt: new Date().toISOString()
    })

    const archived = await archiveTask(workspaceId, task.id)
    expect(archived).toBe(true)

    const archivedTasks = await getArchivedTasks(workspaceId)
    expect(archivedTasks.some(t => t.id === task.id)).toBe(true)
  })

  it('should restore an archived task', async () => {
    // ... setup archived task ...
    const restored = await restoreTask(workspaceId, taskId)
    expect(restored).toBe(true)
  })
})
```

### Manual Testing Checklist

- [ ] Complete task → Toast appears
- [ ] Click "Archive now" → Task disappears from Active view
- [ ] Switch to Completed view → Task appears
- [ ] Switch to Archived view → Task appears with timestamp
- [ ] Click Restore → Task moves back to Completed
- [ ] Undo on toast → Task becomes incomplete again
- [ ] Bulk select tasks → Archive all selected
- [ ] Change retention setting → Next cron run uses new value
- [ ] Goal progress → Ignores archived tasks (counts only by completedAt)

## Troubleshooting

### Tasks not auto-archiving

1. Check cron job is running
2. Verify `CRON_SECRET_TOKEN` matches
3. Check database logs for errors
4. Verify `autoArchiveRetentionDays` is not 0

### Performance issues

- Ensure indexes are created:
  ```sql
  -- PostgreSQL
  CREATE INDEX IF NOT EXISTS idx_task_workspace_completed_archived 
  ON task(workspace_id, completed_at, archived_at);
  ```

### Archived tasks reappearing

- Check application logic isn't clearing `archivedAt` unexpectedly
- Verify queries use `archivedAt IS NULL` filter

## Security Notes

- Always verify workspace membership before archiving/restoring tasks
- Use CRON_SECRET_TOKEN to prevent unauthorized cron calls
- Never expose archiveTask/restoreTask without authentication
- Rate-limit bulk operations (max 100 tasks per request)
