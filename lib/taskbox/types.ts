// Taskbox MVP Types
// Task management and automation platform

export type TaskboxTaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';

export type TaskboxTaskPriority = 1 | 2 | 3 | 4; // 1=urgent, 2=high, 3=normal, 4=low

export interface TaskboxBoard {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  columns: string[]; // e.g. ["todo", "in_progress", "done"]
  automationRules?: TaskboxAutomationRule[] | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskboxTask {
  id: string;
  workspaceId: string;
  boardId?: string | null;
  companyId?: string | null;
  projectId?: string | null;

  title: string;
  description?: string | null;
  status: TaskboxTaskStatus;
  priority: TaskboxTaskPriority;

  assignedTo?: string | null;
  createdBy: string;

  dueAt?: Date | null;
  blockedReason?: string | null;
  blockedAt?: Date | null;

  automationEnabled: boolean;
  automationRules?: TaskboxAutomationRule[] | null;

  tags: string[];
  labels: string[];
  position?: number | null;

  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
}

export interface TaskboxAutomationLog {
  id: string;
  taskId?: string | null;
  boardId?: string | null;
  triggerType: string;
  actionType: string;
  triggeredAt: Date;
  executedAt?: Date | null;
  status: 'pending' | 'executed' | 'failed';
  errorMessage?: string | null;
  metadata?: Record<string, any> | null;
}

// Automation Rule Types

export type TaskboxTriggerType =
  | 'status_change'
  | 'assignment'
  | 'due_date_approaching'
  | 'task_created'
  | 'tag_added'
  | 'label_added';

export type TaskboxActionType =
  | 'notify'
  | 'move_task'
  | 'assign_task'
  | 'add_comment'
  | 'update_priority'
  | 'create_task';

export interface TaskboxTrigger {
  type: TaskboxTriggerType;
  conditions?: {
    from?: TaskboxTaskStatus;
    to?: TaskboxTaskStatus;
    tag?: string;
    label?: string;
    daysBeforeDue?: number;
  };
}

export interface TaskboxAction {
  type: TaskboxActionType;
  params: {
    target?: string; // user ID, status, etc.
    message?: string;
    title?: string;
    priority?: TaskboxTaskPriority;
    status?: TaskboxTaskStatus;
    assignTo?: string;
  };
}

export interface TaskboxAutomationRule {
  id?: string;
  name: string;
  enabled: boolean;
  trigger: TaskboxTrigger;
  actions: TaskboxAction[];
}

// API Request/Response Types

export interface CreateTaskboxBoardRequest {
  name: string;
  description?: string;
  columns?: string[];
  automationRules?: TaskboxAutomationRule[];
}

export interface UpdateTaskboxBoardRequest {
  name?: string;
  description?: string;
  columns?: string[];
  automationRules?: TaskboxAutomationRule[];
}

export interface CreateTaskboxTaskRequest {
  boardId?: string;
  companyId?: string;
  projectId?: string;
  title: string;
  description?: string;
  status?: TaskboxTaskStatus;
  priority?: TaskboxTaskPriority;
  assignedTo?: string;
  dueAt?: string | Date;
  tags?: string[];
  labels?: string[];
  automationEnabled?: boolean;
  automationRules?: TaskboxAutomationRule[];
}

export interface UpdateTaskboxTaskRequest {
  boardId?: string | null;
  title?: string;
  description?: string;
  status?: TaskboxTaskStatus;
  priority?: TaskboxTaskPriority;
  assignedTo?: string | null;
  dueAt?: string | Date | null;
  blockedReason?: string | null;
  tags?: string[];
  labels?: string[];
  position?: number;
  automationEnabled?: boolean;
  automationRules?: TaskboxAutomationRule[];
}

export interface MoveTaskboxTaskRequest {
  status: TaskboxTaskStatus;
  position?: number;
}

export interface TaskboxTaskFilters {
  boardId?: string;
  status?: TaskboxTaskStatus | TaskboxTaskStatus[];
  assignedTo?: string;
  priority?: TaskboxTaskPriority;
  tags?: string[];
  labels?: string[];
  companyId?: string;
  projectId?: string;
  dueBefore?: string | Date;
  dueAfter?: string | Date;
}

export interface TaskboxBoardWithTasks extends TaskboxBoard {
  tasks: TaskboxTask[];
}

// Automation Execution Context
export interface TaskboxAutomationContext {
  task?: TaskboxTask;
  board?: TaskboxBoard;
  trigger: TaskboxTrigger;
  previousStatus?: TaskboxTaskStatus;
  currentStatus?: TaskboxTaskStatus;
  userId?: string;
}
