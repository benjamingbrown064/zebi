# AI Work Queue System - Module 1

## Overview

The AI Work Queue System enables Doug (AI) to autonomously pull and complete tasks from a priority-based queue. This is the core autonomy module for Focus App Phase 4.

## Architecture

### Database Table: `AIWorkQueue`

```typescript
{
  id: string              // Unique queue item ID
  workspaceId: string     // Workspace reference
  taskId?: string         // Optional task reference
  priority: number        // Priority level (1-5, lower = higher priority)
  queueType: string       // Type: task, analysis, research, insight, memory
  contextData: JSON       // Flexible context data for the work item
  scheduledFor: DateTime  // When to run this item
  claimedAt?: DateTime    // When AI claimed it
  claimedBy?: string      // Which AI agent claimed it
  completedAt?: DateTime  // When completed
  workLog?: JSON          // Work notes and results
  failureReason?: string  // Why it failed (if applicable)
  retryCount: number      // Number of retries (max 3)
}
```

### Priority Levels

Priority order (highest to lowest):

1. **REPEATING** (1) - Scheduled repeating tasks
2. **URGENT** (2) - Urgent tasks with near deadlines  
3. **ACTIVE** (3) - Currently active tasks
4. **RESEARCH** (4) - Research and analysis tasks
5. **STRATEGIC** (5) - Strategic planning tasks

## API Endpoints

### 1. GET /api/ai/queue/next

Get the next highest-priority work item and claim it.

**Query Parameters:**
- `workspaceId` (required) - Workspace ID
- `claimedBy` (optional) - AI agent name (default: 'doug-ai')

**Response:**
```json
{
  "message": "Work item claimed",
  "item": {
    "id": "abc123",
    "taskId": "task456",
    "priority": 1,
    "queueType": "task",
    "contextData": {
      "taskTitle": "Review customer feedback",
      "description": "High priority task"
    },
    "scheduledFor": "2026-03-04T21:00:00Z",
    "claimedAt": "2026-03-04T21:05:00Z",
    "claimedBy": "doug-ai"
  }
}
```

**No work available:**
```json
{
  "message": "No work available",
  "item": null
}
```

### 2. POST /api/ai/queue/complete

Mark a work item as completed or failed.

**Request Body:**
```json
{
  "itemId": "abc123",
  "success": true,
  "workLog": {
    "status": "completed",
    "notes": "Task completed successfully",
    "duration": "15 minutes",
    "actions_taken": ["updated document", "sent notification"]
  }
}
```

**For failures:**
```json
{
  "itemId": "abc123",
  "success": false,
  "failureReason": "API timeout after 3 attempts"
}
```

**Response (success):**
```json
{
  "message": "Work item completed successfully",
  "item": {
    "id": "abc123",
    "completedAt": "2026-03-04T21:20:00Z",
    "workLog": { ... }
  }
}
```

**Response (failure):**
```json
{
  "message": "Work item marked as failed",
  "item": {
    "id": "abc123",
    "failureReason": "API timeout after 3 attempts",
    "retryCount": 1,
    "willRetry": true
  }
}
```

### 3. GET /api/ai/queue/status

Get an overview of the work queue.

**Query Parameters:**
- `workspaceId` (required) - Workspace ID

**Response:**
```json
{
  "message": "Queue status retrieved",
  "status": {
    "summary": {
      "total": 100,
      "pending": 15,
      "claimed": 3,
      "completed": 80,
      "failed": 2
    },
    "breakdown": {
      "byPriority": [
        { "priority": 1, "priorityName": "Repeating", "count": 5 },
        { "priority": 2, "priorityName": "Urgent", "count": 3 },
        { "priority": 3, "priorityName": "Active", "count": 7 }
      ],
      "byType": [
        { "type": "task", "count": 10 },
        { "type": "research", "count": 3 },
        { "type": "analysis", "count": 2 }
      ]
    },
    "upcoming": [
      {
        "id": "xyz789",
        "queueType": "task",
        "priority": 2,
        "scheduledFor": "2026-03-05T09:00:00Z",
        "contextData": { ... }
      }
    ]
  }
}
```

