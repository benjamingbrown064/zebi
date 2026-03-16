# Focus App Workflow Guide

## Task Status Workflow

The board now implements a clear workflow for task progression:

### Status Progression

```
Inbox → Planned → Doing → Check → Done
```

**Blocked** status remains available but is hidden from the board view.

### Board Lane Order

The lanes are displayed in the following order (left to right):
1. **Inbox** - New tasks that need triage
2. **Planned** - Tasks scheduled for work
3. **Doing** - Tasks currently being worked on
4. **Check** - Tasks ready for review/testing
5. **Done** - Completed and approved tasks

### Checkbox Workflow

When you click the checkbox on a task, it automatically transitions based on its current status:

- **Planned** → **Doing**: Click checkbox to start working on a task
- **Doing** → **Check**: Click checkbox when you finish work and it's ready for review
- **Check** → **Done**: Click checkbox after review/testing is complete

This ensures tasks don't skip the "Doing" phase and properly flow through review.

### Manual Status Changes

You can also drag tasks between columns or change the status in the task detail modal for more control.

## Adding Notes to Tasks

### Comments Feature

Every task has a built-in comments section where you can:
- Document what you did when completing a task
- Add context about blockers or challenges
- Communicate with team members
- Track decision history

### Best Practices

**When starting a task (Planned → Doing):**
- Add a comment describing your approach
- Note any dependencies or blockers

**When finishing a task (Doing → Check):**
- Add a comment explaining what was completed
- Include testing instructions if applicable
- Mention any edge cases or known issues

**When reviewing a task (Check → Done):**
- Add a comment with review feedback
- Note what was tested
- Confirm the task meets requirements

### Accessing Comments

1. Click on any task tile to open the detail modal
2. Scroll to the bottom to see the "Comments" section
3. Type your comment and press Enter or click the button
4. Use `@` to mention team members in comments

## Tips

- **Stay in "Doing"**: Don't rush tasks directly to Check - use the Doing column to show active work
- **Document as you go**: Add comments throughout the task lifecycle, not just at the end
- **Review thoroughly**: Use the Check column as a quality gate before moving to Done
- **Drag and drop**: You can manually drag tasks between columns for flexibility

## Implementation Notes

These workflow improvements were implemented on 2026-02-28:
- Board lanes now sort correctly: Inbox → Planned → Doing → Check → Done
- Checkbox transitions follow the proper workflow path
- Comments feature is fully integrated for task notes and communication
