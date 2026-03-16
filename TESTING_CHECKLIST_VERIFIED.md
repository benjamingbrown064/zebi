# Focus App - Complete Testing Checklist

## Project Status
✅ **Build Status:** PASSING
✅ **TypeScript:** No errors
✅ **Database:** Connected
✅ **All pages:** Wired to database

---

## Phase 1: Dashboard Tests

### Basic Functionality
- [ ] Dashboard loads within 2 seconds
- [ ] Shows current date in header (e.g., "Tuesday, Feb 25")
- [ ] "You have X of Y tasks pinned" displays correctly
- [ ] No console errors on page load

### Today Panel
- [ ] Shows max 5 tasks
- [ ] "+X more tasks" badge appears when >5 tasks
- [ ] Tasks display with correct title and priority
- [ ] Clicking task opens TaskDetailModal with real data
- [ ] Input field at bottom opens QuickAddModal

### Quick Add Modal
- [ ] Modal opens when clicking "Add task..." input
- [ ] Can enter task with format: "Task title p1 #tag goal:GoalName"
- [ ] Preview shows parsed title, priority, tags, goal
- [ ] "Add task" button creates task
- [ ] Task appears in Today panel immediately
- [ ] Task persists on page refresh
- [ ] Esc key closes modal
- [ ] Enter key creates task

### Edit Task Modal
- [ ] Opens when clicking any task
- [ ] Shows correct task title
- [ ] Shows correct priority (P1-P4)
- [ ] Shows correct status (Inbox, Planned, etc.)
- [ ] Shows due date if set
- [ ] "Save" button updates task in database
- [ ] Changes persist on page refresh
- [ ] "Delete" button removes task from dashboard and database
- [ ] Task count updates correctly after delete

### Attention Panel
- [ ] Shows signal cards (currently using mock data - acceptable)
- [ ] Each signal displays type, title, description

### Goals Panel
- [ ] Displays up to 3 goals
- [ ] Shows "No goals yet" with "Create one" link if empty
- [ ] Each goal shows: name, progress bar, progress (e.g., "30 £k / 100 £k")
- [ ] Due date displayed correctly
- [ ] Status badge shows on-track/behind
- [ ] Goals load from database (not localStorage)
- [ ] Clicking "Create one" navigates to /goals

### Filter Dropdown
- [ ] Shows "No filters" if none exist
- [ ] Lists all saved filters
- [ ] Clicking filter applies it to tasks
- [ ] Shows "Manage filters" option
- [ ] Active filter highlighted
- [ ] Clear button removes active filter

---

## Phase 2: Board Tests

### Page Load
- [ ] Board loads within 2 seconds
- [ ] Shows column headers: Inbox, Planned, Doing, Blocked, Done
- [ ] Each column shows task count
- [ ] No console errors

### Drag and Drop
- [ ] Can drag task from Inbox to Doing
- [ ] Task persists in Doing after page refresh
- [ ] Can drag task to Done
- [ ] Can drag task back to Inbox
- [ ] Task count updates in real-time in columns
- [ ] Dropped task is removed from source column

### Add Task
- [ ] "Add task" button opens QuickAddModal
- [ ] New task appears in Inbox column
- [ ] New task persists on refresh

### Filters
- [ ] Filter dropdown visible in header
- [ ] Applied filter works (shows only filtered tasks)
- [ ] Can clear filter

---

## Phase 3: Tasks List Tests

### Page Load
- [ ] Tasks list loads within 2 seconds
- [ ] Shows all tasks
- [ ] Task count displayed correctly
- [ ] No console errors

### Priority Filters
- [ ] "All" button shows all tasks
- [ ] "P1" button shows only P1 tasks
- [ ] "P2" button shows only P2 tasks
- [ ] "P3" button shows only P3 tasks
- [ ] "P4" button shows only P4 tasks
- [ ] Active filter highlighted

### Task Operations
- [ ] Clicking task opens TaskDetailModal
- [ ] Can edit task (title, priority, status, due date)
- [ ] Can delete task
- [ ] Changes persist on page refresh
- [ ] New task created via "Add Task" appears in list
- [ ] Task with correct priority when created

### Saved Filters
- [ ] Filter dropdown shows all saved filters
- [ ] Applying filter shows only tasks matching criteria
- [ ] Can clear filter with button

---

## Phase 4: Filters Page Tests

### List Display
- [ ] All saved filters display
- [ ] Each filter shows name and criteria
- [ ] "No filters yet" message if empty
- [ ] No console errors

### Create Filter
- [ ] "New filter" button opens modal
- [ ] Can enter filter name
- [ ] Can select P1-P4 priorities (multiple)
- [ ] Can add tags (comma-separated or press Enter)
- [ ] Can remove tags
- [ ] "Create" button saves filter to database
- [ ] Created filter appears in list
- [ ] Created filter persists on page refresh
- [ ] Created filter available in all page filter dropdowns

### Edit Filter
- [ ] Clicking edit icon opens modal with current filter data
- [ ] Can change filter name
- [ ] Can add/remove priorities
- [ ] Can add/remove tags
- [ ] "Update" button saves changes
- [ ] Changes persist on page refresh

### Delete Filter
- [ ] Delete button shows confirmation
- [ ] Confirmed delete removes filter from list
- [ ] Filter removed from all filter dropdowns
- [ ] Deletion persists on page refresh

