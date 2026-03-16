# Bot Attribution Update - 2026-03-14

## 🎯 What Changed

Added bot attribution system to Zebi so you can tag content by creator (Doug vs Harvey) and assign tasks to specific bots.

## ✅ Database Changes

**New Fields:**
1. `AIMemory.createdBy` - String field (was UUID) - "doug", "harvey", or user UUID
2. `AIInsight.createdBy` - New string field - "doug", "harvey", or user UUID  
3. `Task.botAssignee` - New string field - "doug", "harvey", or null

**Migration:** ✅ Complete (ran manually via run-migration.js)

## 📝 API Updates

### 1. GET /api/doug/memory
**New query param:** `?createdBy=harvey` or `?createdBy=doug`

```bash
# Get only Harvey's memories
curl "https://zebi.app/api/doug/memory?createdBy=harvey" \
  -H "Authorization: Bearer <token>"

# Get only Doug's memories  
curl "https://zebi.app/api/doug/memory?createdBy=doug" \
  -H "Authorization: Bearer <token>"
```

### 2. POST /api/doug/memory
**New optional field:** `createdBy`

```json
{
  "title": "Memory title",
  "description": "Memory content",
  "memoryType": "conversation",
  "confidenceScore": 8,
  "createdBy": "harvey"
}
```

### 3. GET /api/doug/my-tasks
**New query param:** `?bot=harvey` or `?bot=doug` (defaults to "doug")

```bash
# Get Harvey's tasks
curl "https://zebi.app/api/doug/my-tasks?bot=harvey" \
  -H "Authorization: Bearer <token>"
```

### 4. POST /api/doug/task
**New optional field:** `botAssignee`

```json
{
  "title": "Task for Harvey",
  "description": "Deep technical work",
  "priority": 2,
  "botAssignee": "harvey"
}
```

## 🤖 Harvey Setup

**Updated:** `/Users/botbot/.openclaw/workspace/shared/harvey-setup/ZEBI_API_REFERENCE.md`

Harvey now knows:
- How to create memories tagged as his own (`createdBy: "harvey"`)
- How to filter for only his memories
- How to check his assigned tasks (`?bot=harvey`)
- How to create tasks assigned to himself or Doug

## 🎁 Benefits

1. **Separate contexts:** Doug's memories vs Harvey's memories
2. **Task assignment:** Assign deep work to Harvey, monitoring to Doug
3. **Attribution tracking:** Know which bot documented what
4. **Filtering:** Get only relevant content for each bot

## 📊 Example Usage

**Ben assigns task to Harvey:**
```bash
curl -X POST "https://zebi.app/api/doug/task" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Analyze security-app codebase",
    "description": "Review architecture and suggest improvements",
    "priority": 2,
    "botAssignee": "harvey"
  }'
```

**Harvey checks his tasks:**
```bash
curl "https://zebi.app/api/doug/my-tasks?bot=harvey" \
  -H "Authorization: Bearer <token>"
```

**Harvey documents findings:**
```bash
curl -X POST "https://zebi.app/api/doug/memory" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Security App Architecture Review",
    "description": "Found 3 potential improvements...",
    "memoryType": "research",
    "confidenceScore": 9,
    "createdBy": "harvey"
  }'
```

**Doug searches only Harvey's technical memories:**
```bash
curl "https://zebi.app/api/doug/memory?createdBy=harvey&memoryType=research" \
  -H "Authorization: Bearer <token>"
```

## 🚀 Deployment Status

- ✅ Database migration complete
- ✅ Code changes committed (commit 8e0e2c9)
- ⏳ Vercel deployment in progress
- ✅ Harvey API reference updated

## 🧹 Files

**Updated:**
- `zebi/prisma/schema.prisma` - Added bot attribution fields
- `zebi/app/actions/ai-memory.ts` - Support createdBy input
- `zebi/app/api/doug/memory/route.ts` - GET with filtering, POST with createdBy
- `zebi/app/api/doug/my-tasks/route.ts` - Support bot query param
- `zebi/app/api/doug/task/route.ts` - Support botAssignee field

**Created:**
- `zebi/run-migration.js` - Manual migration script (one-time use)
- `shared/harvey-setup/ZEBI_API_REFERENCE.md` - Harvey's updated API docs

---

**Next:** Once deployment completes, both Doug and Harvey will have full bot attribution support! 🎉
