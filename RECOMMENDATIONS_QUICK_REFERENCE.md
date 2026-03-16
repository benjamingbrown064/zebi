# Dashboard Recommendations - Quick Reference

## Overview
AI-powered "What should I work on today?" system that analyzes workspace context and displays actionable suggestions on the dashboard.

## Key Components

### 1. Recommendation Engine
```typescript
import { RecommendationEngine } from '@/lib/ai/recommendation-engine'

const engine = new RecommendationEngine()
const recommendations = await engine.generateDailyRecommendations(
  workspaceId,
  userId
)
```

### 2. Dashboard Component
```tsx
import DashboardRecommendations from '@/app/components/DashboardRecommendations'

<DashboardRecommendations />
```

## API Endpoints

### Fetch Recommendations
```bash
GET /api/recommendations
```
Returns cached recommendations (4-hour window) or generates fresh ones.

### Implement Recommendation
```bash
POST /api/recommendations/:id/implement
```
Marks a recommendation as implemented.

### Dismiss Recommendation
```bash
POST /api/recommendations/:id/dismiss
```
Dismisses a recommendation.

### Generate (Cron)
```bash
GET /api/cron/generate-recommendations
```
Manually trigger recommendation generation (for scheduled jobs).

## Testing

### Run Test Suite
```bash
./test-recommendations.sh
```

### Check Database
```bash
node check-recommendations.js
```

### Manual Testing
```bash
# Generate recommendations
curl http://localhost:3002/api/cron/generate-recommendations

# Fetch recommendations
curl http://localhost:3002/api/recommendations

# Implement recommendation
curl -X POST http://localhost:3002/api/recommendations/REC_ID/implement

# Dismiss recommendation
curl -X POST http://localhost:3002/api/recommendations/REC_ID/dismiss
```

## Database Schema

```prisma
model AISuggestion {
  id             String    @id
  workspaceId    String
  userId         String
  type           String    // task, objective, blocker, priority, deadline
  title          String
  description    String
  reasoning      String
  actions        Json      // Array of action objects
  status         String    // pending, implemented, dismissed, expired
  confidence     Int       // 0-100
  implementedAt  DateTime?
  dismissedAt    DateTime?
  createdAt      DateTime
  expiresAt      DateTime  // 24 hours from creation
}
```

## Recommendation Types

1. **task** - Specific task to work on
2. **objective** - Objective that needs attention
3. **blocker** - Blocker that needs resolution
4. **priority** - Task priority change suggestion
5. **deadline** - Deadline approaching warning

## Priority Levels

- **high** (red) - Confidence > 80%
- **medium** (yellow) - Confidence 60-80%
- **low** (gray) - Confidence < 60%

## Action Types

1. **navigate** - Navigate to a page (task, objective, etc.)
2. **create_task** - Create a new task
3. **update_priority** - Update task priority
4. **set_deadline** - Set/update deadline

## Caching Strategy

- **Fresh generation** when no recommendations exist or all are > 4 hours old
- **Cache hit** when valid recommendations exist < 4 hours old
- **Auto-expiry** marks old recommendations as "expired" when generating new ones

## Monitoring

### Check Recommendation Stats
```javascript
const stats = await prisma.aISuggestion.groupBy({
  by: ['status'],
  where: { workspaceId: 'YOUR_WORKSPACE_ID' },
  _count: true
})
```

### View Recent Recommendations
```javascript
const recent = await prisma.aISuggestion.findMany({
  where: { workspaceId: 'YOUR_WORKSPACE_ID' },
  orderBy: { createdAt: 'desc' },
  take: 10
})
```

## Common Issues

### No Recommendations Displayed
1. Check if API endpoint is accessible
2. Verify OpenAI API key is set
3. Check browser console for errors
4. Verify workspace/user IDs are correct

### Recommendations Not Updating
1. Check cache timeout (4 hours)
2. Manually trigger generation via cron endpoint
3. Check database for expired recommendations

### TypeScript Errors
1. Run `npx prisma generate` after schema changes
2. Restart TypeScript server
3. Check that all types are properly imported

## Performance

- **Generation:** ~3-5 seconds (OpenAI API)
- **Cache Hit:** <50ms
- **Component Load:** <100ms
- **Database Query:** 2-3 queries per load

## Vercel Cron Setup

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/generate-recommendations",
    "schedule": "0 8 * * *"
  }]
}
```

Runs daily at 8:00 AM UTC.

## Environment Variables

```bash
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
```

## File Locations

- Engine: `lib/ai/recommendation-engine.ts`
- Component: `app/components/DashboardRecommendations.tsx`
- API: `app/api/recommendations/`
- Cron: `app/api/cron/generate-recommendations/`
- Tests: `test-recommendations.sh`, `check-recommendations.js`

## Support

For issues or questions:
1. Check test suite output
2. Review console logs
3. Check database status
4. Verify API responses

---

**Version:** 1.0
**Last Updated:** March 7, 2026
