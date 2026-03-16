# Workspace Isolation - Remaining Work Guide

## Overview

This guide covers the remaining work to complete workspace isolation. The core infrastructure is done, but several areas need custom handling.

## 1. Doug API Routes (11 files) ⚠️ CRITICAL

### Problem
Doug API routes use `DOUG_API_TOKEN` for authentication, not user sessions. They can't use `requireWorkspace()` because there's no authenticated user.

### Solution: Create Token-to-Workspace Mapping

**Step 1: Create Doug workspace helper**
```typescript
// lib/doug-workspace.ts
import { prisma } from '@/lib/prisma'

/**
 * Get workspace ID from Doug API token
 * Doug tokens are tied to specific users/workspaces
 */
export async function getWorkspaceFromDougToken(token: string): Promise<string | null> {
  // Option A: If token is stored in database with workspace
  const tokenRecord = await prisma.apiToken.findUnique({
    where: { token },
    include: { workspace: true }
  })
  
  if (!tokenRecord) {
    return null
  }
  
  return tokenRecord.workspaceId
  
  // Option B: If token encodes workspace ID (JWT)
  // const decoded = verifyJWT(token)
  // return decoded.workspaceId
}

/**
 * Validate Doug API token and return workspace ID
 * Throws error if invalid
 */
export async function requireWorkspaceFromDougToken(
  authHeader: string | null
): Promise<string> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }
  
  const token = authHeader.substring(7)
  const expectedToken = process.env.DOUG_API_TOKEN
  
  if (token !== expectedToken) {
    throw new Error('Invalid Doug API token')
  }
  
  // For now, if using a single shared token, you need to determine
  // which workspace based on request data (e.g., userId in body)
  // Better approach: Generate per-workspace tokens
  
  throw new Error('Doug API needs per-workspace token implementation')
}
```

**Step 2: Update Doug API routes**
```typescript
// Example: app/api/doug/task/route.ts
import { requireWorkspaceFromDougToken } from '@/lib/doug-workspace'

export async function POST(req: NextRequest) {
  try {
    // Instead of this:
    // const workspaceId = DEFAULT_WORKSPACE_ID
    
    // Do this:
    const workspaceId = await requireWorkspaceFromDougToken(
      req.headers.get('authorization')
    )
    
    // ... rest of code
  }
}
```

**Step 3: Choose Token Strategy**

**Option A: Per-Workspace Tokens (Recommended)**
- Generate unique token for each workspace
- Store in database: `{ token, workspaceId, createdAt }`
- Lookup workspace from token

**Option B: Single Token + Body Parameter**
- Use current DOUG_API_TOKEN
- Require `workspaceId` in request body
- Verify user has access to that workspace
- Less secure, but simpler migration

**Option C: JWT Tokens**
- Generate JWT containing workspace ID
- Verify and decode on each request
- Most secure, but requires token generation endpoint

### Files to Update
```
app/api/doug/my-tasks/route.ts
app/api/doug/memory/route.ts
app/api/doug/weekly-plan/route.ts
app/api/doug/plan/route.ts
app/api/doug/objective/route.ts
app/api/doug/status/route.ts
app/api/doug/task/route.ts
app/api/doug/detect-blockers/route.ts
app/api/doug/setup-user/route.ts
app/api/doug/summary/route.ts
app/api/doug/company/route.ts
```

## 2. Cron Job Routes (4 files)

### Problem
Cron jobs run on a schedule without user authentication. They need to process ALL workspaces, not just one.

### Solution: Process Per-Workspace

**Pattern:**
```typescript
// app/api/cron/daily-summary/route.ts
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all active workspaces
    const workspaces = await prisma.workspace.findMany({
      where: {
        // Optional: Filter by plan, active status, etc.
        plan: { not: 'cancelled' }
      },
      include: {
        members: {
          where: { role: 'owner' },
          include: { user: true }
        }
      }
    })

    const results = []

    // Process each workspace separately
    for (const workspace of workspaces) {
      try {
        // Your existing cron logic here, but with workspaceId
        const summary = await generateDailySummary(workspace.id)
        
        results.push({
          workspaceId: workspace.id,
          status: 'success',
          summary
        })
      } catch (error) {
        console.error(`Failed to process workspace ${workspace.id}:`, error)
        results.push({
          workspaceId: workspace.id,
          status: 'error',
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    })
  } catch (error) {
    console.error('Cron job failed:', error)
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    )
  }
}

// Move main logic to separate function
async function generateDailySummary(workspaceId: string) {
  // All your existing logic, but using workspaceId parameter
  const tasks = await prisma.task.findMany({
    where: { workspaceId }
  })
  // ... etc
}
```

