# Focus App - Test Execution Guide

## Quick Start Testing

### Access Points
- **Dashboard:** http://localhost:3000/dashboard
- **Board:** http://localhost:3000/board
- **Tasks:** http://localhost:3000/tasks
- **Filters:** http://localhost:3000/filters
- **Goals:** http://localhost:3000/goals

### Test User
- Workspace ID: `b68f4274-c19a-412c-8e26-4eead85dde0e`
- User ID: `dc949f3d-2077-4ff7-8dc2-2a54454b7d74`
(Pre-configured in all pages)

---

## Test Suite 1: Dashboard Basic Functionality (5 min)

### ✅ Test 1.1 - Page Load
1. Navigate to http://localhost:3000/dashboard
2. **Expected:** Page loads in < 2 seconds
3. **Verify:**
   - [ ] Header shows current date (e.g., "Tuesday, Feb 25")
   - [ ] "Today" panel shows on left
   - [ ] "Attention" panel shows in middle
   - [ ] "Goals" panel shows on right
   - [ ] No console errors (F12 → Console)

### ✅ Test 1.2 - Data Load
1. Dashboard should have loaded with real data
2. **Verify:**
   - [ ] Today panel has tasks or shows "No tasks match this filter"
   - [ ] Task count shows correctly (e.g., "3 of 5 tasks pinned")
   - [ ] Attention panel shows signal cards
   - [ ] Goals panel shows goals or "No goals yet"

### ✅ Test 1.3 - Quick Add Modal
1. Click the "Add task..." input at bottom of Today panel
2. **Expected:** Modal opens
3. **Verify:**
   - [ ] Modal title is "Quick add"
   - [ ] Input field has placeholder "Task p1 #tag goal:GoalName"
   - [ ] Preview section shows parsed input
4. Type: "Review proposal p2 #work"
5. **Verify:**
   - [ ] Preview shows: title="Review proposal", priority="P2 - High", tag="#work"
6. Click "Add task"
7. **Verify:**
   - [ ] Modal closes
   - [ ] New task appears in Today panel
   - [ ] Task shows correct priority

### ✅ Test 1.4 - Task Persistence
1. Refresh the page (Cmd+R or Ctrl+R)
2. **Verify:**
   - [ ] Page reloads
   - [ ] Task from 1.3 still appears in Today panel
   - [ ] Task has correct title and priority

### ✅ Test 1.5 - Task Detail Modal
1. Click on any task in Today panel
2. **Expected:** Modal opens with task details
3. **Verify:**
   - [ ] Modal shows correct task title
   - [ ] Priority is selectable (P1-P4)
   - [ ] Status dropdown shows: Inbox, Planned, Doing, Blocked, Done
   - [ ] Due date field present
   - [ ] Description field present
4. Change priority to P1 and status to "Doing"
5. Click "Save"
6. **Verify:**
   - [ ] Modal closes
   - [ ] Task priority updated in dashboard
   - [ ] Task removed from Today panel (moved to Doing)

---

## Test Suite 2: Board Functionality (5 min)

### ✅ Test 2.1 - Board Load
1. Navigate to http://localhost:3000/board
2. **Expected:** Page loads in < 2 seconds
3. **Verify:**
   - [ ] Shows 5 columns: Inbox, Planned, Doing, Blocked, Done
   - [ ] Each column shows task count
   - [ ] Header shows "Board View"

### ✅ Test 2.2 - Task Distribution
1. Observe task distribution across columns
2. **Verify:**
   - [ ] Tasks are in correct status columns
   - [ ] Task from previous test (marked as "Doing") is in Doing column
   - [ ] New task from test 1.3 (still in Inbox) is in Inbox column

### ✅ Test 2.3 - Drag and Drop
1. Find a task in Inbox column
2. Drag it to the Planned column
3. **Expected:** Task moves immediately
4. **Verify:**
   - [ ] Task count in Inbox decreases
   - [ ] Task count in Planned increases
   - [ ] Task appears in Planned column
5. Refresh the page
6. **Verify:**
   - [ ] Task still in Planned column (persisted to database)

### ✅ Test 2.4 - Drag to Complete
1. Find a task in Doing column
2. Drag to Done column
3. **Verify:**
   - [ ] Task moves to Done
   - [ ] Task count updates
   - [ ] Persists on refresh

### ✅ Test 2.5 - Add Task from Board
1. Click "+ Add task" button in header
2. **Expected:** QuickAddModal opens
3. Type: "Test board task p3"
4. Click "Add task"
5. **Verify:**
   - [ ] Modal closes
   - [ ] New task appears in Inbox column
   - [ ] Has correct priority

