'use server'

import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { unstable_cache, revalidateTag } from 'next/cache'

export interface Goal {
  id: string
  name: string
  currentValue: number
  targetValue: number
  unit?: string
  endDate: string
  status: string
  metricType: string
  workspaceId: string
  createdAt: string
  updatedAt: string
}

/**
 * Get all goals for a workspace
 * Cached for 5 minutes with stale-while-revalidate
 */
export const getGoals = unstable_cache(
  async (workspaceId: string): Promise<Goal[]> => {
    try {
      const goals = await prisma.goal.findMany({
        where: { workspaceId, status: { in: ['active', 'paused'] } },
        orderBy: { createdAt: 'desc' }
      })

      return goals.map((g) => ({
        id: g.id,
        name: g.name,
        currentValue: Number(g.currentValue),
        targetValue: Number(g.targetValue),
        unit: g.unit || undefined,
        endDate: g.endDate.toISOString().split('T')[0],
        status: g.status,
        metricType: g.metricType,
        workspaceId: g.workspaceId,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
      }))
    } catch (err) {
      console.error('getGoals error:', err)
      return []
    }
  },
  ['goals-list'],
  {
    revalidate: 300, // 5 minutes
    tags: ['goals']
  }
)

/**
 * Create a new goal
 */
export async function createGoal(
  workspaceId: string,
  userId: string,
  input: {
    name: string
    metricType: string
    targetValue: number
    currentValue?: number
    unit?: string
    startDate?: string
    endDate: string
  }
): Promise<Goal | null> {
  try {
    console.log('createGoal called with:', { workspaceId, userId, input })

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    })

    if (!workspace) {
      console.error('createGoal: workspace not found:', workspaceId)
      return null
    }

    console.log('Workspace found, creating goal...')
    const today = new Date()
    const goal = await prisma.goal.create({
      data: {
        workspaceId,
        createdBy: userId as any,
        name: input.name,
        metricType: input.metricType,
        targetValue: new Decimal(input.targetValue),
        currentValue: new Decimal(input.currentValue || 0),
        unit: input.unit,
        startDate: new Date(input.startDate || today),
        endDate: new Date(input.endDate),
        status: 'active',
      }
    })

    console.log('Goal created successfully:', goal.id)

    // Revalidate goals cache
    revalidateTag('goals')

    return {
      id: goal.id,
      name: goal.name,
      currentValue: Number(goal.currentValue),
      targetValue: Number(goal.targetValue),
      unit: goal.unit || undefined,
      endDate: goal.endDate.toISOString().split('T')[0],
      status: goal.status,
      metricType: goal.metricType,
      workspaceId: goal.workspaceId,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    }
  } catch (err) {
    console.error('createGoal error:', err instanceof Error ? err.message : String(err))
    console.error('Full error:', err)
    return null
  }
}

/**
 * Update a goal
 */
export async function updateGoal(
  workspaceId: string,
  goalId: string,
  updates: Partial<Omit<Goal, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>
): Promise<Goal | null> {
  try {
    // SECURITY: Verify goal belongs to this workspace before updating
    const existingGoal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId }
    })

    if (!existingGoal) {
      console.error('updateGoal: goal not found or does not belong to workspace')
      return null
    }

    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        name: updates.name,
        metricType: updates.metricType,
        targetValue: updates.targetValue !== undefined ? new Decimal(updates.targetValue) : undefined,
        currentValue: updates.currentValue !== undefined ? new Decimal(updates.currentValue) : undefined,
        unit: updates.unit,
        endDate: updates.endDate ? new Date(updates.endDate) : undefined,
        status: updates.status,
      }
    })

    // Revalidate goals cache
    revalidateTag('goals')

    return {
      id: goal.id,
      name: goal.name,
      currentValue: Number(goal.currentValue),
      targetValue: Number(goal.targetValue),
      unit: goal.unit || undefined,
      endDate: goal.endDate.toISOString().split('T')[0],
      status: goal.status,
      metricType: goal.metricType,
      workspaceId: goal.workspaceId,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    }
  } catch (err) {
    console.error('updateGoal error:', err)
    return null
  }
}

/**
 * Delete a goal
 */
