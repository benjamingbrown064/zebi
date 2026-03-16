# Proactive Questions - Examples

Real-world examples of questions the system generates.

## Example 1: Stalled Project

**Pattern Detected:**
- Project: "Love Warranty Platform"
- Last Activity: 18 days ago
- Active Tasks: 12
- Company: Love Warranty

**Generated Question:**
```json
{
  "id": "question-1709555200-a3k2m9",
  "type": "stalled_project",
  "priority": "medium",
  "question": "Project 'Love Warranty Platform' hasn't had activity in 18 days and has 12 open tasks. What should we do?",
  "options": [
    {
      "id": "pause",
      "label": "Pause the project temporarily",
      "action": "pause_project"
    },
    {
      "id": "checkin",
      "label": "Create a check-in task for the team",
      "action": "create_task"
    },
    {
      "id": "review",
      "label": "Schedule a project review meeting",
      "action": "create_task"
    },
    {
      "id": "archive",
      "label": "Archive it (no longer needed)",
      "action": "archive_project"
    }
  ],
  "context": {
    "projectId": "proj-123",
    "projectName": "Love Warranty Platform",
    "companyId": "company-456",
    "companyName": "Love Warranty",
    "lastActivity": "2026-02-14T10:30:00Z",
    "daysStalled": 18,
    "taskCount": 12
  },
  "timestamp": "2026-03-04T10:00:00Z"
}
```

## Example 2: Revenue Drop

**Pattern Detected:**
- Company: Love Warranty
- Previous Week Revenue: $12,450
- This Week Revenue: $10,200
- Drop: 18.1%

**Generated Question:**
```json
{
  "id": "question-1709555201-b5x8n2",
  "type": "revenue_drop",
  "priority": "high",
  "question": "Love Warranty revenue dropped 18% this week ($12,450 → $10,200). How should we respond?",
  "options": [
    {
      "id": "investigate",
      "label": "Create investigation task to find root cause",
      "action": "create_investigation_task"
    },
    {
      "id": "meeting",
      "label": "Schedule emergency revenue review",
      "action": "create_task"
    },
    {
      "id": "review_metrics",
      "label": "Review all company metrics",
      "action": "review_metrics"
    },
    {
      "id": "alert_team",
      "label": "Alert team and request status updates",
      "action": "notify_team"
    }
  ],
  "context": {
    "companyId": "company-456",
    "companyName": "Love Warranty",
    "currentRevenue": 10200,
    "previousRevenue": 12450,
    "dropPercent": 18.1,
    "weekRange": "Feb 25 - Mar 3"
  },
  "timestamp": "2026-03-04T10:00:00Z"
}
```

## Example 3: Velocity Issue

**Pattern Detected:**
- Scope: Company
- Company: Love Warranty
- Previous Week: 8 tasks completed
- This Week: 3 tasks completed
- Drop: 62.5%

**Generated Question:**
```json
{
  "id": "question-1709555202-c7p4k1",
  "type": "velocity_issue",
  "priority": "high",
  "question": "Task velocity at Love Warranty dropped 62% this week (8 → 3 tasks/week). What's happening?",
  "options": [
    {
      "id": "blockers",
      "label": "Check for blockers across all projects",
      "action": "identify_blockers"
    },
    {
      "id": "resources",
      "label": "Review resource allocation",
      "action": "review_resources"
    },
    {
      "id": "reprioritize",
      "label": "Reprioritize active tasks",
      "action": "reprioritize"
    },
    {
      "id": "standup",
      "label": "Schedule team standup",
      "action": "create_task"
    }
  ],
  "context": {
    "scope": "company",
    "companyId": "company-456",
    "companyName": "Love Warranty",
    "currentVelocity": 3,
    "previousVelocity": 8,
    "dropPercent": 62.5,
    "weekRange": "Feb 25 - Mar 3"
  },
  "timestamp": "2026-03-04T10:00:00Z"
}
```

## Example 4: Opportunity Detection

