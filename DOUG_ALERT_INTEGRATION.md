# 🤖 Doug's Alert Integration Guide

**Quick Start Guide for Integrating Focus App Alerts**

---

## 🎯 What Doug Needs to Do

Call this endpoint every 6 hours:

```bash
GET/POST https://focus.lovewarranty.com/api/cron/check-alerts?format=telegram&priority=critical,high
```

Then send the `message` field to Telegram. That's it!

---

## 📞 API Call

### URL
```
https://focus.lovewarranty.com/api/cron/check-alerts
```

### Method
`GET` or `POST` (both work the same)

### Query Parameters
```
?format=telegram              # Pre-formatted for Telegram
&priority=critical,high       # Only show important alerts
```

### Response
```json
{
  "success": true,
  "messageId": "alert-check-2026-03-04-21",
  "timestamp": "2026-03-04T21:48:29.362Z",
  "count": 16,
  "message": "🔔 *Alert Summary* (16 total)\n\n⚠️ *HIGH* (15)\n⏰ Deadline: Task X due in 4 hours\n💡 New insight: Enterprise partnerships\n\n📌 *MEDIUM* (1)\n💡 New insight: Market timing advantage",
  "alerts": [...]
}
```

---

## 📤 Send to Telegram

### Simple Version (Recommended)
```javascript
// 1. Call the API
const response = await fetch(
  'https://focus.lovewarranty.com/api/cron/check-alerts?format=telegram&priority=critical,high'
);
const data = await response.json();

// 2. Check if there are alerts
if (data.success && data.count > 0) {
  // 3. Send the pre-formatted message
  await sendToTelegram(data.message);
  
  // 4. Store the messageId (optional - for tracking)
  await storeMessageId(data.messageId);
}
```

### Message Format
The `message` field is already formatted with:
- Markdown formatting (`*bold*`)
- Emoji indicators (🔔 ⚠️ 💡 🚫 ⏰)
- Priority grouping (Critical → High → Medium)
- Clean line breaks

**Just send it as-is to Telegram!**

---

## 🕐 Scheduling

### Cron Expression
```
0 */6 * * *
```
This runs at: 00:00, 06:00, 12:00, 18:00 UTC

### Example Schedule
```javascript
{
  "name": "focus-app-alerts",
  "schedule": "0 */6 * * *",
  "endpoint": "https://focus.lovewarranty.com/api/cron/check-alerts",
  "params": {
    "format": "telegram",
    "priority": "critical,high"
  },
  "enabled": true
}
```

---

## 🎚️ Priority Filtering

### Recommended: critical,high
Most balanced - catches important stuff, avoids noise.

```
?priority=critical,high
```

### All Alerts (Noisy)
```
# No priority filter - gets everything
/api/cron/check-alerts?format=telegram
```

### Critical Only (Miss Important Stuff)
```
?priority=critical
```

**Doug's Choice:** Stick with `critical,high` for best signal-to-noise ratio.

---

## 🔔 Alert Types You'll See

### 💡 New Insights
```
💡 New insight: Enterprise partnerships - Love Warranty
```
**Action:** Review and implement if valuable

### 🚫 New Blockers
```
🚫 New blocker: Missing API credentials - Severity: critical
```
**Action:** Resolve blocker ASAP

### ⏰ Upcoming Deadlines
```
⏰ Deadline: Launch MVP due in 4 hours
⏰ Deadline: Q1 Revenue - 75% complete, 5 days left
```
**Action:** Focus work on these tasks/objectives

### ⚠️ Goals at Risk
```
⚠️ Risk: Q1 MRR Target - 25% complete, 15 days left
⚠️ Risk: Product Launch - Blocked for 4 days
⚠️ Risk: Website Redesign - Velocity dropped 67%
```
**Action:** Investigate and create action plan

---

## 🚫 Avoiding Duplicates

### Option 1: Track messageId (Simple)
```javascript
const lastMessageId = await getLastMessageId();
if (data.messageId === lastMessageId) {
  console.log('Already sent this batch');
  return;
}
await storeMessageId(data.messageId);
```

