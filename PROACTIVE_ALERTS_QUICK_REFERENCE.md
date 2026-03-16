# Proactive Alerts - Quick Reference

**Feature**: AI Daily Analysis & Alerts  
**Version**: Week 4  
**Status**: ✅ Production Ready

---

## 🎯 What It Does

Every morning at 6am, your AI assistant analyzes your workspace and proactively alerts you to:
- **Risks**: Late tasks, blocked objectives, stuck tasks
- **Opportunities**: Good momentum, clear path forward
- **Warnings**: Approaching deadlines with no progress

---

## 📍 Where to Find It

### Dashboard
1. Open `/dashboard`
2. Scroll to "AI Activity" card
3. See timeline of alerts and suggestions

### Filter Options
- **All Activity**: Everything
- **Alerts**: General alerts
- **Risks**: Things that need attention
- **Opportunities**: Positive trends
- **Warnings**: Upcoming issues
- **Suggestions**: AI recommendations

---

## 🚨 Alert Types

### Risk: Late Tasks
**What**: Tasks past their deadline  
**Priority**: 70-95 (high to critical)  
**Example**: "Task overdue: Fix critical bug" (2 days late)

### Risk: Blocked Objectives
**What**: Objectives with no tasks in 7+ days  
**Priority**: 60-95 (medium to critical)  
**Example**: "Objective inactive: Launch product" (No tasks created this week)

### Warning: Stuck Tasks
**What**: Tasks unchanged for 5+ days  
**Priority**: 50-80 (medium to high)  
**Example**: "Task stuck: Design mockups" (No updates in 8 days)

### Warning: Deadline Approaching
**What**: Tasks/objectives due soon with little/no progress  
**Priority**: 75-90 (high to critical)  
**Example**: "Deadline approaching: Submit proposal" (Due in 3 days, 0% done)

### Opportunity: Good Momentum
**What**: 3+ tasks completed this week  
**Priority**: 65 (medium)  
**Example**: "🎉 Great momentum this week!" (5 tasks completed)

---

## 🔔 Priority Levels

| Icon | Level | Priority | Action |
|------|-------|----------|--------|
| 🔴 | Critical | 90-100 | Do today |
| 🟠 | High | 70-89 | Address within 24h |
| 🟡 | Medium | 50-69 | Review this week |
| 🟢 | Low | 0-49 | Monitor |

---

## 🎨 Visual Indicators

### Critical Alerts
- Red border
- Red background tint
- "Critical" badge
- Red icon background

### Icon Colors
- 🔴 Risk: Red
- 🟠 Warning: Orange
- 🟢 Opportunity: Green
- 🟡 Alert: Yellow
- 🔵 Task/Objective: Blue
- 🟣 Suggestion: Purple

---

## ⚙️ How It Works

### Daily Analysis (6am)
1. AI fetches your workspace data
2. Analyzes tasks, objectives, progress
3. Detects risks, opportunities, warnings
4. Prioritizes alerts (0-100 score)
5. Saves to database
6. Displays in activity feed

### What It Analyzes
- Tasks (status, deadlines, updates)
- Objectives (progress, milestones, tasks)
- Projects (activity, completion rate)
- Blockers (active, severity)
- Recent activity (completed tasks)

---

## 📊 Example Alerts

### Late Task (Critical)
```
🔴 Task overdue: Fix login bug
This task is 3 days late (Project: Auth System).

Reasoning: Late tasks can block progress and create 
bottlenecks. Priority 0 tasks should be addressed 
immediately.

Priority: 92% | Critical
```

### Blocked Objective (High)
```
🟠 Objective inactive: Increase revenue
No tasks created in the last 7 days for Acme Corp. 
Progress: 45%

Reasoning: Objectives need consistent momentum. 
7 days without new tasks suggests this may be stuck 
or forgotten.

Priority: 80% | High
```

### Good Momentum (Medium)
```
🟢 Great momentum this week!
You've completed 7 tasks in the last 7 days. Keep it up!

Reasoning: Consistent progress builds momentum. 
Celebrate wins and maintain this pace.

Priority: 65% | Medium
```

---

## 🛠️ Actions