---

## Test Suite 3: Tasks List (5 min)

### ✅ Test 3.1 - Tasks Load
1. Navigate to http://localhost:3000/tasks
2. **Expected:** Page loads in < 2 seconds
3. **Verify:**
   - [ ] Shows all tasks
   - [ ] Task count displayed correctly
   - [ ] No duplicate tasks

### ✅ Test 3.2 - Priority Filters
1. Click "P1" button
2. **Verify:**
   - [ ] Shows only P1 tasks
   - [ ] "P1" button is highlighted
3. Click "P2"
4. **Verify:**
   - [ ] Shows only P2 tasks
5. Click "All"
6. **Verify:**
   - [ ] Shows all tasks again

### ✅ Test 3.3 - Edit Task from List
1. Click on any task
2. **Expected:** TaskDetailModal opens
3. Change title to "Updated title for testing"
4. Click "Save"
5. **Verify:**
   - [ ] Modal closes
   - [ ] Task list shows updated title
   - [ ] Change persists on page refresh

### ✅ Test 3.4 - Delete Task
1. Click on any task
2. Click "Delete" button
3. **Expected:** Confirmation dialog
4. Click "OK"
5. **Verify:**
   - [ ] Modal closes
   - [ ] Task removed from list
   - [ ] Task doesn't appear on other pages
   - [ ] Task count decreases

### ✅ Test 3.5 - Add Task from List
1. Click "+ Add Task" button
2. Type: "Task from list p1"
3. Click "Add task"
4. **Verify:**
   - [ ] New task appears in list with P1 priority

---

## Test Suite 4: Filters (5 min)

### ✅ Test 4.1 - Filters Page Load
1. Navigate to http://localhost:3000/filters
2. **Verify:**
   - [ ] Page loads
   - [ ] Shows "No filters yet" or existing filters
   - [ ] "New filter" button visible

### ✅ Test 4.2 - Create Filter
1. Click "New filter"
2. **Expected:** Modal opens
3. Enter name: "P1 and P2 only"
4. Click "P1" and "P2" buttons to select them
5. Click "Create"
6. **Verify:**
   - [ ] Modal closes
   - [ ] New filter appears in list
   - [ ] Shows criteria: "Priority: P1, P2"
   - [ ] Filter persists on page refresh

### ✅ Test 4.3 - Edit Filter
1. Click edit icon on any filter
2. **Expected:** Modal opens with current data
3. Change name to "P1 only"
4. Click "P1" to toggle to just P1
5. Click "Update"
6. **Verify:**
   - [ ] Modal closes
   - [ ] Filter name updated
   - [ ] Criteria updated to just P1
   - [ ] Changes persist on refresh

### ✅ Test 4.4 - Apply Filter
1. Go to Dashboard
2. Click filter dropdown in header
3. Select the "P1 only" filter
4. **Verify:**
   - [ ] Today panel shows only P1 tasks
   - [ ] Blue banner shows "📋 Showing: P1 only"
   - [ ] Task count reflects filtered results

### ✅ Test 4.5 - Delete Filter
1. Go back to Filters page
2. Click delete icon on "P1 only" filter
3. Confirm delete
4. **Verify:**
   - [ ] Filter removed from list
   - [ ] Filter no longer appears in dropdowns on other pages

---

## Test Suite 5: Goals (5 min)

### ✅ Test 5.1 - Goals Page Load
1. Navigate to http://localhost:3000/goals
2. **Verify:**
   - [ ] Page loads
   - [ ] Shows existing goals or "No goals yet"
   - [ ] "Add goal" button visible

### ✅ Test 5.2 - Create Goal
1. Click "Add goal"
2. **Expected:** Modal opens
3. Enter:
   - Name: "Complete 10 tasks"
   - Target: 10
   - Unit: "tasks"
   - Tracking type: "Tasks (count completed)"
   - Due date: 30 days from now
4. Click "Create"
5. **Verify:**
   - [ ] Modal closes
   - [ ] New goal appears in list
   - [ ] Shows progress: "0 tasks / 10 tasks"
   - [ ] Shows due date
   - [ ] Shows status badge

### ✅ Test 5.3 - Goal Appears on Dashboard
1. Navigate to Dashboard
2. **Verify:**
   - [ ] Goals panel shows the new goal
   - [ ] Shows progress bar
   - [ ] Shows same due date