### Option 2: Track Individual Alerts (Advanced)
```javascript
const sentAlertIds = await getSentAlertIds();
const newAlerts = data.alerts.filter(
  alert => !sentAlertIds.includes(alert.id)
);

if (newAlerts.length > 0) {
  await sendAlertsToTelegram(newAlerts);
  await storeSentAlertIds(newAlerts.map(a => a.id));
}
```

**Doug's Choice:** Option 1 is simpler and works great.

---

## 🧪 Testing

### Test the Endpoint
```bash
curl "https://focus.lovewarranty.com/api/cron/check-alerts?format=telegram&priority=critical,high"
```

### Expected Response
```json
{
  "success": true,
  "messageId": "alert-check-2026-03-04-21",
  "count": 5,
  "message": "🔔 *Alert Summary* (5 total)\n\n⚠️ *HIGH* (5)\n..."
}
```

### Test Telegram Delivery
```javascript
// Dry run - just log the message
console.log(data.message);

// Real test - send to test channel
await sendToTelegram(data.message, { chatId: TEST_CHAT_ID });
```

---

## ⚡ Quick Implementation

### Minimal Working Example
```javascript
// Doug's alert checker (runs every 6 hours)

async function checkAndSendAlerts() {
  try {
    // 1. Fetch alerts
    const res = await fetch(
      'https://focus.lovewarranty.com/api/cron/check-alerts?format=telegram&priority=critical,high'
    );
    const data = await res.json();
    
    // 2. Check success and count
    if (!data.success) {
      console.error('Alert check failed:', data.error);
      return;
    }
    
    if (data.count === 0) {
      console.log('✅ No alerts - all clear!');
      return;
    }
    
    // 3. Send to Telegram
    console.log(`📤 Sending ${data.count} alerts...`);
    await sendToTelegram(data.message);
    
    // 4. Log success
    console.log(`✅ Alerts sent successfully (${data.messageId})`);
    
  } catch (error) {
    console.error('Error checking alerts:', error);
    // Alert admin if this fails repeatedly
  }
}

// Schedule this to run every 6 hours
```

---

## 🔍 Troubleshooting

### No Alerts Showing Up
- Check if there are actually any alerts in the DB
- Remove priority filter to see all alerts
- Check workspace ID is correct

### Getting 404
- Server might not be running
- Endpoint path might be wrong (check for typos)
- Next.js might need restart

### Getting 500
- Check server logs
- Database connection might be down
- Prisma client might need regeneration

### Duplicate Alerts
- Implement messageId tracking
- Check cron isn't running multiple times
- Clear old tracking data after 24 hours

---

## 📊 What to Expect

### Typical Alert Volume
- **Quiet day:** 0-5 alerts
- **Normal day:** 5-15 alerts
- **Busy day:** 15-30 alerts

### Alert Frequency by Type
- **New Insights:** 2-5 per 6 hours
- **New Blockers:** 0-2 per 6 hours
- **Deadlines:** 1-5 per 6 hours
- **Goals at Risk:** 0-3 per 6 hours

### When to Alert Admin
- No response from API (3+ failures)
- >50 alerts in one batch (something's wrong)
- All alerts are critical (investigate immediately)

---

## ✅ Launch Checklist

- [ ] Test API endpoint responds correctly
- [ ] Test Telegram formatting looks good
- [ ] Set up cron schedule (0 */6 * * *)
- [ ] Implement duplicate prevention
- [ ] Add error handling and retries
- [ ] Set up admin alerts for failures
- [ ] Monitor for 24 hours
- [ ] Adjust priority filter if needed

---

## 🎉 You're Ready!

Once this is live, you'll never miss an important event in the Focus App. The system will keep everyone informed about:

- ✅ New opportunities (insights)
- ✅ Roadblocks (blockers)
- ✅ Time-sensitive tasks (deadlines)
- ✅ At-risk goals and projects

**Let's ship it! 🚀**

---

## 📞 Need Help?

Check:
1. `ALERT_SYSTEM_COMPLETE.md` - Full technical documentation
2. Server logs - Look for `[API:cron:check-alerts]` entries
3. Test script - `npx tsx test-alert-system.ts`

**Built for Doug with ❤️**