### View Alert
Click the alert title to navigate to the related task/objective

### Dismiss Alert
Not implemented yet (coming soon)

### Implement Suggestion
Not implemented yet (coming soon)

---

## 🧪 Testing (Dev Only)

### Manual Trigger (Single Workspace)
```bash
curl "http://localhost:3000/api/cron/ai-daily-analysis?workspaceId=XXX"
```

### Manual Trigger (All Workspaces)
```bash
curl "http://localhost:3000/api/cron/ai-daily-analysis"
```

### Check Database
```sql
SELECT * FROM ai_suggestions 
WHERE workspaceId = 'XXX' 
  AND type IN ('alert', 'risk', 'opportunity', 'warning')
ORDER BY createdAt DESC;
```

### Fetch Activity Feed
```bash
curl "http://localhost:3000/api/ai-activity?workspaceId=XXX&limit=10"
```

---

## 📅 Schedule

| Job | Schedule | Purpose |
|-----|----------|---------|
| AI Daily Analysis | 6:00 AM | Detect risks/opportunities |
| Generate Insights | 6:00 AM | Weekly insights |
| Morning Briefing | 8:00 AM | Daily summary |
| Proactive Questions | 10:00 AM | Check-in questions |
| Daily Summary | 6:00 PM | End-of-day recap |

---

## 🔧 Configuration

### Alert Expiration
- Alerts expire after **48 hours**
- Old alerts (>24h) marked as "expired" on next run
- Only "pending" alerts shown in feed

### AI Model
- **Model**: OpenAI GPT-4o-mini
- **Temperature**: 0.5
- **Max tokens**: 1500
- **Cost**: ~$0.0001 per workspace per day

### Activity Feed Limits
- **Dashboard**: Last 10 activities
- **Full page**: Configurable (default: 30)
- **API**: Max 100 per request

---

## 🎯 Best Practices

### For Best Results
1. Keep deadlines up to date
2. Update task status regularly
3. Add tasks to objectives weekly
4. Complete tasks promptly
5. Review alerts daily

### Common Patterns
- **Morning routine**: Check alerts at 8am
- **Weekly review**: Filter by "risk" on Mondays
- **Sprint planning**: Review "opportunity" alerts
- **End of day**: Check "warning" alerts

---

## 🐛 Troubleshooting

### No Alerts Showing
1. Check if cron ran (logs in Vercel)
2. Verify workspace has data (tasks, objectives)
3. Check database for alerts
4. Refresh dashboard

### Too Many Alerts
1. Review "critical" alerts first
2. Filter by type (risk/warning)
3. Update task statuses to reduce noise
4. Complete overdue tasks

### Alerts Not Relevant
- AI is still learning your patterns
- False positives will decrease over time
- Provide feedback (coming soon)

---

## 📱 Mobile

### Layout
- Activity feed stacks vertically
- Filters at top
- Touch-friendly tap targets
- Swipe to dismiss (coming soon)

### Performance
- Optimized for slow networks
- Skeleton loading states
- Cached data (5 min)

---

## 🔮 Coming Soon

- [ ] Dismiss alerts
- [ ] Mark as "won't fix"
- [ ] Snooze alerts (remind me later)
- [ ] Alert notifications (push/email)
- [ ] Custom alert rules
- [ ] Alert feedback ("was this helpful?")
- [ ] Historical trends
- [ ] Alert analytics dashboard

---

## 🆘 Support

### Need Help?
1. Check this guide
2. Review `WEEK4_PROACTIVE_ALERTS_COMPLETE.md`
3. Check Vercel logs
4. Contact Ben

### Found a Bug?
1. Note the alert details
2. Check console for errors
3. Take screenshot
4. Report to Ben

---

## 📚 Related Docs

- `WEEK4_PROACTIVE_ALERTS_COMPLETE.md` - Full implementation details
- `WEEK4_TEST_RESULTS.md` - Test results
- `ZEBI_AI_DEVELOPMENT_PLAN.md` - Overall AI plan
- `VERCEL_CRON_SETUP.md` - Cron configuration

---

**Last Updated**: 2026-03-07  
**Version**: 1.0  
**Status**: ✅ Production Ready
