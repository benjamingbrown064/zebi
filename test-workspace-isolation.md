# Workspace Isolation - Testing Guide

## Quick Manual Test

### Prerequisites
1. Local dev server running: `npm run dev`
2. Two different user accounts or test credentials

### Test Procedure

#### Step 1: Create First User & Data
```
1. Open browser (Chrome/Firefox)
2. Go to http://localhost:3000/signup
3. Sign up as: alice@test.com
4. Create test data:
   - Add 2-3 tasks
   - Create 1 project
   - Create 1 objective
   - Create 1 goal
5. Note down:
   - Alice's workspace ID (check network tab or database)
   - Task IDs created
```

#### Step 2: Create Second User
```
1. Open INCOGNITO window
2. Go to http://localhost:3000/signup
3. Sign up as: bob@test.com
4. Bob should see:
   ✅ Empty dashboard
   ✅ No tasks from Alice
   ✅ No projects from Alice
   ✅ No objectives from Alice
   ✅ No goals from Alice
5. Create 1 task for Bob
```

#### Step 3: Verify Cross-Workspace Blocking
```
1. As Bob, open DevTools Network tab
2. Try to access Alice's data via API:
   
   In browser console:
   fetch('/api/tasks?workspaceId=ALICE_WORKSPACE_ID')
     .then(r => r.json())
     .then(console.log)
   
   Expected: 403 Forbidden or empty array
   
3. Check middleware logs in server console
   Should see: "[SECURITY] User bob@test.com attempted to access workspace..."
```

#### Step 4: Verify Pages Use Correct Workspace
```
As Bob, check these pages show ONLY Bob's data:
✅ /dashboard - Should show Bob's tasks only
✅ /tasks - Should list Bob's tasks only
✅ /projects - Should show Bob's projects only
✅ /objectives - Should show Bob's objectives only
✅ /goals - Should show Bob's goals only
```

## Automated API Tests

### Test 1: Workspace Retrieval
```bash
# Get current workspace
curl -X GET http://localhost:3000/api/workspaces/current \
  -H "Cookie: $(cat .test-cookie)" \
  -H "Content-Type: application/json"

# Expected: { workspace: { id, name, role } }
```

### Test 2: Cross-Workspace Access Blocked
```bash
# Try to access different workspace
curl -X GET "http://localhost:3000/api/tasks?workspaceId=OTHER_ID" \
  -H "Cookie: $(cat .test-cookie)"

# Expected: 403 Forbidden
```

### Test 3: Dashboard API
```bash
curl -X GET http://localhost:3000/api/dashboard/suggestions \
  -H "Cookie: $(cat .test-cookie)"

# Expected: Suggestions for current user's workspace only
```

## Database Verification

### Check Workspace Membership
```sql
-- Connect to your Supabase database
-- Check workspaces
SELECT 
  w.id,
  w.name,
  wm.userId,
  wm.role
FROM "Workspace" w
JOIN "WorkspaceMember" wm ON w.id = wm.workspaceId
ORDER BY w."createdAt" DESC;

-- Verify each user has ONE workspace
-- Verify workspace IDs are different
```

### Check Task Isolation
```sql
-- Tasks should belong to correct workspace
SELECT 
  t.id,
  t.title,
  t.workspaceId,
  w.name as workspace_name
FROM "Task" t
JOIN "Workspace" w ON t.workspaceId = w.id
ORDER BY t."createdAt" DESC
LIMIT 20;

-- Verify tasks are isolated per workspace
```

## Expected Results

### ✅ PASS Criteria
- Each user sees only their own workspace data
- API returns 403 for cross-workspace access attempts
- Middleware logs security violations
- Database shows proper workspace isolation
- New accounts start with empty slate

### ❌ FAIL Criteria
- User sees data from another workspace
- API allows cross-workspace data access
- No security logs for invalid access attempts
- Database shows mixed workspace data

## Known Issues (To Be Fixed)

### Still Using DEFAULT_WORKSPACE_ID
- Doug API routes (use token auth, need workspace lookup)
- Cron jobs (process all workspaces)
- Some client components (need useWorkspace hook)
- Server actions (need workspace parameter)

### Components Not Yet Updated
Run this to see remaining components:
```bash
grep -r "DEFAULT_WORKSPACE_ID" --include="*.tsx" app/components/ | wc -l
```

## Rollback Plan

If tests fail and you need to rollback:

```bash
# Restore API route backups
cd /Users/botbot/.openclaw/workspace/zebi
find app/api -name "*.bak" -exec sh -c 'mv "$1" "${1%.bak}"' _ {} \;

# Revert workspace helpers
git checkout lib/workspace.ts lib/use-workspace.tsx

# Revert middleware
git checkout middleware.ts

# Restart dev server
npm run dev
```

## Success Checklist

Before marking this as complete, verify:

- [ ] Two test users created successfully
- [ ] Each user sees only their data
- [ ] Cross-workspace API access blocked
- [ ] Middleware logs security violations
- [ ] Database shows proper isolation
- [ ] All priority pages tested (dashboard, tasks, objectives, projects, goals)
- [ ] No errors in server console
- [ ] No errors in browser console

## Next Testing Phase

After all components are updated:
1. Run full regression tests
2. Test with production-like data volume
3. Performance testing with multiple workspaces
4. Security penetration testing
5. User acceptance testing