### ✅ Test 5.4 - Delete Goal
1. Go back to Goals page
2. Click delete button on the goal
3. Confirm
4. **Verify:**
   - [ ] Goal removed from list
   - [ ] Goal removed from Dashboard Goals panel
   - [ ] Deletion persists on page refresh

### ✅ Test 5.5 - Goal Persistence
1. Create a new goal
2. Go to Dashboard → Goals panel
3. Go to Tasks
4. Go back to Goals page
5. **Verify:**
   - [ ] Goal still there
   - [ ] No data loss

---

## Test Suite 6: Cross-Page Behavior (5 min)

### ✅ Test 6.1 - Task Created on Dashboard, Visible on Board
1. Dashboard: Create task "Cross-page test p2"
2. Verify task appears
3. Go to Board
4. **Verify:**
   - [ ] Task appears in Inbox column
   - [ ] Has correct priority
5. Go to Tasks list
6. **Verify:**
   - [ ] Task appears in list

### ✅ Test 6.2 - Status Changed on Board, Visible on Dashboard
1. Board: Move a task to Doing
2. Verify status changes
3. Dashboard: Go to Dashboard
4. **Verify:**
   - [ ] If task was in Today panel, it's gone (moved to Doing)
   - [ ] Task no longer in Today panel

### ✅ Test 6.3 - Filter Works Across Pages
1. Filters: Create filter "P3 tasks"
2. Dashboard: Apply filter
3. **Verify:**
   - [ ] Only P3 tasks show
4. Board: Filter is still applied
5. **Verify:**
   - [ ] Only P3 tasks show across columns
6. Tasks: Filter still active
7. **Verify:**
   - [ ] Only P3 tasks show in list
8. Clear filter
9. **Verify:**
   - [ ] All tasks show on all pages

---

## Test Suite 7: Performance (3 min)

### ✅ Test 7.1 - Dashboard Load Time
1. Open DevTools (F12)
2. Network tab
3. Refresh Dashboard
4. **Verify:**
   - [ ] Page load time < 2 seconds
   - [ ] No failed requests
   - [ ] No errors in Console

### ✅ Test 7.2 - Create Task Feedback
1. Dashboard: Click "Add task..."
2. Type and press Enter
3. **Verify:**
   - [ ] Modal closes within 500ms
   - [ ] Task appears immediately

### ✅ Test 7.3 - Drag and Drop Response
1. Board: Drag a task
2. **Verify:**
   - [ ] No lag or stutter
   - [ ] Smooth animation
   - [ ] Drop updates immediately

---

## Test Suite 8: Error Handling (3 min)

### ✅ Test 8.1 - Empty Title Validation
1. Dashboard: Click "Add task..."
2. Don't type anything
3. Click "Add task"
4. **Verify:**
   - [ ] Button remains disabled or shows error
   - [ ] Modal doesn't close

### ✅ Test 8.2 - Invalid Form Data
1. Filters: Click "New filter"
2. Don't enter name
3. Click "Create"
4. **Verify:**
   - [ ] Shows error "Filter name is required"
   - [ ] Modal stays open

### ✅ Test 8.3 - Console for Errors
1. F12 → Console tab
2. Perform various actions: create, edit, delete
3. **Verify:**
   - [ ] No red errors in console
   - [ ] No warnings about missing props
   - [ ] No network errors

---

## Test Summary Sheet

### Test Results Template

| Test Suite | Total | Passed | Failed | Notes |
|------------|-------|--------|--------|-------|
| Dashboard (5) | 5 | _ | _ | |
| Board (5) | 5 | _ | _ | |
| Tasks (5) | 5 | _ | _ | |
| Filters (5) | 5 | _ | _ | |
| Goals (5) | 5 | _ | _ | |
| Cross-Page (3) | 3 | _ | _ | |
| Performance (3) | 3 | _ | _ | |
| Errors (3) | 3 | _ | _ | |
| **TOTAL** | **34** | _ | _ | |

---

## Critical Checks (Must Pass)

- [ ] All 5 pages load without errors
- [ ] Can create task on any page
- [ ] Can edit task on any page
- [ ] Can delete task
- [ ] Data persists on page refresh
- [ ] Filters work across all pages
- [ ] No console errors
- [ ] Drag-drop smooth on board

---

## Sign-Off

**Date:** _______________
**Tester:** _______________
**Environment:** localhost:3000
**Build:** Production (npm run build)

**Overall Status:** ☐ PASS ☐ FAIL

**Issues Found:**
```
1. 
2. 
3. 
```

**Notes:**
```

```

