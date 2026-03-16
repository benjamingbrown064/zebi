# Quick Test Checklist - Signup Fix

## Pre-Test Setup (2 minutes)

### 1. Disable Supabase Email Confirmation
- [ ] Go to Supabase Dashboard
- [ ] Navigate to: Authentication → Providers → Email
- [ ] Find "Confirm email" toggle
- [ ] Turn it **OFF**
- [ ] Click Save

### 2. Start Dev Server
```bash
cd /Users/botbot/.openclaw/workspace/zebi
npm run dev
```
- [ ] Server starts successfully
- [ ] Open: http://localhost:3000

---

## Test 1: New User Signup (3 minutes)

### Signup
- [ ] Open **incognito/private window**
- [ ] Go to: http://localhost:3000/signup
- [ ] Fill in form:
  - Email: `benjamin+test4@onebeyond.studio`
  - Workspace: `Test Workspace 4`
  - Password: `TestPassword123!`
  - Confirm: `TestPassword123!`
- [ ] Click "Create account"

### Expected Results
- [ ] ✅ Redirects to `/dashboard` (not stuck on signup page)
- [ ] ✅ Dashboard loads (no blank white screen)
- [ ] ✅ Shows "Plan your day to get started" button
- [ ] ✅ NO "Unauthorized: No valid session" error
- [ ] ✅ NO stuck loading spinners

### Browser Console Check (F12)
- [ ] ✅ No red errors
- [ ] ✅ No 401/403 errors

---

## Test 2: Empty Dashboard (1 minute)

Check all sections are empty:
- [ ] ✅ Today's Plan: "Plan your day to get started"
- [ ] ✅ Objectives: "No active objectives"
- [ ] ✅ Projects: "No active projects"
- [ ] ✅ All data is empty (not showing Ben's data)

---

## Test 3: All Pages Load (2 minutes)

Visit each page (should load, not error):
- [ ] `/tasks` - Empty task list
- [ ] `/projects` - Empty project list  
- [ ] `/objectives` - Empty objectives list
- [ ] `/board` - Empty board columns
- [ ] `/ai-memory` - Empty memory
- [ ] `/insights` - Empty insights

**All pages should:**
- [ ] ✅ Load without errors
- [ ] ✅ Show empty state (not loading forever)
- [ ] ✅ NO "Unauthorized" errors

---

## Test 4: Data Isolation (2 minutes)

### Create Test Data
- [ ] Go to `/tasks`
- [ ] Create task: "My Test Task"
- [ ] Task appears in list

### Test Isolation
- [ ] Click profile/logout
- [ ] Sign in as: `benjamin@onebeyond.studio`
- [ ] Check `/tasks` - should NOT see "My Test Task"
- [ ] Sign out
- [ ] Sign in as test user again
- [ ] Check `/tasks` - should see "My Test Task"

---

## Test 5: Session Persistence (30 seconds)

- [ ] While signed in, refresh page (F5)
- [ ] ✅ Stays signed in
- [ ] ✅ Dashboard loads correctly
- [ ] ✅ No redirect to login

---

## Quick PASS/FAIL

### ✅ PASS if:
- New user can sign up
- Dashboard loads without errors
- Dashboard shows empty state (no other user's data)
- All pages load successfully
- No "Unauthorized" errors anywhere
- Different users see different data

### ❌ FAIL if:
- Stuck on "Creating account..."
- Redirects to login after signup
- "Unauthorized: No valid session" error
- Dashboard shows Ben's data
- Loading spinners stuck forever
- Any page shows "Unauthorized" error

---

## If Test FAILS

### Check Server Logs
Look for:
```
❌ "Auth error in getWorkspaceFromAuth"
❌ "Failed to create workspace"
❌ "No workspace found for user"
```

### Check Browser Console (F12)
Look for:
```
❌ 401 Unauthorized errors
❌ "Failed to fetch workspace"
❌ Network errors
```

### Quick Fixes
1. **Clear browser cache/cookies**
2. **Restart dev server** (`npm run dev`)
3. **Check Supabase email confirmation is OFF**
4. **Try different email:** `benjamin+test5@onebeyond.studio`

---

## Report Results

After testing, update:

**Status:**
- [ ] ✅ All tests passed - READY FOR PRODUCTION
- [ ] ⚠️ Some tests failed - See issues below
- [ ] ❌ Critical failure - Needs more work

**Issues Found:**
```
(List any issues here)
```

**Browser:**
- [ ] Chrome
- [ ] Safari
- [ ] Firefox

**Date Tested:** _____________

**Tested By:** _____________

---

## Total Time: ~10 minutes

**Ready? Let's test!** 🚀
