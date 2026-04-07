# Taskbox MVP - Technical Design

**Status:** Initial Design  
**Task ID:** 4abce36b-b9eb-47f1-b308-adf4dbd120f2  
**Priority:** P2  
**Estimated Build:** 4 weeks  
**Created:** 2026-04-07 (Doug, autonomous work poll)

## Overview

Taskbox is a task management and automation platform. The MVP needs to deliver core board functionality and automation flows that validate the product concept with early users.

## Definition of Done

- Core task board UI with create/read/update/delete operations
- Task state management (todo, in-progress, done, etc.)
- Automation logic for task workflows
- Basic user permissions and access control
- Testing infrastructure for task operations
- Ready for user acceptance testing

## Architecture

### Database Schema

**Tasks Table (`tasks`)**
```sql
CREATE TABLE taskbox_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  company_id UUID REFERENCES companies(id),
  project_id UUID REFERENCES projects(id),
  
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo', -- todo, in_progress, blocked, done
  priority INTEGER DEFAULT 3, -- 1=urgent, 2=high, 3=normal, 4=low
  
  assigned_to UUID REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  
  due_at TIMESTAMP WITH TIME ZONE,
  blocked_reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE,
  
  -- Automation fields
  automation_enabled BOOLEAN DEFAULT FALSE,
  automation_rules JSONB, -- Triggers and actions
  
  -- Metadata
  tags TEXT[],
  labels TEXT[],
  position INTEGER, -- For board ordering
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_taskbox_workspace ON taskbox_tasks(workspace_id);
CREATE INDEX idx_taskbox_status ON taskbox_tasks(status);
CREATE INDEX idx_taskbox_assigned ON taskbox_tasks(assigned_to);
CREATE INDEX idx_taskbox_due ON taskbox_tasks(due_at);
```

**Boards Table (`taskbox_boards`)**
```sql
CREATE TABLE taskbox_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Column configuration
  columns JSONB NOT NULL DEFAULT '["todo", "in_progress", "done"]',
  
  -- Automation
  automation_rules JSONB, -- Board-level automation
  
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Automation Logs (`taskbox_automation_logs`)**
```sql
CREATE TABLE taskbox_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES taskbox_tasks(id) ON DELETE CASCADE,
  board_id UUID REFERENCES taskbox_boards(id) ON DELETE CASCADE,
  
  trigger_type TEXT NOT NULL, -- status_change, due_date, assignment, etc.
  action_type TEXT NOT NULL, -- notify, move, assign, etc.
  
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, executed, failed
  
  error_message TEXT,
  metadata JSONB
);
```

### API Routes

**Tasks**
- `GET /api/taskbox/tasks` - List tasks (with filters: status, assigned_to, board, etc.)
- `POST /api/taskbox/tasks` - Create task
- `GET /api/taskbox/tasks/:id` - Get task details
- `PATCH /api/taskbox/tasks/:id` - Update task
- `DELETE /api/taskbox/tasks/:id` - Delete task
- `POST /api/taskbox/tasks/:id/move` - Move task to different status/board

**Boards**
- `GET /api/taskbox/boards` - List boards
- `POST /api/taskbox/boards` - Create board
- `GET /api/taskbox/boards/:id` - Get board with tasks
- `PATCH /api/taskbox/boards/:id` - Update board
- `DELETE /api/taskbox/boards/:id` - Delete board

**Automation**
- `GET /api/taskbox/automation/rules` - List automation rules
- `POST /api/taskbox/automation/rules` - Create automation rule
- `GET /api/taskbox/automation/logs` - View automation execution logs
- `POST /api/taskbox/tasks/:id/automation/execute` - Manually trigger automation

### Frontend Components

**Board View (`/taskbox/boards/:id`)**
- Kanban-style column layout
- Drag-and-drop task movement
- Inline task creation
- Quick filters (assignee, labels, priority)

**Task Detail Modal**
- Full task CRUD
- Comments/activity log
- Automation rule configuration
- Attachment support (future)

**Automation Builder**
- Trigger configuration (when X happens)
- Action configuration (do Y)
- Visual rule builder UI

### Automation Engine

**Core Trigger Types:**
- Task status changed
- Task assigned
- Due date approaching
- Task created in board
- Task tagged with label

**Core Action Types:**
- Send notification (email, Zebi bus message, push)
- Move task to different status
- Assign task to user
- Add comment
- Update priority
- Create follow-up task

**Example Automation Flow:**
```json
{
  "trigger": {
    "type": "status_change",
    "from": "in_progress",
    "to": "done"
  },
  "actions": [
    {
      "type": "notify",
      "target": "task.created_by",
      "message": "Task completed: {{task.title}}"
    },
    {
      "type": "create_task",
      "title": "Review: {{task.title}}",
      "assign_to": "manager"
    }
  ]
}
```

## Implementation Phases

### Phase 1: Core Foundation (Week 1)
- [ ] Database migrations (tasks, boards, automation_logs tables)
- [ ] API routes for basic task CRUD
- [ ] Basic board API
- [ ] Database utilities and helpers
- [ ] Initial TypeScript types

### Phase 2: Frontend Board UI (Week 2)
- [ ] Board list page
- [ ] Kanban board view
- [ ] Task cards with drag-and-drop
- [ ] Task detail modal
- [ ] Basic task filtering

### Phase 3: Automation Engine (Week 3)
- [ ] Automation rule data model
- [ ] Trigger detection system
- [ ] Action execution engine
- [ ] Automation configuration UI
- [ ] Automation logs viewer

### Phase 4: Polish & Testing (Week 4)
- [ ] End-to-end tests for core flows
- [ ] Performance optimization
- [ ] Error handling and validation
- [ ] Documentation
- [ ] UAT preparation

## Technical Decisions

### Stack
- **Backend:** Next.js API routes (existing Zebi pattern)
- **Database:** PostgreSQL (existing)
- **Frontend:** React + TypeScript
- **UI Components:** Existing Zebi design system
- **Drag & Drop:** `@dnd-kit/core` (modern, accessible)
- **State Management:** React Query for server state
- **Automation Queue:** PostgreSQL + cron jobs initially (can migrate to Redis later)

### Key Constraints
- Must integrate with existing Zebi workspace/company model
- Reuse existing auth and permissions infrastructure
- Follow Zebi's established patterns for consistency
- Keep automation simple for MVP (complex workflows can come later)

## Open Questions

1. **Multi-board support:** Should MVP support multiple boards per workspace, or start with single default board?
2. **Permissions:** Board-level permissions, or inherit from workspace/company?
3. **Real-time updates:** WebSocket/SSE for live board updates, or polling?
4. **Task relationships:** Support sub-tasks or task dependencies in MVP?
5. **Automation complexity:** Allow chained automation (automation triggers automation), or keep simple?

## Next Steps

1. Review this design with Ben/team
2. Make decisions on open questions
3. Create database migrations
4. Build API foundation
5. Start frontend board view

---

**Notes:**
- This design prioritizes shipping a working MVP quickly over feature completeness
- Automation keeps it simple initially — trigger → action, no complex branching
- Board UI follows proven Kanban patterns (Trello, Asana) for familiarity
- Infrastructure reuse reduces build time and maintains consistency
