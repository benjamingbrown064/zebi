# 🔔 Focus App Alert System

**Quick Reference for the Alert Detection System**

---

## 🎯 What It Does

Monitors the Focus App every 6 hours and detects:

- 💡 **New Insights** - AI-generated opportunities
- 🚫 **New Blockers** - Obstacles preventing progress
- ⏰ **Upcoming Deadlines** - Time-sensitive tasks and objectives
- ⚠️ **Goals at Risk** - Underperforming goals and projects

---

## 🚀 Quick Start

### For Doug (Integration)

```bash
# Call this endpoint every 6 hours
curl "https://focus.lovewarranty.com/api/cron/check-alerts?format=telegram&priority=critical,high"

# Parse response and send message field to Telegram
{
  "success": true,
  "count": 16,
  "message": "🔔 *Alert Summary* (16 total)\n\n⚠️ *HIGH* (15)\n..."
}
```

See: **`DOUG_ALERT_INTEGRATION.md`** for detailed integration guide.

### For Developers (Testing)

```bash
# Test all alert types
npx tsx test-alert-system.ts

# Test specific type
npx tsx test-alert-system.ts --type=new_insight

# Filter by priority
npx tsx test-alert-system.ts --priority=critical,high

# Test API endpoint
curl "http://localhost:3000/api/cron/check-alerts?format=telegram"
```

See: **`ALERT_SYSTEM_COMPLETE.md`** for technical documentation.

---

## 📁 Files

```
focus-app/
├── app/api/cron/check-alerts/
│   └── route.ts                    # API endpoint (GET/POST)
│
├── lib/
│   ├── alert-system.ts            # Core orchestration
│   └── alert-types/               # Individual detectors
│       ├── index.ts
│       ├── new-insights.ts
│       ├── new-blockers.ts
│       ├── upcoming-deadlines.ts
│       └── goals-at-risk.ts
│
├── test-alert-system.ts           # Test script
│
└── Documentation
    ├── ALERT_SYSTEM_README.md     # This file
    ├── ALERT_SYSTEM_COMPLETE.md   # Technical docs
    ├── DOUG_ALERT_INTEGRATION.md  # Doug's guide
    └── ALERT_SYSTEM_HANDOFF.md    # Project handoff
```

---

## ✅ Status

**COMPLETE and TESTED**

- ✅ All 4 alert types implemented
- ✅ API endpoint working (GET/POST)
- ✅ Priority filtering working
- ✅ Telegram formatting validated
- ✅ Test script comprehensive
- ✅ Documentation complete
- ✅ Production-ready

**Last tested:** 2026-03-04 21:50 GMT  
**Test result:** 16 alerts detected successfully

---

## 📊 Alert Types

| Type | Emoji | Time Window | Priority Logic |
|------|-------|-------------|----------------|
| New Insights | 💡 | Last 6 hours | High (priority ≥3), Medium (otherwise) |
| New Blockers | 🚫 | Last 6 hours | Critical > High > Medium |
| Upcoming Deadlines | ⏰ | Next 24 hours | Critical (<6h), High (otherwise) |
| Goals at Risk | ⚠️ | Current status | High (goals/blocked), Medium (velocity) |

---

## 🔧 Configuration

### API Parameters

```bash
# Workspace (optional, defaults to Love Warranty)
?workspaceId=dfd6d384-9e2f-4145-b4f3-254aa82c0237

# Time window (optional, default: 6)
?hoursAgo=6

# Priority filter (optional, comma-separated)
?priority=critical,high,medium,low

# Output format (optional, default: json)
?format=telegram  # or json
```

### Recommended Settings for Doug

```bash
?format=telegram&priority=critical,high
```

This gives pre-formatted Telegram messages with only important alerts.

---

## 🧪 Testing

### Run Full Test Suite
```bash
npx tsx test-alert-system.ts
```

### Test Specific Alert Type
```bash
npx tsx test-alert-system.ts --type=new_insight
npx tsx test-alert-system.ts --type=new_blocker
npx tsx test-alert-system.ts --type=upcoming_deadline
npx tsx test-alert-system.ts --type=goal_at_risk
```

### Test Priority Filtering
```bash
npx tsx test-alert-system.ts --priority=critical,high
npx tsx test-alert-system.ts --priority=medium,low
```

### Test Time Windows
```bash
npx tsx test-alert-system.ts --hours=12
npx tsx test-alert-system.ts --hours=3
```

---

## 📖 Documentation

| File | Purpose | Audience |
|------|---------|----------|
| **ALERT_SYSTEM_README.md** | Quick reference | Everyone |
| **ALERT_SYSTEM_COMPLETE.md** | Full technical docs | Developers |
| **DOUG_ALERT_INTEGRATION.md** | Integration guide | Doug |
| **ALERT_SYSTEM_HANDOFF.md** | Project completion | Project manager |

---

## 🎯 Next Steps

### For Doug
1. Read `DOUG_ALERT_INTEGRATION.md`
2. Set up cron job (0 */6 * * *)
3. Implement Telegram delivery
4. Monitor for 24 hours
5. Adjust priority filter if needed

### For Developers
1. Deploy to production
2. Verify database indexes
3. Set up monitoring
4. Document any customizations

### For Product Team
1. Review alert types and priorities
2. Validate alert messages are clear
3. Confirm action URLs are correct
4. Provide feedback on alert volume

---

## 🔍 Troubleshooting

### No Alerts
- Check workspace ID matches database
- Verify data exists in time window
- Remove priority filter to see all

### Too Many Alerts
- Use priority filter: `?priority=critical,high`
- Adjust time window: `?hoursAgo=3`
- Review alert criteria in code

### Wrong Format
- Check `?format=telegram` parameter
- Verify message field in response
- Test with curl first

### API Errors
- Check database connection
- Verify Prisma client updated
- Review server logs

---

## 📞 Support

**Need Help?**

1. Check this README for quick answers
2. Check `ALERT_SYSTEM_COMPLETE.md` for technical details
3. Check `DOUG_ALERT_INTEGRATION.md` for integration help
4. Run `npx tsx test-alert-system.ts` to verify system
5. Check server logs for detailed errors

---

## 🎉 Success!

The alert system is **fully functional and ready for production**.

**No development work remaining. Ready to deploy!**

---

*Built with precision for the Focus App team.*  
*Last updated: 2026-03-04*