**Pattern Detected:**
- Type: Converging Insights
- 4 insights all suggest "improve_onboarding"
- Companies: Love Warranty, PolicyPro
- Confidence: 80%

**Generated Question:**
```json
{
  "id": "question-1709555203-d9w3h5",
  "type": "opportunity",
  "priority": "medium",
  "question": "Four recent insights across multiple companies all suggest improving customer onboarding. Should we take action?",
  "options": [
    {
      "id": "proceed",
      "label": "Create onboarding improvement project",
      "action": "create_project"
    },
    {
      "id": "review",
      "label": "Review all insights in detail",
      "action": "review_insights"
    },
    {
      "id": "research",
      "label": "Research best practices first",
      "action": "create_task"
    },
    {
      "id": "dismiss",
      "label": "Not a priority right now",
      "action": "dismiss"
    }
  ],
  "context": {
    "opportunityType": "converging_insights",
    "title": "Multiple Insights Suggest: improve_onboarding",
    "description": "4 insights from the past 2 weeks all suggest taking action on: improve_onboarding",
    "suggestedAction": "improve_onboarding",
    "confidence": 80,
    "relatedInsightIds": ["insight-1", "insight-2", "insight-3", "insight-4"],
    "contextData": {
      "insightCount": 4,
      "insightTypes": ["velocity", "quality", "risk", "opportunity"],
      "companies": ["company-456", "company-789"]
    }
  },
  "timestamp": "2026-03-04T10:00:00Z"
}
```

## Example 5: Momentum Opportunity

**Pattern Detected:**
- Company: PolicyPro
- This Week: 12 tasks completed
- Positive Insights: 3
- Pattern: High velocity + positive signals

**Generated Question:**
```json
{
  "id": "question-1709555204-e2r6t8",
  "type": "opportunity",
  "priority": "low",
  "question": "PolicyPro is crushing it! 12 tasks completed this week with strong positive momentum. Ready to level up?",
  "options": [
    {
      "id": "scale",
      "label": "Add more ambitious objectives",
      "action": "create_objectives"
    },
    {
      "id": "resources",
      "label": "Allocate more resources",
      "action": "allocate_resources"
    },
    {
      "id": "celebrate",
      "label": "Celebrate wins with team",
      "action": "notify_team"
    },
    {
      "id": "continue",
      "label": "Keep current pace (no change)",
      "action": "continue"
    }
  ],
  "context": {
    "opportunityType": "momentum",
    "companyId": "company-789",
    "companyName": "PolicyPro",
    "weeklyVelocity": 12,
    "positiveInsightCount": 3,
    "confidence": 80
  },
  "timestamp": "2026-03-04T10:00:00Z"
}
```

## How Doug Displays These

In Telegram, questions appear as:

```
🤖 Daily Check-in (10:00 AM)

⚠️ Love Warranty revenue dropped 18% this week ($12,450 → $10,200). How should we respond?

[🔍 Investigate cause]  [📅 Schedule review]
[📊 Review metrics]     [👥 Alert team]
```

User clicks a button → Doug executes the action → Confirms completion.

## Question Priority

- **High** - Revenue drops >25%, velocity drops >50%, urgent
- **Medium** - Most stalled projects, moderate drops
- **Low** - Opportunities, positive momentum

High priority questions are asked first (max 2/day).

## Contextual Variations

The system generates different question styles based on:

- **Severity** - More urgent language for critical issues
- **Trend** - Different tone for improving vs declining metrics
- **History** - References past patterns when relevant
- **Stakeholders** - Adjusts options based on user role

## Response Tracking

When user responds, Doug:

1. Logs the response
2. Executes the chosen action
3. Creates follow-up tasks if needed
4. Updates the pattern state
5. Schedules check-in if appropriate

Example response log:
```json
{
  "questionId": "question-1709555200-a3k2m9",
  "response": "checkin",
  "action": "create_task",
  "timestamp": "2026-03-04T10:15:00Z",
  "executionResult": {
    "taskId": "task-999",
    "title": "Check-in on Love Warranty Platform",
    "status": "created"
  }
}
```
