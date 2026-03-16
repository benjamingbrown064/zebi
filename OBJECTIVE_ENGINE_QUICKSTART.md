# Objective Engine Quick Start

Get the Objective Engine running in 5 minutes.

---

## Prerequisites

- Node.js installed
- Database migrated (schema already includes Objective tables)
- Anthropic API key (for AI features)

---

## Setup

### 1. Install Dependencies

```bash
cd /Users/botbot/.openclaw/workspace/focus-app
npm install
```

### 2. Configure Environment

Add to `.env.local`:

```bash
# AI (Objective Engine)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Cron Jobs
CRON_SECRET=your-random-secret-here
```

Get an Anthropic API key from: https://console.anthropic.com/

### 3. Start Development Server

```bash
npm run dev
```

Server runs at: http://localhost:3000

---

## Test Installation

### Option A: Automated Test Script

```bash
node test-objective-engine.js YOUR_WORKSPACE_ID
```

This tests all API endpoints (without AI to save tokens).

### Option B: Manual API Test

```bash
# 1. Create an objective
curl -X POST http://localhost:3000/api/objectives \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "your-workspace-id",
    "title": "Test Objective",
    "metricType": "count",
    "targetValue": 100,
    "unit": "users",
    "startDate": "2026-03-01",
    "deadline": "2026-06-01",
    "objectiveType": "users",
    "autoBreakdown": true,
    "createdBy": "your-user-id"
  }'

# 2. List objectives
curl http://localhost:3000/api/objectives?workspaceId=your-workspace-id
```

---

## First Objective (Real Example)

Create your first real objective:

```bash
curl -X POST http://localhost:3000/api/objectives \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "b68f4274-c19a-412c-8e26-4eead85dde0e",
    "companyId": "love-warranty-id",
    "title": "Reach £50k MRR by June",
    "description": "Grow Love Warranty to £50k monthly recurring revenue",
    "metricType": "currency",
    "targetValue": 50000,
    "currentValue": 32000,
    "unit": "GBP",
    "startDate": "2026-03-01",
    "deadline": "2026-06-30",
    "objectiveType": "revenue",
    "priority": 1,
    "autoBreakdown": true,
    "createdBy": "your-user-id"
  }'
```

**What happens:**
1. AI analyzes Love Warranty context
2. Generates 3-6 milestones
3. Creates 2-5 projects
4. Creates 10-20 initial tasks
5. Returns full breakdown

This takes ~10-30 seconds (AI generation).

---

## Daily Monitoring Setup

### Option A: Vercel Cron (Production)

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/monitor-objectives",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Deploy to Vercel:

```bash
vercel
```

### Option B: External Cron (Any Environment)

Use GitHub Actions, cron-job.org, or any cron service:

```yaml
# .github/workflows/monitor-objectives.yml
name: Monitor Objectives
on:
  schedule:
    - cron: '0 8 * * *'  # 8:00 AM UTC daily
jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger monitoring
        run: |
          curl -X POST https://your-app.vercel.app/api/cron/monitor-objectives \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Option C: Manual Testing

Test monitoring without waiting for cron:

```bash
curl http://localhost:3000/api/cron/monitor-objectives?workspaceId=your-workspace-id
```

---

## Common Operations

### Update Progress

```bash
curl -X POST http://localhost:3000/api/objectives/OBJ_ID/progress \
  -H "Content-Type: application/json" \
  -d '{
    "value": 35000,
    "entryDate": "2026-03-04",
    "note": "Hit £35k MRR milestone!",
    "source": "manual",
    "createdBy": "your-user-id"
  }'
```

### Check Status

```bash
curl http://localhost:3000/api/objectives/OBJ_ID
```

### Run Analysis

```bash
curl -X POST http://localhost:3000/api/objectives/OBJ_ID/analyze
```

### Detect Blockers

```bash
curl -X POST http://localhost:3000/api/objectives/OBJ_ID/blockers \
  -H "Content-Type: application/json" \
  -d '{ "autoDetect": true }'
```

---

## Integration with Telegram (Future)

For now, you can integrate via webhook:

```typescript
// In your Telegram bot handler
async function handleObjectiveCommand(message: string) {
  if (message.startsWith('/objective ')) {
    const title = message.replace('/objective ', '');
    
    const response = await fetch('http://localhost:3000/api/objectives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'your-workspace-id',
        title,
        // ... other fields
      }),
    });
    
    const data = await response.json();
    return `✅ Created objective: ${data.objective.title}\n${data.breakdown.tasks.length} tasks generated`;
  }
}
```

---

## Troubleshooting

### "Missing ANTHROPIC_API_KEY"

Add to `.env.local`:
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Restart dev server.

### "Objective not found"

Use correct workspace ID and objective ID.

List objectives:
```bash
curl http://localhost:3000/api/objectives?workspaceId=your-workspace-id
```

### AI Breakdown Takes Too Long

- First run is always slower (cold start)
- Normal time: 10-30 seconds
- If >60 seconds, check Anthropic API status

### Database Errors

Ensure migrations ran:
```bash
npx prisma migrate deploy
npx prisma generate
```

### Type Errors

Regenerate Prisma client:
```bash
npx prisma generate
```

---

## Next Steps

1. **Create UI** - Build `/objectives` page in Focus App
2. **Add Charts** - Progress visualization
3. **Telegram Integration** - Natural language commands
4. **Notifications** - Alert on blockers
5. **Learning** - AI learns from completed objectives

---

## API Documentation

Full API docs in `OBJECTIVE_ENGINE.md`.

Quick reference:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/objectives` | GET | List objectives |
| `/api/objectives` | POST | Create objective |
| `/api/objectives/[id]` | GET | Get objective |
| `/api/objectives/[id]` | PUT | Update objective |
| `/api/objectives/[id]` | DELETE | Delete objective |
| `/api/objectives/[id]/analyze` | POST | Run AI analysis |
| `/api/objectives/[id]/breakdown` | POST | Generate breakdown |
| `/api/objectives/[id]/progress` | GET/POST | Progress tracking |
| `/api/objectives/[id]/blockers` | GET/POST | Blocker management |
| `/api/objectives/[id]/trajectory` | GET | Trajectory assessment |

---

## Support

Need help?

1. Check logs: `console.log` in API routes
2. Test with `test-objective-engine.js`
3. Read `OBJECTIVE_ENGINE.md` for details
4. Check Prisma schema: `prisma/schema.prisma`

---

**You're ready! Start creating objectives and let the AI drive execution.** 🚀
