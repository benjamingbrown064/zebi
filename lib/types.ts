// ========== API Response Types ==========
export interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

// ========== Task Types ==========
export interface Task {
  id: string
  workspaceId: string
  title: string
  description?: string
  statusId: string
  priority: number // 1-4
  dueAt?: string
  completedAt?: string
  projectId?: string
  goalId?: string
  assigneeId?: string // User ID (UUID or string) for task assignee
  isMilestone: boolean
  todayPinDate?: string
  todayOrder?: number
  createdAt: string
  updatedAt: string
}

export interface TaskCreateInput {
  title: string
  description?: string
  statusId?: string
  priority?: number
  dueAt?: string
  projectId?: string
  goalId?: string
}

// ========== Goal Types ==========
export interface Goal {
  id: string
  workspaceId: string
  name: string
  metricType: 'tasks' | 'milestones' | 'numeric' | 'points'
  targetValue: number
  currentValue: number
  unit?: string
  startDate: string
  endDate: string
  status: 'active' | 'paused' | 'completed' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface GoalCreateInput {
  name: string
  metricType: 'tasks' | 'milestones' | 'numeric' | 'points'
  targetValue: number
  unit?: string
  startDate: string
  endDate: string
}

// ========== Dashboard Types ==========
export interface DashboardData {
  todayTasks: Task[]
  attentionSignals: AttentionSignal[]
  goals: Goal[]
  taskCount: number
  completionRate: number
}

export interface AttentionSignal {
  id: string
  type: 'overdue' | 'blocked' | 'at_risk' | 'mentioned' | 'due_soon'
  taskId?: string
  goalId?: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

// ========== Status Types ==========
export interface Status {
  id: string
  workspaceId: string
  name: string
  type: 'inbox' | 'planned' | 'doing' | 'review' | 'blocked' | 'done' | 'custom'
  isSystem: boolean
  sortOrder: number
}

// ========== Workspace Types ==========
export interface Workspace {
  id: string
  name: string
  plan: 'free' | 'pro' | 'team'
  ownerId: string
  createdAt: string
}

// ========== Auth Types ==========
export interface AuthUser {
  id: string
  email: string
  emailVerified?: boolean
  createdAt: string
}
