'use server'

import { prisma } from '@/lib/prisma'

export interface Task {
  id: string
  title: string
  priority: number
  statusId: string
  description?: string
  dueAt?: string
  completedAt?: string
  archivedAt?: string
  tags?: string[]
  goal?: any // Full goal object with { id, name, ... }
  goalId?: string
  space?: { id: string; name: string }
  companyId?: string
  project?: { id: string; name: string }
  projectId?: string
  objective?: { id: string; title: string }
  objectiveId?: string
  assigneeId?: string
  workspaceId: string
  createdAt: string
  updatedAt: string
  // Skill linking
  skillId?: string | null
  outputDocId?: string | null
  linkedDocIds?: string[]
  skipEvaluation?: boolean | null
  skipEvaluationReason?: string | null
  // Dependencies
  dependencyIds?: string[]
  dependencies?: Array<{ id: string; title: string; statusId: string; status: string; isDone: boolean }>
}

export async function getTasks(workspaceId: string, options?: { limit?: number; offset?: number }): Promise<Task[]> {
  try {
    const limit = options?.limit || 500 // Reduced from 1000 — board never needs 1000 tasks
    const offset = options?.offset || 0

    // Use select instead of include to avoid over-fetching heavy fields (description, etc.)
    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
        archivedAt: null,
      },
      select: {
        id: true,
        title: true,
        priority: true,
        statusId: true,
        description: true,
        dueAt: true,
        completedAt: true,
        archivedAt: true,
        goalId: true,
        companyId: true,
        ownerAgent: true,
        botAssignee: true,
        projectId: true,
        objectiveId: true,
        assigneeId: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
        // Lightweight nested selects — no deep joins
        tags: { select: { tag: { select: { name: true } } } },
        goal: { select: { id: true, name: true, status: true } },
        company: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        objective: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
    
    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      statusId: t.statusId,
      description: t.description || undefined,
      dueAt: t.dueAt?.toISOString(),
      completedAt: t.completedAt?.toISOString(),
      tags: t.tags.map(tt => tt.tag.name),
      goal: t.goal || undefined,
      goalId: t.goalId || undefined,
      space: t.company || undefined,
      companyId: t.companyId || undefined,
      project: t.project || undefined,
      projectId: t.projectId || undefined,
      objective: t.objective || undefined,
      objectiveId: t.objectiveId || undefined,
      assigneeId: t.assigneeId || undefined,
      ownerAgent: (t as any).ownerAgent || undefined,
      botAssignee: (t as any).botAssignee || undefined,
      workspaceId: t.workspaceId,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('getTasks error for workspace', workspaceId, ':', errorMsg)
    // Return empty array on database error - UI will use default mock data
    return []
  }
}

export async function createTask(
  workspaceId: string,
  userId: string,
  input: {
    title: string
    priority?: number
    statusId: string
    description?: string
    dueAt?: string
    goalId?: string
    projectId?: string
    assigneeId?: string
    tagNames?: string[]
  }
): Promise<Task | null> {
  try {
    // Verify workspace exists and status belongs to workspace
    const [workspace, status] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: workspaceId } }),
      prisma.status.findFirst({ where: { id: input.statusId, workspaceId } }),
    ])

    if (!workspace) {
      console.error('createTask: workspace not found')
      return null
    }

    if (!status) {
      console.error('createTask: status not found or does not belong to workspace')
      return null
    }

    const task = await prisma.task.create({
      data: {
        workspaceId,
        createdBy: userId,
        title: input.title,
        priority: input.priority || 3,
        statusId: input.statusId,
        description: input.description,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        goalId: input.goalId,
        projectId: input.projectId,
        assigneeId: input.assigneeId || null,
      },
      include: {
        tags: {
          include: { tag: true }
        }
      }
    })

    // Add tags if provided
    // OPTIMIZED: Batch tag operations to reduce queries
    if (input.tagNames?.length) {
      // First, find or create all tags in parallel
      const tagPromises = input.tagNames.map(tagName =>
        prisma.tag.upsert({
          where: { 
            workspaceId_name: {
              workspaceId,
              name: tagName,
            }
          },
          create: { name: tagName, workspaceId },
          update: {}
        })
      )
      const tags = await Promise.all(tagPromises)
      
      // Then create all task-tag relations in a single batch
      if (tags.length > 0) {
        await prisma.taskTag.createMany({
          data: tags.map(tag => ({
            taskId: task.id,
            tagId: tag.id
          })),
          skipDuplicates: true
        })
      }
    }

    return {
      id: task.id,
      title: task.title,
      priority: task.priority,
      statusId: task.statusId,
      description: task.description || undefined,
      dueAt: task.dueAt?.toISOString(),
      completedAt: task.completedAt?.toISOString(),
      tags: input.tagNames || [],
      goalId: task.goalId || undefined,
      projectId: task.projectId || undefined,
      assigneeId: task.assigneeId || undefined,
      workspaceId: task.workspaceId,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }
  } catch (err) {
    console.error('createTask error:', err)
    return null
  }
}

