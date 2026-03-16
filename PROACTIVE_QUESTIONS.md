# Proactive Questions System

AI-powered pattern detection that asks proactive questions daily at 10am to help you stay on top of your business.

## Overview

The Proactive Questions system analyzes your workspace data daily and generates smart, actionable questions when it detects important patterns:

- **Stalled Projects** - Projects with no activity in 14+ days
- **Revenue Drops** - Company revenue dropped >10% week-over-week
- **Velocity Issues** - Task completion rate dropped >30%
- **Opportunity Detection** - Multiple insights suggest the same action

## Architecture

```
/app/api/cron/proactive-questions/route.ts  ← Cron endpoint (called daily at 10am)
/lib/proactive-questions.ts                 ← Question generation logic
/lib/question-detectors/
  ├── stalled-projects.ts                   ← Detect stalled projects
  ├── revenue-drops.ts                      ← Detect revenue drops
  ├── velocity-issues.ts                    ← Detect velocity issues
  └── opportunity-detection.ts              ← Detect convergent insights
```

## How It Works

### 1. Pattern Detection

Each detector analyzes workspace data looking for specific patterns:

**Stalled Projects:**
- Finds projects with no activity in 14+ days
- Includes task count and last activity date

**Revenue Drops:**
- Tracks revenue objectives with progress entries
- Compares week-over-week averages
- Flags drops >10%

**Velocity Issues:**
- Compares task completion rates week-over-week
- Works at workspace, company, and project levels
- Flags drops >30%

**Opportunity Detection:**
- Groups AI insights by suggested actions
- Flags when 3+ insights suggest the same thing
- Identifies momentum opportunities (high velocity + positive insights)
- Detects strategic alignment (at-risk objectives + available insights)

### 2. Question Generation

Uses Claude (Anthropic) to generate natural language questions with actionable options:

```typescript
{
  "id": "question-123",
  "type": "stalled_project",
  "priority": "medium",
  "question": "Project 'Warranty Platform' hasn't had activity in 2 weeks. Should I:",
  "options": [
    { "id": "pause", "label": "Pause it", "action": "pause_project" },
    { "id": "checkin", "label": "Create check-in task", "action": "create_task" },
    { "id": "archive", "label": "Archive it", "action": "archive_project" }
  ],
  "context": {
    "projectId": "abc-123",
    "lastActivity": "2026-02-18",
    "daysStalled": 15
  },
  "timestamp": "2026-03-04T10:00:00Z"
}
```

### 3. Smart Filtering

- **Limit to 1-2 questions per day** - Avoid overwhelming the user
- **Track asked questions** - Don't repeat the same question within 7 days
- **Priority order** - Revenue drops > Velocity issues > Stalled projects > Opportunities

### 4. Response Handling

Doug will:
1. Display questions in Telegram with inline buttons
2. Store user responses
3. Execute chosen actions (pause project, create task, etc.)

## API Endpoint

### POST /api/cron/proactive-questions

Generate proactive questions for workspace(s).

**Authentication:**
```bash
Authorization: Bearer <CRON_SECRET>
```

**Query Parameters:**
- `workspaceId` (optional) - Generate for specific workspace only

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-03-04T10:00:00Z",
  "workspaceId": "dfd6d384-9e2f-4145-b4f3-254aa82c0237",
  "questions": [...],
  "count": 1,
  "detectedPatterns": {
    "stalledProjects": 3,
    "revenueDrops": 1,
    "velocityIssues": 2,
    "opportunities": 1
  }
}
```

**All Workspaces:**
```bash
curl -X POST "https://focus-app.com/api/cron/proactive-questions" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

**Single Workspace:**
```bash
curl -X POST "https://focus-app.com/api/cron/proactive-questions?workspaceId=xxx" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### GET /api/cron/proactive-questions

Test endpoint for manual testing (no auth required in development).

```bash
curl "http://localhost:3004/api/cron/proactive-questions?workspaceId=dfd6d384-9e2f-4145-b4f3-254aa82c0237"
```

## Environment Variables

Required in `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
CRON_SECRET=your-secret-here
```

## Schedule

Doug will call this endpoint daily at 10:00 AM via cron.

## Activity Logging

All asked questions are logged to `ActivityLog`:

```typescript
{
  eventType: 'ai.proactive_question.asked',
  eventPayload: {
    questionId: 'question-123',
    type: 'stalled_project',
    priority: 'medium',
    question: '...',
    context: {...}
  },
  aiAgent: 'proactive-questions'
}
```

This prevents asking the same question multiple times within 7 days.

## Testing

### Manual Test

```bash
# Start dev server
npm run dev

# Test question generation
curl "http://localhost:3004/api/cron/proactive-questions?workspaceId=dfd6d384-9e2f-4145-b4f3-254aa82c0237"
```

### Expected Behavior

- Returns empty questions if no patterns detected
- Returns 1-2 questions if patterns found
- Each question has natural language + actionable options
- Questions are logged to prevent repetition

## Future Enhancements

1. **More Pattern Types:**
   - Overdue task clusters
   - Milestone deadline risks
   - Resource allocation issues
   - Budget overruns

2. **Learning:**
   - Track which questions lead to action
   - Adjust priority based on user engagement
   - Learn user preferences

3. **Contextual Timing:**
   - Ask questions at optimal times
   - Different schedules per workspace
   - Snooze/remind later options

4. **Action Execution:**
   - One-click actions from Telegram
   - Automated workflows
   - Follow-up questions

## Implementation Notes

- Uses Prisma for database queries
- Claude API (Sonnet) for question generation
- Temperature 0.7 for natural but consistent output
- Max 500 tokens per question
- JSON parsing with markdown code block support

## Support

Questions? Check:
- `/lib/proactive-questions.ts` - Main logic
- `/lib/question-detectors/` - Pattern detection
- Prisma schema for data models