## Library Functions

### Core Functions (`lib/ai-queue.ts`)

```typescript
// Get next item and claim it
const item = await getNextQueueItem(workspaceId, 'doug-ai');

// Complete an item
await completeQueueItem(itemId, workLog);

// Mark an item as failed (will retry up to 3 times)
await failQueueItem(itemId, 'Error message');

// Add a new item to the queue
await addToQueue({
  workspaceId,
  taskId: 'optional-task-id',
  priority: QUEUE_PRIORITIES.URGENT,
  queueType: QUEUE_TYPES.TASK,
  contextData: { ... },
  scheduledFor: new Date(),
});

// Get queue status
const status = await getQueueStatus(workspaceId);

// Calculate priority for a task
const priority = calculateTaskPriority({
  repeatingTaskId: task.repeatingTaskId,
  priority: task.priority,
  dueAt: task.dueAt,
});

// Cleanup old completed items (30+ days)
const deletedCount = await cleanupOldQueueItems(workspaceId);
```

## Integration with Doug's Heartbeat

Doug should check the queue on every heartbeat:

```typescript
// In Doug's heartbeat handler
const nextItem = await fetch(
  `/api/ai/queue/next?workspaceId=${workspaceId}&claimedBy=doug-ai`
);

if (nextItem.item) {
  // Execute the work
  const result = await executeWork(nextItem.item);
  
  // Mark as complete
  await fetch('/api/ai/queue/complete', {
    method: 'POST',
    body: JSON.stringify({
      itemId: nextItem.item.id,
      success: true,
      workLog: result,
    }),
  });
}
```

## Testing

### Manual Testing

1. **Test queue status:**
   ```bash
   curl "http://localhost:3000/api/ai/queue/status?workspaceId=YOUR_WORKSPACE_ID"
   ```

2. **Get next item:**
   ```bash
   curl "http://localhost:3000/api/ai/queue/next?workspaceId=YOUR_WORKSPACE_ID"
   ```

3. **Complete an item:**
   ```bash
   curl -X POST "http://localhost:3000/api/ai/queue/complete" \
     -H "Content-Type: application/json" \
     -d '{"itemId":"ITEM_ID","success":true,"workLog":{"notes":"Done"}}'
   ```

### Automated Testing

Run the test script:
```bash
npx tsx test-queue.ts
```

## Priority Logic

The queue automatically prioritizes work:

1. **Repeating tasks** (priority 1) - Always run first to maintain schedules
2. **Urgent tasks** (priority 2) - Tasks due within 24 hours or marked urgent
3. **Active tasks** (priority 3) - Currently in-progress work
4. **Research tasks** (priority 4) - Background research and analysis
5. **Strategic tasks** (priority 5) - Long-term planning

Within each priority level, items are ordered by:
- Scheduled time (earlier first)
- Creation time (older first)

## Retry Logic

- Failed items automatically retry up to 3 times
- On failure, `claimedAt` is cleared so another attempt can claim it
- After 3 failures, items are marked as permanently failed
- Failed items can be inspected via the status endpoint

## Cleanup

Old completed items (30+ days) should be periodically cleaned up:

```typescript
const deletedCount = await cleanupOldQueueItems(workspaceId);
console.log(`Cleaned up ${deletedCount} old queue items`);
```

This can be added to a daily cron job.

## Next Steps

- **Module 2**: Repeating Task Executor (generates tasks automatically)
- **Module 3**: AI Insight Generator (creates strategic insights)
- **Module 4**: Memory Builder (extracts learnings from work)
- **Module 5**: Daily Summary Generator (reports on progress)

---

**Status:** ✅ Complete
**Build time:** ~15 minutes
**Files created:** 5
**Database tables:** 1 (AIWorkQueue)
