# Vercel Cron Setup Guide

## ✅ Configuration Complete

**Files created:**
- `vercel.json` - Cron schedule configuration
- `.env.local` - Contains `CRON_SECRET` for authentication

---

## Cron Schedule

| Endpoint | Schedule | Runs | Purpose |
|----------|----------|------|---------|
| `/api/cron/repeating-tasks` | `0 * * * *` | Every hour | Generate tasks from templates |
| `/api/cron/generate-insights` | `0 6 * * *` | 6am daily | AI strategic analysis |
| `/api/cron/daily-summary` | `0 18 * * *` | 6pm daily | Daily work summary |

---

## Deploy to Vercel

### Step 1: Set Environment Variable

In Vercel dashboard:
1. Go to project settings
2. Navigate to **Environment Variables**
3. Add:
   - **Name:** `CRON_SECRET`
   - **Value:** `d8400c9a5c42a62e1c15797d189071fa65dc5d30ad1d297e930a408aec3f0a4f`
   - **Environments:** Production, Preview, Development

### Step 2: Deploy

```bash
cd /Users/botbot/.openclaw/workspace/focus-app
vercel --prod
```

### Step 3: Verify Cron Jobs

After deployment:
1. Go to Vercel dashboard → Deployments → Cron Jobs
2. Verify 3 cron jobs are registered
3. Check execution logs

---

## Testing Cron Jobs Locally

**Method 1: Direct curl**
```bash
# Repeating tasks (hourly)
curl -X POST http://localhost:3002/api/cron/repeating-tasks \
  -H "Authorization: Bearer d8400c9a5c42a62e1c15797d189071fa65dc5d30ad1d297e930a408aec3f0a4f"

# Insights (6am daily)
curl -X POST http://localhost:3002/api/cron/generate-insights \
  -H "Authorization: Bearer d8400c9a5c42a62e1c15797d189071fa65dc5d30ad1d297e930a408aec3f0a4f"

# Summary (6pm daily)
curl -X POST http://localhost:3002/api/cron/daily-summary \
  -H "Authorization: Bearer d8400c9a5c42a62e1c15797d189071fa65dc5d30ad1d297e930a408aec3f0a4f"
```

**Method 2: GET endpoints (dev mode only)**
```bash
curl http://localhost:3002/api/cron/repeating-tasks?workspaceId=dfd6d384-9e2f-4145-b4f3-254aa82c0237
curl http://localhost:3002/api/cron/generate-insights?workspaceId=dfd6d384-9e2f-4145-b4f3-254aa82c0237
curl http://localhost:3002/api/cron/daily-summary?workspaceId=dfd6d384-9e2f-4145-b4f3-254aa82c0237
```

---

## Authentication

All cron endpoints require authentication:

**Production (POST):**
- Header: `Authorization: Bearer <CRON_SECRET>`
- Vercel automatically adds this header to cron requests

**Development (GET):**
- Query param: `?workspaceId=xxx`
- No auth required for GET in dev mode

---

## Monitoring

**Check cron execution:**
1. Vercel dashboard → Functions → Cron Jobs
2. View logs for each execution
3. Monitor success/failure rates

**Check results in app:**
- Insights: `/insights` page
- Summaries: Activity log in database
- Queue: `/api/ai/queue/status`

---

## Troubleshooting

**Cron not running:**
- Verify `CRON_SECRET` is set in Vercel
- Check cron job is registered in Vercel dashboard
- Review function logs for errors

**Authentication failures:**
- Ensure `CRON_SECRET` matches in .env.local and Vercel
- Verify Authorization header format: `Bearer <token>`

**Timeout errors:**
- Insights generation can take 30-60s
- Increase function timeout in Vercel settings if needed
- Default: 10s (Hobby), 60s (Pro)

---

## Next Steps

1. ✅ Configuration complete
2. Set `CRON_SECRET` in Vercel environment variables
3. Deploy to production
4. Verify cron jobs appear in dashboard
5. Test first execution manually
6. Monitor daily for a few days
7. Integrate Doug's heartbeat with work queue

**Daily summary will be sent to Telegram at 6pm automatically after cron setup!**
