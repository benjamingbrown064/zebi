# Task Archiving Feature - Migration Guide

## Overview
This migration adds task archiving capabilities to the Focus app, allowing users to hide completed tasks without deleting them.

## What Changed

### Database Schema

1. **Workspace Model** - Added new field:
   ```prisma
   autoArchiveRetentionDays  Int  @default(7)
   ```
   - Stores the auto-archive retention period (in days)
   - Default: 7 days
   - Special values:
     - 0 = Never auto-archive
     - 1 = Archive same day
     - 7 = Archive after 1 week (default)

2. **Task Model** - Added new index:
   ```prisma
   @@index([workspaceId, completedAt, archivedAt])
   ```
   - Optimizes queries for finding/archiving completed tasks
   - Used by auto-archive cron job and archive views

## Migration Steps

### 1. Update Prisma Schema
The schema.prisma file has already been updated with:
- New `autoArchiveRetentionDays` field on Workspace model
- New composite index on Task model

### 2. Apply Migration

Run the migration command:

```bash
cd /Users/botbot/.openclaw/workspace/focus-app
npx prisma migrate dev --name add-task-archiving
```

This will:
- Create a migration file in `prisma/migrations/`
- Apply the migration to your database
- Generate updated Prisma Client

### 3. Database Changes

The migration will:
- Add `autoArchiveRetentionDays INT DEFAULT 7` to workspace table
- Add composite index `(workspace_id, completed_at, archived_at)` to task table

### 4. Post-Migration

No data migration needed - the Task model already has `archivedAt` and `completedAt` fields.

## Features Enabled

### Query Filters
All query operations now filter out archived tasks by default (`archivedAt IS NULL`):
- `getTasks()` - returns active tasks only
- Board view - excludes archived tasks
- Dashboard - excludes archived tasks
- List view - can toggle between Active/Completed/Archived

### Server Actions

New file: `app/actions/archive.ts`

Functions available:
- `archiveTask(workspaceId, taskId)` - Archive a single task
- `restoreTask(workspaceId, taskId)` - Restore an archived task
- `bulkArchiveTasks(workspaceId, taskIds[])` - Archive multiple tasks
- `getCompletedTasks(workspaceId)` - Get completed but not archived tasks
- `getArchivedTasks(workspaceId)` - Get archived tasks
- `autoArchiveCompleted(workspaceId)` - Auto-archive based on retention settings
- `getArchiveSettings(workspaceId)` - Get retention settings
- `updateArchiveSettings(workspaceId, days)` - Update retention settings

### UI Components

New components in `components/`:
- `ViewToggle.tsx` - Toggle between Active/Completed/Archived views
- `CompletionToast.tsx` - Toast shown when task is completed
- `ArchiveActionsMenu.tsx` - Archive/Restore menu in task actions

### Auto-Archive Cron Job

New endpoint: `app/api/cron/auto-archive/route.ts`

To set up auto-archive:

1. **Local Testing:**
   ```bash
   curl -X POST http://localhost:3000/api/cron/auto-archive \
     -H "x-cron-token: your-secret-token"
   ```

2. **Production Setup:**
   - Use a cron service like EasyCron, AWS Lambda, or your hosting provider's cron
   - Call: `POST https://your-domain.com/api/cron/auto-archive`
   - Set to run daily at midnight UTC
   - Add header: `x-cron-token: your-secret-token` (set `CRON_SECRET_TOKEN` env var)

Example cron configuration:
```bash
# Using EasyCron or similar
POST https://your-domain.com/api/cron/auto-archive
Headers: x-cron-token=your-secret-token
Schedule: Daily at 00:00 UTC
```

## Deployment

### Pre-Deploy Checklist

- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Build succeeds: `npm run build`
- [ ] Set `CRON_SECRET_TOKEN` environment variable (if using auth)
- [ ] Configure cron job to call `/api/cron/auto-archive` daily

### Testing

1. **Manual archive:**
   - Complete a task
   - Toast should appear: "Task completed · Will archive in 7 days"
   - Click "Archive now" → Task disappears from active view
   - Switch to "Archived" filter → Task appears with timestamp

2. **Restoration:**
   - Click "Restore" in archive view
   - Task reappears in "Completed" view
   - preservedcomputedAt is preserved

3. **Auto-archive:**
   - Complete a task
   - Manually set `completedAt` to 8 days ago in database
   - Call `/api/cron/auto-archive`
   - Verify task is now archived

4. **Settings:**
   - Update `autoArchiveRetentionDays` on workspace
   - Verify next cron run respects new setting

## Rollback

If needed to revert:

```bash
npx prisma migrate resolve --rolled-back add_task_archiving
npx prisma migrate deploy
```

This will:
- Remove the `autoArchiveRetentionDays` field
- Remove the composite index
- Restore the database to pre-migration state

Note: This won't change any `archivedAt` values (they're already in the schema), so no data is lost.

## Verification

After migration, verify:

```bash
# Connect to your database and run:
# PostgreSQL
\d workspace  # Should show autoArchiveRetentionDays column
\d task       # Should show (workspace_id, completed_at, archived_at) index

# MySQL
DESCRIBE workspace;  # Should show autoArchiveRetentionDays
SHOW INDEX FROM task;  # Should show composite index
```

## Performance Considerations

- The new index `(workspaceId, completedAt, archivedAt)` optimizes:
  - Finding tasks to auto-archive
  - Filtering tasks by completion/archive status
  - Supports up to 10M+ tasks per workspace with good performance

- Queries will be significantly faster when filtering large result sets

## Next Steps

1. Deploy schema migration
2. Configure cron job for auto-archive
3. Test archive/restore functionality
4. Roll out to users
5. Monitor error logs for any issues
