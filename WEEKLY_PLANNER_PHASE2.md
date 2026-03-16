# Weekly Planner - Phase 2 Build Spec

## Objective
Build a simple weekly task allocation view where users can assign tasks to days, see daily load, and move tasks between days with minimal friction.

## Database Changes

### Add field to Task model
```prisma
model Task {
  // ... existing fields
  plannedDate: DateTime?  // Day this task is planned for (nullable = unassigned)
}
```

## Pages & Routes

### `/planner` - Weekly Planner Page
Main view. Server component to fetch tasks + calculate loads.

**Layout:**
```
[Header: Week Navigation] [Week Summary Bar]
[7-Day Board - 7 columns]
[Day | Day | Day | Day | Day | Day | Day]
```

## Components

### 1. `WeeklyPlannerPage` (Server)
- Fetch all tasks for workspace
- Fetch settings (working hours, etc.)
- Calculate week start/end
- Pass to client component

### 2. `WeeklyPlannerClient` (Client)
- Handle state: selectedWeek, selectedDay
- Manage task moves (optimistic update)
- Render 7-day board

### 3. `WeekNavigator`
- Prev week, next week, today buttons
- Show week range (Mon 10 Mar - Sun 16 Mar)

### 4. `DayColumn` (reusable for each day)
Props: `day, tasks, capacity, onTaskMove, onDaySelect`

Display:
```
Monday, Mar 10
━━━━━━━━━━━━━━
📌 Task 1 (2h)
📌 Task 2 (1h)
📌 Task 3 (4h)
━━━━━━━━━━━━━━
Total: 7h / 8h capacity
[+] Add task
```

### 5. `DayCapacityMeter`
Shows: current/target hours with color coding
- Green: 0-60% capacity
- Yellow: 60-90% capacity
- Red: 90%+ capacity (overloaded)

### 6. `PlannerTaskCard`
Draggable task card. Shows:
- Task title
- Duration (estimated)
- Project name (if any)
- Drag handle (⋮⋮)
- Right-click menu: Move to [Mon/Tue/Wed/...], Unschedule, View

### 7. `DayContextMenu` (right-click on day)
- Add task
- Unschedule all
- View capacity settings

## Key Interactions

### Drag-and-Drop
- Drag PlannerTaskCard from one day to another
- On drop: update task.plannedDate via API
- Optimistic UI update (instant feedback)
- Error handling: revert if API fails

### Button-Based Move (accessibility)
- Task card has "Move" button
- Dropdown: [Today, Tomorrow, Mon, Tue, ...]
- Auto-complete → save

### Mark Complete
- Checkbox icon → mark completedAt
- Remove from plan view if completed

## API Endpoints (existing or new)

### PATCH `/api/tasks/[id]`
Update task plannedDate
```
PATCH /api/tasks/123
{ "plannedDate": "2026-03-17" }
```

### GET `/api/tasks?workspaceId=x&plannedWeek=2026-03-10`
Get all tasks planned for week
(Optimization: fetch only needed week)

## Calculations

### Capacity Meter
```
currentHours = sum(task.estimatedDuration for task in day.tasks)
capacity = 8 (default, customizable)
percent = currentHours / capacity
```

### Load State
- Light: 0-60%
- Balanced: 60-85%
- Full: 85-100%
- Overloaded: 100%+

## Mobile Handling
- On mobile, show one day at a time
- Top navigation: [← Prev Day] [Day Name] [Next Day →]
- Single column view
- Same drag-and-drop, same move buttons

## States to Handle
- [ ] Loading initial week
- [ ] Dragging task (UI feedback)
- [ ] Saving task move (spinner on card)
- [ ] Failed save (error toast, revert)
- [ ] Empty backlog (no unassigned tasks)
- [ ] Overloaded day (warning badge)

## Nice-to-Haves (Not Phase 2)
- Week summary bar (total hours, overloaded days count)
- Settings panel (adjust capacity, working hours)
- Filter by project/priority in backlog sidebar
- Undo last action

## Definition of Done
- User can see current week (Mon-Sun)
- User can drag task from backlog to any day
- User can drag task from one day to another
- Each day shows task count + estimated total hours
- Day color-codes by load (green/yellow/red)
- Works on mobile (single day view)
- No timeline/blocking by hour
- Changes persist in database
- Responsive design matches Zebi aesthetic