export async function deleteGoal(workspaceId: string, goalId: string): Promise<boolean> {
  try {
    // SECURITY: Verify goal belongs to this workspace before deleting
    const existingGoal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId }
    })

    if (!existingGoal) {
      console.error('deleteGoal: goal not found or does not belong to workspace')
      return false
    }

    await prisma.goal.delete({
      where: { id: goalId }
    })

    // Revalidate goals cache
    revalidateTag('goals')

    return true
  } catch (err) {
    console.error('deleteGoal error:', err)
    return false
  }
}

/**
 * Calculate and update goal progress based on linked tasks
 * For "tasks" metric type: counts completed tasks
 * Other types: uses stored currentValue
 */
export async function calculateGoalProgress(workspaceId: string, goalId: string): Promise<Goal | null> {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId }
    })

    if (!goal) {
      console.error('calculateGoalProgress: goal not found')
      return null
    }

    let currentValue = new Decimal(0)

    // For financial goals, calculate from linked space revenue
    if (goal.metricType === 'currency' && goal.companyIds) {
      const companyIds = goal.companyIds as string[]
      
      if (companyIds.length > 0) {
        const spaces = await prisma.space.findMany({
          where: {
            id: { in: companyIds },
            workspaceId,
          },
          select: { revenue: true }
        })

        const totalRevenue = spaces.reduce((sum, space) => {
          return sum + (space.revenue ? Number(space.revenue) : 0)
        }, 0)

        currentValue = new Decimal(totalRevenue)
        console.log(`[calculateGoalProgress] Goal ${goalId} (financial): £${totalRevenue} from ${companyIds.length} spaces`)
      } else {
        console.log(`[calculateGoalProgress] Goal ${goalId} (financial): no linked spaces`)
      }
    } else {
      // For non-financial goals, count completed tasks
      const completedTaskCount = await prisma.task.count({
        where: {
          goalId,
          workspaceId,
          completedAt: { not: null }
        }
      })
      
      currentValue = new Decimal(completedTaskCount)
      console.log(`[calculateGoalProgress] Goal ${goalId}: ${completedTaskCount} completed tasks`)
    }

    // Update goal progress
    await prisma.goal.update({
      where: { id: goalId },
      data: { currentValue }
    })

    // Re-fetch and return updated goal
    const updatedGoal = await prisma.goal.findUnique({
      where: { id: goalId }
    })

    if (!updatedGoal) return null

    return {
      id: updatedGoal.id,
      name: updatedGoal.name,
      currentValue: Number(updatedGoal.currentValue),
      targetValue: Number(updatedGoal.targetValue),
      unit: updatedGoal.unit || undefined,
      endDate: updatedGoal.endDate.toISOString().split('T')[0],
      status: updatedGoal.status,
      metricType: updatedGoal.metricType,
      workspaceId: updatedGoal.workspaceId,
      createdAt: updatedGoal.createdAt.toISOString(),
      updatedAt: updatedGoal.updatedAt.toISOString(),
    }
  } catch (err) {
    console.error('calculateGoalProgress error:', err)
    return null
  }
}

/**
 * Link spaces to a financial goal
 */
export async function linkSpacesToGoal(
  workspaceId: string,
  goalId: string,
  companyIds: string[]
): Promise<Goal | null> {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId }
    })

    if (!goal) {
      console.error('linkSpacesToGoal: goal not found')
      return null
    }

    // Only allow linking for financial goals
    if (goal.metricType !== 'currency') {
      console.warn('linkSpacesToGoal: goal is not financial, skipping')
      return null
    }

    // Update goal with space links
    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: {
        companyIds: companyIds,
      }
    })

    // Recalculate progress immediately
    return calculateGoalProgress(workspaceId, goalId)
  } catch (err) {
    console.error('linkSpacesToGoal error:', err)
    return null
  }
}

/**
 * Get spaces linked to a goal
 */
export async function getLinkedSpaces(
  workspaceId: string,
  goalId: string
): Promise<Array<{ id: string; name: string; revenue: number | null }>> {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId }
    })

    if (!goal || !goal.companyIds) {
      return []
    }

    const companyIds = goal.companyIds as string[]

    const spaces = await prisma.space.findMany({
      where: {
        id: { in: companyIds },
        workspaceId,
      },
      select: {
        id: true,
        name: true,
        revenue: true,
      },
      orderBy: { name: 'asc' }
    })

    return spaces.map(c => ({
      id: c.id,
      name: c.name,
      revenue: c.revenue ? Number(c.revenue) : null,
    }))
  } catch (err) {
    console.error('getLinkedSpaces error:', err)
    return []
  }
}
