# Doug's Heartbeat Integration Guide

**Purpose:** How Doug (AI) integrates with Focus App proactive communication during heartbeats

---

## Architecture

**Cron jobs generate content** → **Doug's heartbeat checks endpoints** → **Doug sends to Telegram**

This keeps Telegram credentials out of Focus App and gives Doug full control over messaging.

---

## Heartbeat Schedule

**Doug's heartbeat runs every ~30 minutes**

During each heartbeat, Doug should:
1. Check if any cron-generated content needs sending
2. Pull next work item from AI queue
3. Complete any AI-assigned tasks
4. Send scheduled messages

---

## Endpoints Doug Should Check

### 1. Morning Briefing (8am daily)

**Check:** Around 8:00-8:30am daily

```bash
GET https://focus-app.vercel.app/api/cron/morning-briefing?workspaceId=xxx
```

**Response:**
```json
{
  "success": true,
  "briefing": "🌅 *Morning Briefing* - March 5...",
  "data": { ... },
  "messageId": "briefing-2026-03-05",
  "timestamp": "2026-03-05T08:00:00Z"
}
```

**Doug's action:**
1. Check if already sent today (store last sent date)
2. If not sent, call `message` tool to send briefing
3. Track sent in memory/file: `last_briefing_sent: 2026-03-05`

---

### 2. Proactive Questions (10am daily)

**Check:** Around 10:00-10:30am daily

```bash
GET https://focus-app.vercel.app/api/cron/proactive-questions?workspaceId=xxx
```

**Response:**
```json
{
  "success": true,
  "questions": [
    {
      "id": "question-123",
      "type": "stalled_project",
      "question": "Project X hasn't moved in 2 weeks. Should I:",
      "options": [
        { "id": "pause", "label": "Pause it", "action": "pause_project" },
        { "id": "checkin", "label": "Create check-in task" },
        { "id": "archive", "label": "Archive it" }
      ],
      "context": { "projectId": "abc-123" }
    }
  ]
}
```

**Doug's action:**
1. Check if questions already sent today
2. Send each question as Telegram message with inline buttons
3. Track sent questions: `sent_questions: ["question-123"]`
4. When user responds, execute chosen action

---

### 3. Alert Check (every 6 hours)

**Check:** Every heartbeat (filter by timestamp)

```bash
GET https://focus-app.vercel.app/api/cron/check-alerts?workspaceId=xxx
```

**Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "id": "alert-456",
      "type": "new_insight",
      "priority": "medium",
      "message": "💡 New insight: Enterprise partnerships",
      "actionUrl": "/insights/abc-123",
      "timestamp": "2026-03-05T06:15:00Z"
    }
  ]
}
```

**Doug's action:**
1. Filter alerts by timestamp (only send new ones)
2. Track last alert check time: `last_alert_check: 2026-03-05T06:00:00Z`
3. Send critical/high priority immediately
4. Batch medium/low priority (max 3 per message)
5. Store sent alert IDs: `sent_alerts: ["alert-456"]`

---

### 4. Daily Summary (6pm daily)

**Check:** Around 18:00-18:30pm daily

```bash
GET https://focus-app.vercel.app/api/cron/daily-summary?workspaceId=xxx
```

**Response:**
```json
{
  "success": true,
  "summary": "📊 *Daily Work Summary* - March 5...",
  "data": { ... },
  "messageId": "summary-2026-03-05"
}
```

**Doug's action:**
1. Check if already sent today
2. Send summary to Telegram
3. Track sent: `last_summary_sent: 2026-03-05`

---

## Doug's Heartbeat State File

**Location:** `/Users/botbot/.openclaw/workspace/focus-app-heartbeat-state.json`

```json
{
  "lastBriefingSent": "2026-03-05",
  "lastSummarySent": "2026-03-04",
  "lastAlertCheck": "2026-03-05T12:00:00Z",
  "sentAlerts": ["alert-123", "alert-456"],
  "sentQuestions": ["question-789"],
  "lastWorkQueueCheck": "2026-03-05T12:15:00Z"
}
```

**Operations:**
- Read at start of heartbeat
- Update after sending each message
- Write back at end of heartbeat

---

## Telegram Message Format

### Morning Briefing
```
🌅 *Morning Briefing* - March 5, 2026

👤 *Your Tasks Today:*
• Review dealer terms (15 min)
• Approve marketing plan

🎯 *Objectives Needing Attention:*
• SimpleTasks MVP: 23% complete ⚠️

🤖 *AI Work Queue:*
15 tasks ready