export async function updateTask(
  workspaceId: string,
  taskId: string,
  updates: Partial<Omit<Task, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>
): Promise<Task | null> {
  try {
    // SECURITY: Verify task belongs to this workspace before updating
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, workspaceId }
    })

    if (!existingTask) {
      console.error('updateTask: task not found or does not belong to workspace')
      return null
    }

    // If updating status, verify new status belongs to workspace
    if (updates.statusId) {
      const status = await prisma.status.findFirst({
        where: { id: updates.statusId, workspaceId }
      })
      if (!status) {
        console.error('updateTask: status not found or does not belong to workspace')
        return null
      }
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: updates.title,
        priority: updates.priority,
        statusId: updates.statusId,
        description: updates.description,
        dueAt: updates.dueAt ? new Date(updates.dueAt) : undefined,
        completedAt: updates.completedAt ? new Date(updates.completedAt) : null,
        goalId: updates.goalId,
        projectId: updates.projectId,
        assigneeId: updates.assigneeId !== undefined ? updates.assigneeId : undefined,
        ...((updates as any).skillId !== undefined && { skillId: (updates as any).skillId || null }),
        ...((updates as any).outputDocId !== undefined && { outputDocId: (updates as any).outputDocId || null }),
        ...((updates as any).linkedDocIds !== undefined && { linkedDocIds: (updates as any).linkedDocIds }),
      },
      include: {
        tags: {
          include: { tag: true }
        }
      }
    })

    // If task was marked as complete and has a goal, recalculate goal progress
    if (updates.completedAt && task.goalId) {
      const { calculateGoalProgress } = await import('./goals')
      await calculateGoalProgress(workspaceId, task.goalId)
    }

    // Update tags if provided
    // OPTIMIZED: Batch tag operations to reduce queries
    if (updates.tags) {
      // Delete existing tags
      await prisma.taskTag.deleteMany({ where: { taskId } })

      // Create new tags in parallel
      if (updates.tags.length > 0) {
        const tagPromises = updates.tags.map(tagName =>
          prisma.tag.upsert({
            where: {
              workspaceId_name: {
                workspaceId,
                name: tagName,
              }
            },
            create: { name: tagName, workspaceId },
            update: {}
          })
        )
        const tags = await Promise.all(tagPromises)

        // Create all task-tag relations in a single batch
        await prisma.taskTag.createMany({
          data: tags.map(tag => ({
            taskId: task.id,
            tagId: tag.id
          })),
          skipDuplicates: true
        })
      }
    }

    // Re-fetch task to get updated tags and goal
    const updatedTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        tags: {
          include: { tag: true }
        },
        goal: true
      }
    })

    if (!updatedTask) return null

    return {
      id: updatedTask.id,
      title: updatedTask.title,
      priority: updatedTask.priority,
      statusId: updatedTask.statusId,
      description: updatedTask.description || undefined,
      dueAt: updatedTask.dueAt?.toISOString(),
      completedAt: updatedTask.completedAt?.toISOString(),
      tags: updatedTask.tags.map(tt => tt.tag.name),
      goal: updatedTask.goal || undefined,
      goalId: updatedTask.goalId || undefined,
      projectId: updatedTask.projectId || undefined,
      assigneeId: updatedTask.assigneeId || undefined,
      workspaceId: updatedTask.workspaceId,
      createdAt: updatedTask.createdAt.toISOString(),
      updatedAt: updatedTask.updatedAt.toISOString(),
    }
  } catch (err) {
    console.error('updateTask error:', err)
    return null
  }
}

export async function deleteTask(workspaceId: string, taskId: string): Promise<boolean> {
  try {
    // SECURITY: Verify task belongs to this workspace before deleting
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, workspaceId }
    })

    if (!existingTask) {
      console.error('deleteTask: task not found or does not belong to workspace')
      return false
    }

    // Soft delete — set archivedAt so FK constraints are never a problem
    // and the task can be recovered if needed
    await prisma.task.update({
      where: { id: taskId },
      data: { archivedAt: new Date() },
    })

    return true
  } catch (err) {
    console.error('deleteTask error:', err)
    return false
  }
}
