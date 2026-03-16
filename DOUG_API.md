# Doug API Documentation

Complete API access for Doug (AI assistant) to manage Focus App via Telegram.

## Authentication

All endpoints require Bearer token authentication:

```bash
Authorization: Bearer 0efecdc75b163372fc2063b7f97fe57f176de14ead17a16c6a02b2350ea5f06f
```

Configured in `.env.local` as `DOUG_API_TOKEN`.

## Base URL

Local: `http://localhost:3001/api/doug`

Production: TBD (when deployed)

---

## Endpoints

### 1. GET /status

Get complete workspace overview.

**Response:**
```json
{
  "workspace": { "id": "...", "name": "My Workspace" },
  "summary": {
    "objectives": 1,
    "companies": 1,
    "tasks": 0,
    "blockers": 0,
    "goals": 1
  },
  "objectives": [...],
  "companies": [...],
  "recentTasks": [...],
  "blockers": [...],
  "goals": [...]
}
```

---

### 2. POST /objective

Create a new objective with optional AI breakdown.

**Request:**
```json
{
  "title": "Reach £50k MRR by June",
  "companyId": "uuid",           // optional
  "goalId": "uuid",              // optional
  "targetValue": 50000,
  "unit": "GBP",                 // optional
  "metricType": "currency",      // count|currency|percentage|boolean
  "deadline": "2026-06-30",
  "priority": 1,                 // 1-4 (1=urgent, 4=low)
  "autoBreakdown": true          // AI generates projects + tasks
}
```

**Response:**
```json
{
  "objective": {
    "id": "uuid",
    "title": "...",
    "company": "Love Warranty",
    "status": "active",
    "progress": "0/50000 GBP",
    "deadline": "2026-06-30T00:00:00.000Z"
  },
  "breakdown": {
    "projects": 5,
    "tasks": 23,
    "milestones": 4
  }
}
```

---

### 3. PATCH /objective

Update objective progress or status.

**Request:**
```json
{
  "objectiveId": "uuid",
  "currentValue": 5000,          // optional
  "status": "on_track",          // optional: on_track|at_risk|blocked|completed
  "note": "Closed 3 deals"       // optional
}
```

**Response:**
```json
{
  "objective": {
    "id": "uuid",
    "title": "...",
    "status": "on_track",
    "progress": "5000/50000 GBP",
    "progressPercent": 10
  }
}
```

---

### 4. POST /task

Create a new task.

**Request:**
```json
{
  "title": "Build landing page",
  "description": "...",          // optional
  "objectiveId": "uuid",         // optional
  "projectId": "uuid",           // optional
  "priority": 1,                 // 1-4
  "aiGenerated": true,           // optional, default false
  "aiAgent": "doug"              // optional
}
```

**Response:**
```json
{
  "task": {
    "id": "uuid",
    "title": "...",
    "status": "Todo",
    "objective": "...",
    "priority": 1,
    "aiGenerated": true
  }
}
```

---

### 5. PATCH /task

Update a task.

**Request:**
```json
{
  "taskId": "uuid",
  "statusId": "uuid",            // optional
  "completed": true,             // optional
  "title": "new title",          // optional
  "description": "..."           // optional
}
```

**Response:**
```json
{
  "task": {
    "id": "uuid",
    "title": "...",
    "status": "Done",
    "completed": true
  }
}
```

---

### 6. POST /blocker

Record a blocker for an objective.

**Request:**
```json
{
  "objectiveId": "uuid",
  "title": "Waiting for design approval",
  "description": "...",          // optional
  "blockerType": "external_dependency",  // external_dependency|resource|technical|decision
  "severity": "high"             // low|medium|high|critical
}
```

**Response:**
```json
{
  "blocker": {
    "id": "uuid",
    "title": "...",
    "severity": "high",
    "objective": {
      "id": "uuid",
      "title": "...",
      "company": "..."
    }
  }
}
```

**Side effects:**
- High/critical severity → objective status = `blocked`
- Medium/low severity → objective status = `at_risk` (if was active/on_track)

---

### 7. PATCH /blocker

Resolve a blocker.

**Request:**
```json
{
  "blockerId": "uuid",
  "resolution": "Client approved design"  // optional
}
```

**Response:**
```json
{
  "blocker": {
    "id": "uuid",
    "resolved": true,
    "remainingBlockers": 0
  }
}
```

**Side effects:**
- If no more blockers remain → objective status = `active`

---

### 8. POST /company

Create a new company.

**Request:**
```json
{
  "name": "Love Warranty",
  "industry": "Automotive",      // optional
  "stage": "growth",             // optional: seed|mvp|launch|growth|scale
  "businessModel": "SaaS",       // optional
  "revenue": 105000,             // optional
  "missionStatement": "...",     // optional
  "websiteUrl": "..."            // optional
}
```

**Response:**
```json
{
  "company": {
    "id": "uuid",
    "name": "...",
    "industry": "...",
    "stage": "...",
    "revenue": 105000
  }
}
```

---

## Helper Script

```bash
# Get status
./focus-app-api-helper.sh status

# Create objective
./focus-app-api-helper.sh create-objective "Reach £50k MRR" 50000 "2026-06-30"

# Create task
./focus-app-api-helper.sh create-task "Build landing page" <objective-id> 1

# Update progress
./focus-app-api-helper.sh update-objective <id> 5000 "Closed 3 deals"

# Record blocker
./focus-app-api-helper.sh record-blocker <id> "Waiting on design" high

# Resolve blocker
./focus-app-api-helper.sh resolve-blocker <blocker-id>

# Create company
./focus-app-api-helper.sh create-company "New Company" "Tech" "growth" 50000
```

---

## Doug's Telegram Integration

Doug can now:

1. **Check status** → See all objectives, tasks, blockers
2. **Create objectives** → With AI breakdown automatically
3. **Add tasks** → Link to objectives/projects
4. **Update progress** → Track objective progress
5. **Manage blockers** → Record and resolve blockers
6. **Create companies** → Add new business units

### Example Telegram Conversations

**User:** "Create an objective to reach £50k MRR by June for Love Warranty"

**Doug:** 
1. Calls `/status` to get Love Warranty company ID
2. Calls `/objective` with AI breakdown enabled
3. Reports back: "Created objective with 5 projects and 23 tasks. First milestone is £10k by April 15th."

**User:** "Update the MRR objective - we're at £5k now"

**Doug:**
1. Calls `/status` to find MRR objective
2. Calls `/objective` PATCH with currentValue=5000
3. Reports: "Updated! You're at 10% progress (£5k/£50k). On track for deadline."

**User:** "Record a blocker - waiting on payment gateway approval"

**Doug:**
1. Calls `/blocker` POST with severity=high
2. Reports: "Blocker recorded. Objective marked as blocked. Want me to follow up in 3 days?"

---

## Security Notes

- Token stored in `.env.local` (not committed to git)
- Only Doug has access (not exposed to web UI)
- All requests logged for audit
- Future: Rate limiting + IP whitelisting for production

---

## Next Phase: Automation (Phase 4)

With full API access, Doug can now:
- Monitor objectives daily
- Auto-update progress from external sources
- Detect blockers proactively
- Generate insights from patterns
- Send daily/weekly summaries

Ready when you are! 🚀