📊 *Yesterday:*
8 tasks completed, 2 insights generated
```

### Alert
```
⚠️ *Alert: Goal at Risk*

SimpleTasks MVP objective is at risk:
• 23% complete with 26 days left
• Velocity: 3 tasks/week (need 7/week)

[View Details](/objectives/abc-123)
```

### Proactive Question
```
🤔 *Question: Stalled Project*

Project "Warranty Platform" hasn't had activity in 2 weeks.

What should I do?

[Pause it] [Create check-in task] [Archive it]
```

### Daily Summary
```
📊 *Daily Work Summary* - March 5, 2026

💼 *Companies:*
• Love Warranty: 5 tasks completed, 1 insight

📝 *Documents:* 3 created
💡 *Insights:* 4 new opportunities
🔄 *Tomorrow's Queue:* 15 tasks ready
```

---

## Heartbeat Pseudo-Code

```javascript
async function heartbeat() {
  const state = await readState('focus-app-heartbeat-state.json')
  const now = new Date()
  
  // 1. Morning Briefing (8am-9am)
  if (isTimeRange(now, '08:00', '09:00') && !sentToday(state.lastBriefingSent)) {
    const briefing = await fetch('/api/cron/morning-briefing?workspaceId=xxx')
    if (briefing.success) {
      await sendTelegram(briefing.briefing)
      state.lastBriefingSent = today()
    }
  }
  
  // 2. Proactive Questions (10am-11am)
  if (isTimeRange(now, '10:00', '11:00') && !state.sentQuestions.includes('today')) {
    const questions = await fetch('/api/cron/proactive-questions?workspaceId=xxx')
    for (const q of questions.questions) {
      if (!state.sentQuestions.includes(q.id)) {
        await sendTelegramWithButtons(q.question, q.options)
        state.sentQuestions.push(q.id)
      }
    }
  }
  
  // 3. Alerts (every heartbeat, filter new)
  const alerts = await fetch('/api/cron/check-alerts?workspaceId=xxx')
  const newAlerts = alerts.alerts.filter(a => !state.sentAlerts.includes(a.id))
  for (const alert of newAlerts) {
    if (alert.priority === 'critical' || alert.priority === 'high') {
      await sendTelegram(alert.message)
      state.sentAlerts.push(alert.id)
    }
  }
  
  // 4. Daily Summary (6pm-7pm)
  if (isTimeRange(now, '18:00', '19:00') && !sentToday(state.lastSummarySent)) {
    const summary = await fetch('/api/cron/daily-summary?workspaceId=xxx')
    if (summary.success) {
      await sendTelegram(summary.summary)
      state.lastSummarySent = today()
    }
  }
  
  // 5. Work Queue (every heartbeat)
  const queue = await fetch('/api/ai/queue/next?workspaceId=xxx')
  if (queue.item) {
    const result = await doWork(queue.item)
    await fetch('/api/ai/queue/complete', {
      method: 'POST',
      body: JSON.stringify({ itemId: queue.item.id, success: true, workLog: result })
    })
  }
  
  // Save state
  await writeState('focus-app-heartbeat-state.json', state)
}
```

---

## Testing Doug's Integration

### Local Testing
1. Call endpoints manually to verify content
2. Test state tracking (read/write JSON)
3. Test Telegram sending with message tool
4. Verify time-based logic

### Production Testing
1. Monitor first morning briefing (8am)
2. Check first proactive question (10am)
3. Verify alerts trigger correctly
4. Confirm daily summary sends (6pm)
5. Adjust thresholds if needed

---

## Configuration

**Environment Variables (Doug's system):**
- `FOCUS_APP_URL` = `https://focus-app.vercel.app`
- `FOCUS_APP_WORKSPACE_ID` = `dfd6d384-9e2f-4145-b4f3-254aa82c0237`
- `TELEGRAM_CHAT_ID` = `8494814048` (Ben's chat ID)

**Heartbeat State File:**
- Location: `/Users/botbot/.openclaw/workspace/focus-app-heartbeat-state.json`
- Created automatically on first run
- Persists across restarts

---

## Success Metrics

✅ **Morning briefings sent at 8am daily**
✅ **Proactive questions asked when patterns detected (max 2/day)**
✅ **Critical alerts sent within 10 minutes**
✅ **Daily summaries sent at 6pm daily**
✅ **No duplicate messages**
✅ **No spam (max 5-7 messages/day total)**

---

**Doug will integrate this during his heartbeat system. The Focus App endpoints are ready, Doug just needs to check them and send to Telegram.**