### Files to Update
```
app/api/cron/check-alerts/route.ts
app/api/cron/daily-summary/route.ts
app/api/cron/generate-recommendations/route.ts
app/api/cron/morning-briefing/route.ts
```

### Performance Consideration
- If you have many workspaces, process in batches
- Add timeout handling
- Consider using a job queue (BullMQ, etc.)

## 3. Remaining Client Components (~150 files)

### Bulk Fix Approach

**Step 1: Find all client components**
```bash
grep -rl "DEFAULT_WORKSPACE_ID" --include="*.tsx" app/ components/ | \
  grep -v ".bak" > /tmp/client-components.txt
```

**Step 2: Create fix script**
```bash
#!/bin/bash
# fix-client-components.sh

while IFS= read -r file; do
  # Skip if not a client component
  if ! grep -q "'use client'" "$file" && ! grep -q '"use client"' "$file"; then
    continue
  fi
  
  echo "Fixing: $file"
  
  # Add import if not present
  if ! grep -q "useWorkspace" "$file"; then
    sed -i '' "/^import.*from 'react'/a\\
import { useWorkspace } from '@/lib/use-workspace'
" "$file"
  fi
  
  # Remove DEFAULT_WORKSPACE_ID
  sed -i '' '/const DEFAULT_WORKSPACE_ID =/d' "$file"
  
  echo "✓ Fixed: $file"
done < /tmp/client-components.txt
```

**Step 3: Manual hook addition**
For each component, add:
```typescript
const { workspaceId, loading } = useWorkspace()

// Add loading state
if (loading) return <LoadingSpinner />
if (!workspaceId) return <div>No workspace</div>
```

**Step 4: Update useEffect dependencies**
```typescript
// Before:
useEffect(() => {
  fetchData()
}, [])

// After:
useEffect(() => {
  if (workspaceId) {
    fetchData()
  }
}, [workspaceId])
```

## 4. Server Actions (~30 files)

### Problem
Server actions in `app/actions/` use DEFAULT_WORKSPACE_ID.

### Solution
Update to accept workspaceId as parameter:

**Before:**
```typescript
// app/actions/tasks.ts
export async function getTasks() {
  const workspaceId = DEFAULT_WORKSPACE_ID
  return prisma.task.findMany({ where: { workspaceId } })
}
```

**After:**
```typescript
// app/actions/tasks.ts
export async function getTasks(workspaceId: string) {
  // Optionally verify workspace access
  // await requireWorkspaceAccess(workspaceId)
  
  return prisma.task.findMany({ where: { workspaceId } })
}
```

**Usage from components:**
```typescript
// Client component
const { workspaceId } = useWorkspace()
const tasks = await getTasks(workspaceId!)

// Server component
const workspaceId = await requireWorkspace()
const tasks = await getTasks(workspaceId)
```

## 5. Utility Functions & Libraries

Files in `lib/` that use DEFAULT_WORKSPACE_ID:
- `lib/ai/context-builder.ts`
- `lib/ai/prioritization-engine.ts`
- Etc.

**Solution:** Accept workspaceId as parameter.

## Progress Tracking

Create a checklist:

```bash
# Generate list of remaining files
echo "## Remaining Files" > WORKSPACE_FIX_CHECKLIST.md
echo "" >> WORKSPACE_FIX_CHECKLIST.md

grep -rl "DEFAULT_WORKSPACE_ID" --include="*.ts" --include="*.tsx" app/ lib/ components/ | \
  while read file; do
    echo "- [ ] $file" >> WORKSPACE_FIX_CHECKLIST.md
  done
```

## Testing Strategy

After each batch of fixes:

1. **Run TypeScript check:**
   ```bash
   npm run type-check
   ```

2. **Run build:**
   ```bash
   npm run build
   ```

3. **Manual test:**
   - Create test user
   - Test affected pages
   - Verify isolation

4. **Commit:**
   ```bash
   git add .
   git commit -m "fix: workspace isolation for [batch description]"
   ```

## Timeline Estimate

- Doug API routes: 2-3 hours
- Cron jobs: 1-2 hours
- Client components (batch): 3-4 hours
- Server actions: 1-2 hours
- Testing: 2 hours
- **Total: 9-13 hours**

## Help Needed?

If stuck:
1. Check `WORKSPACE_FIX_SUMMARY.md` for examples
2. Look at already-fixed files for patterns
3. Test incrementally
4. Ask for review before deploying

## Completion Checklist

- [ ] Doug API routes updated
- [ ] Cron jobs updated
- [ ] All client components updated
- [ ] All server actions updated
- [ ] All lib utilities updated
- [ ] TypeScript passes
- [ ] Build succeeds
- [ ] Manual tests pass
- [ ] No DEFAULT_WORKSPACE_ID in codebase
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Deployed to staging
- [ ] Production deployment
