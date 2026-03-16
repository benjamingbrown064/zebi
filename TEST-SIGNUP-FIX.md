# Test Plan: Signup Session Fix

## Quick Test Steps

### 1. Check Supabase Email Confirmation Setting

**Option A: Disable for Quick Testing**
```
1. Go to: https://supabase.com/dashboard/project/[your-project]/auth/providers
2. Find "Email" provider
3. Look for "Confirm email" toggle
4. If ON → Turn it OFF
5. Save changes
```

**Option B: Keep Enabled (Production)**
- Signup will require email confirmation
- User must click link in email before signing in
- Workspace is created after email is confirmed

---

### 2. Test New User Signup

#### Test Account Details:
```
Email: benjamin+test4@onebeyond.studio
Workspace Name: Test Workspace 4
Password: TestPassword123!
```

#### Steps:
1. Open app in **incognito/private window** (fresh session)
2. Go to `/signup`
3. Fill in form with above details
4. Click "Create account"

#### Expected Results:

**If email confirmation DISABLED:**
- ✅ Redirects to `/dashboard` immediately
- ✅ Dashboard loads without errors
- ✅ Dashboard is completely empty (no data)
- ✅ No "Unauthorized: No valid session" errors
- ✅ No stuck loading spinners

**If email confirmation ENABLED:**
- ⚠️ Shows error: "Please check your email to confirm your account"
- 📧 Check email for confirmation link
- Click confirmation link
- Then go to `/login` and sign in
- Should then work as above

---

### 3. Verify Dashboard Data Isolation

After successful signup:

1. **Check Empty States:**
   - Dashboard → Should show "Plan your day to get started"
   - Tasks → Empty
   - Projects → Empty
   - Objectives → Empty
   - Board → Empty columns
   - AI Memory → Empty
   - Insights → Empty

2. **Create Test Data:**
   ```
   - Create 1 project: "Test Project"
   - Create 1 task: "Test Task"
   - Create 1 objective: "Test Objective"
   ```

3. **Sign Out**

4. **Sign In as Another User** (e.g., `benjamin@onebeyond.studio`)
   - ✅ Should NOT see test user's data
   - ✅ Should see only own workspace data

5. **Sign Back In as Test User**
   - ✅ Should see test data created earlier
   - ✅ Should NOT see other user's data

---

### 4. Check Browser Console

Open DevTools Console (F12) during signup:

**Good Signs (What You Want to See):**
```
✅ No red errors
✅ Successful API calls to /api/workspaces
✅ Successful API calls to /api/workspaces/current
```

**Bad Signs (Problems):**
```
❌ "Unauthorized: No valid session"
❌ "Failed to fetch workspace"
❌ 401 or 403 errors
❌ Stuck on "Loading..."
```

---

### 5. Check Server Logs

In terminal where `npm run dev` is running:

**Good Signs:**
```
✅ No "Auth session missing!" errors on authenticated pages
✅ "No workspace found for user" only during build (OK)
✅ API routes return 200 status
```

**Bad Signs:**
```
❌ "Auth error in getWorkspaceFromAuth" on page load
❌ "Failed to create workspace" on signup
❌ Database connection errors
```

---

## Common Issues & Solutions

### Issue: "Unauthorized: No valid session" on dashboard

**Cause:** Session not established after signup

**Fix:**
1. Check Supabase email confirmation is disabled
2. Clear browser cookies
3. Try signup again
4. Check server logs for auth errors

---

### Issue: Dashboard shows data from another user

**Cause:** Stale cache or hardcoded workspace ID

**Fix:**
1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Clear browser cache and cookies
3. Restart dev server (`npm run dev`)
4. Check `app/layout.tsx` - should NOT have hardcoded workspace/user IDs

---

### Issue: Stuck on "Creating account..."

**Cause:** API error during signup

**Fix:**
1. Check browser console for errors
2. Check server logs
3. Verify database is running (`npx prisma studio`)
4. Check Supabase connection

---

### Issue: Email confirmation link doesn't work

**Cause:** Email confirmation callback not configured

**Fix:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set "Site URL": `http://localhost:3000`
3. Add "Redirect URL": `http://localhost:3000/auth/callback`
4. Try confirmation link again

---

## Database Verification

If signup seems successful but dashboard fails:

```bash
# Open Prisma Studio
npx prisma studio

# Check tables:
1. Workspace → Should have new workspace with test name
2. WorkspaceMember → Should have entry linking user to workspace
3. Status → Should have 6 default statuses for workspace
```

**SQL Queries to Check:**

```sql
-- Check workspace was created
SELECT * FROM "Workspace" 
WHERE name = 'Test Workspace 4';

-- Check user is member of workspace
SELECT wm.*, w.name as workspace_name
FROM "WorkspaceMember" wm
JOIN "Workspace" w ON w.id = wm."workspaceId"
WHERE wm."userId" = '<your-user-id>';

-- Check default statuses exist
SELECT * FROM "Status"
WHERE "workspaceId" = '<your-workspace-id>'
ORDER BY "sortOrder";
```

---

## Success Criteria

✅ **Signup Complete When:**

1. New user can sign up successfully
2. Redirected to dashboard without errors
3. Dashboard shows empty state (no other user's data)
4. All pages load (tasks, projects, objectives, board, etc.)
5. No "Unauthorized" errors anywhere
6. No loading spinners stuck
7. Can create data (task, project, objective)
8. Created data persists after page refresh
9. Other users don't see this user's data
10. This user doesn't see other users' data

---

## Test Script (Automated)

If you want to automate testing:

```bash
#!/bin/bash

echo "Testing signup flow..."

# 1. Start dev server
npm run dev &
DEV_PID=$!
sleep 5

# 2. Test signup API
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "workspaceName": "Test Workspace"
  }'

# 3. Check workspace was created
curl http://localhost:3000/api/workspaces/current

# 4. Cleanup
kill $DEV_PID
```

---

## Rollback Plan

If the fix breaks something:

```bash
# Revert all changes
git checkout HEAD~1

# Or revert specific files
git checkout HEAD~1 -- app/layout.tsx
git checkout HEAD~1 -- app/signup/page.tsx
git checkout HEAD~1 -- lib/use-workspace.tsx
git checkout HEAD~1 -- app/dashboard/page.tsx

# Restart dev server
npm run dev
```

---

## Next Steps After Successful Test

1. ✅ Test with multiple users
2. ✅ Test session persistence
3. ✅ Test logout/login flow
4. ✅ Deploy to staging
5. ✅ Test on staging with real emails
6. ✅ Get Ben to test
7. ✅ Deploy to production

---

**Test Date:** 2026-03-09  
**Tested By:** [Pending]  
**Result:** [Pending]  
**Issues Found:** [Pending]
