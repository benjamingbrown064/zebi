import { z } from 'zod'

// ========== AUTH SCHEMAS ==========
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  workspaceName: z.string().min(1, 'Workspace name is required').max(50),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

// ========== TASK SCHEMAS ==========
export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(255),
  description: z.string().optional(),
  priority: z.number().min(1).max(4).default(3),
  dueAt: z.string().datetime().optional(),
  projectId: z.string().optional(),
  goalId: z.string().optional(),
})

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  priority: z.number().min(1).max(4).optional(),
  dueAt: z.string().datetime().optional(),
  statusId: z.string().optional(),
  projectId: z.string().optional(),
  goalId: z.string().optional(),
})

export const PinTaskToTodaySchema = z.object({
  taskId: z.string(),
  date: z.string().date(),
  order: z.number().min(0).max(4),
})

export const CompleteTaskSchema = z.object({
  taskId: z.string(),
})

// ========== GOAL SCHEMAS ==========
export const CreateGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(255),
  metricType: z.enum(['tasks', 'milestones', 'numeric', 'points']),
  targetValue: z.number().min(0),
  unit: z.string().max(50).optional(),
  startDate: z.string().date(),
  endDate: z.string().date(),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
})

export const UpdateGoalSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  targetValue: z.number().min(0).optional(),
  unit: z.string().max(50).optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
})

// ========== FILTER SCHEMAS ==========
export const SavedFilterSchema = z.object({
  name: z.string().min(1).max(100),
  definition: z.object({
    status: z.array(z.string()).optional(),
    priority: z.array(z.number()).optional(),
    dueDateWindow: z.enum(['overdue', 'today', 'next_7_days', 'next_30_days']).optional(),
    tags: z.array(z.string()).optional(),
    project: z.string().optional(),
    goal: z.string().optional(),
    assignedTo: z.string().optional(),
    hasAttachments: z.boolean().optional(),
    isBlocked: z.boolean().optional(),
  }),
  defaultView: z.enum(['list', 'board', 'calendar']).default('list'),
})

// ========== WORKSPACE SCHEMAS ==========
export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
})

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
})

// ========== VALIDATION HELPERS ==========
export function validateRequest<T>(schema: z.ZodSchema, data: unknown): { valid: boolean; data?: T; error?: string } {
  try {
    const result = schema.parse(data)
    return { valid: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message }
    }
    return { valid: false, error: 'Validation failed' }
  }
}