### Filter Criteria Display
- [ ] "Priority: P1, P2" shows correct format
- [ ] "Tags: #tag1, #tag2" shows correct format
- [ ] Mixed criteria displays all selected

---

## Phase 5: Goals Page Tests

### Page Load
- [ ] Goals page loads
- [ ] Shows all goals
- [ ] Goal count displayed
- [ ] No console errors

### Goal Display
- [ ] Each goal shows: name, progress bar, current/target/unit
- [ ] Due date shows correctly
- [ ] Status badge shows (on-track/behind)
- [ ] Goals load from database (not localStorage)

### Create Goal
- [ ] "Add goal" button opens modal
- [ ] Can enter goal name
- [ ] Can enter target value
- [ ] Can set unit (£k, %, items, etc.)
- [ ] Can set tracking type (tasks, numeric, milestones, points)
- [ ] Can set due date
- [ ] "Create" button saves to database
- [ ] Created goal appears in list
- [ ] Goal persists on page refresh
- [ ] Goal appears on dashboard (in Goals panel)

### Delete Goal
- [ ] Delete button shows confirmation
- [ ] Confirmed delete removes goal
- [ ] Goal removed from dashboard Goals panel
- [ ] Deletion persists on page refresh

### Goal Progress
- [ ] Progress bar updates correctly
- [ ] Progress percentage calculated (current/target)
- [ ] Status updates based on progress

---

## Phase 6: Cross-Page Persistence Tests

### Task Sync
- [ ] Create task on dashboard
- [ ] Refresh dashboard → task still exists
- [ ] Navigate to board → task appears in Inbox
- [ ] Navigate to tasks list → task appears
- [ ] Navigate back to dashboard → task still there

### Status Sync
- [ ] Move task on board to "Doing"
- [ ] Refresh board → task in Doing
- [ ] Navigate to tasks list → task shows correct status
- [ ] Navigate back to board → task still in Doing

### Filter Sync
- [ ] Create filter on Filters page
- [ ] Filter appears in dropdown on dashboard
- [ ] Filter appears in dropdown on board
- [ ] Filter appears in dropdown on tasks list

### Goal Display
- [ ] Create goal on Goals page
- [ ] Goal appears on dashboard
- [ ] Edit goal on dashboard
- [ ] Changes persist on Goals page

---

## Phase 7: Performance Tests

### Load Times (Using Chrome DevTools)
- [ ] Dashboard: < 2 seconds (first load)
- [ ] Board: < 2 seconds
- [ ] Tasks List: < 2 seconds
- [ ] Filters: < 2 seconds
- [ ] Goals: < 2 seconds

### Responsiveness
- [ ] Drag-drop on board is smooth (no lag)
- [ ] Click response on modals < 200ms
- [ ] Task creation feedback within 500ms
- [ ] No lag when scrolling large task lists

---

## Phase 8: Error Handling

### Network Errors
- [ ] Dashboard handles database connection error gracefully
- [ ] Shows user-friendly error message if DB unavailable
- [ ] Doesn't crash the app

### Form Validation
- [ ] Can't create task with empty title
- [ ] Can't create filter without name
- [ ] Can't create goal without name/date
- [ ] Error messages display for validation failures

### Edge Cases
- [ ] Very long task titles don't break layout
- [ ] Empty task list shows message
- [ ] More than 10 goals handles pagination/scroll

---

## Phase 9: Data Integrity Tests

### Create-Read Consistency
- [ ] Create task → refresh → read same task
- [ ] Create filter → refresh → read same filter
- [ ] Create goal → refresh → read same goal

### Update Consistency
- [ ] Update task priority → persists
- [ ] Update task status → persists
- [ ] Update filter criteria → persists
- [ ] Update goal progress → persists

### Delete Consistency
- [ ] Delete task → removed from all views
- [ ] Delete filter → removed from all dropdowns
- [ ] Delete goal → removed from dashboard

---

## Phase 10: UI/UX Tests

### Visual Polish
- [ ] No layout shifts when loading
- [ ] Loading states display correctly
- [ ] Buttons have proper hover states
- [ ] Modals are centered and properly overlaid
- [ ] Colors match design (accent-500, gray-200, etc.)

### Accessibility
- [ ] Can navigate with Tab key
- [ ] Modal can be closed with Esc
- [ ] Form inputs have proper labels
- [ ] Buttons have descriptive text

---

## Test Environment

### Prerequisites
- Database: PostgreSQL (Supabase)
- Workspace ID: `b68f4274-c19a-412c-8e26-4eead85dde0e`
- User ID: `dc949f3d-2077-4ff7-8dc2-2a54454b7d74`
- Environment: Production build (npm run build)

### Test Data
- Run migrations: `npx prisma migrate deploy`
- Seed data (optional): `npx prisma db seed`

---

## Sign-Off

**Date Tested:** _______________
**Tester Name:** _______________
**Environment:** _______________
**Build Version:** _______________

### Summary
- [ ] All pages load with real database data ✅
- [ ] All CRUD operations work ✅
- [ ] No TypeScript errors ✅
- [ ] No console errors ✅
- [ ] Performance acceptable ✅
- [ ] Data persists correctly ✅

**Status:** _______________
**Notes:** _______________

---

## Known Issues

(Document any issues found during testing)

---

## Follow-Up Items

- [ ] Deploy to Vercel
- [ ] Test in production environment
- [ ] User acceptance testing
- [ ] Performance monitoring setup
