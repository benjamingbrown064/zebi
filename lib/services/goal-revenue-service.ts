import { prisma } from '@/lib/prisma'

/**
 * Calculate financial goal progress based on linked company revenue
 */
export async function calculateGoalRevenue(goalId: string, workspaceId: string) {
  try {
    // Get the goal
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      select: {
        metricType: true,
        companyIds: true,
        workspaceId: true,
      },
    })

    if (!goal) return null

    // Only calculate for financial goals
    if (goal.metricType !== 'currency') {
      return null
    }

    // If no companies linked, return 0
    const companyIds = goal.companyIds as string[] | null
    if (!companyIds || companyIds.length === 0) {
      return 0
    }

    // Sum revenue from all linked companies
    const companies = await prisma.company.findMany({
      where: {
        id: { in: companyIds },
        workspaceId,
      },
      select: {
        id: true,
        name: true,
        revenue: true,
      },
    })

    const totalRevenue = companies.reduce((sum, company) => {
      return sum + (company.revenue ? Number(company.revenue) : 0)
    }, 0)

    return totalRevenue
  } catch (error) {
    console.error('Error calculating goal revenue:', error)
    return null
  }
}

/**
 * Get goal with calculated revenue
 */
export async function getGoalWithRevenue(goalId: string, workspaceId: string) {
  try {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    })

    if (!goal) return null

    // If financial goal, calculate current value from companies
    if (goal.metricType === 'currency') {
      const calculatedRevenue = await calculateGoalRevenue(goalId, workspaceId)
      if (calculatedRevenue !== null) {
        return {
          ...goal,
          currentValue: calculatedRevenue,
          isCalculatedFromRevenue: true,
        }
      }
    }

    return {
      ...goal,
      isCalculatedFromRevenue: false,
    }
  } catch (error) {
    console.error('Error fetching goal with revenue:', error)
    return null
  }
}

/**
 * Get all goals with calculated revenue
 */
export async function getGoalsWithRevenue(workspaceId: string) {
  try {
    const goals = await prisma.goal.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate revenue for financial goals
    const goalsWithRevenue = await Promise.all(
      goals.map(async (goal) => {
        if (goal.metricType === 'currency') {
          const calculatedRevenue = await calculateGoalRevenue(goal.id, workspaceId)
          if (calculatedRevenue !== null) {
            return {
              ...goal,
              currentValue: calculatedRevenue,
              isCalculatedFromRevenue: true,
            }
          }
        }
        return {
          ...goal,
          isCalculatedFromRevenue: false,
        }
      })
    )

    return goalsWithRevenue
  } catch (error) {
    console.error('Error fetching goals with revenue:', error)
    return []
  }
}

/**
 * Link companies to a financial goal
 */
export async function linkCompaniesToGoal(
  goalId: string,
  companyIds: string[],
  workspaceId: string
) {
  try {
    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        companyIds: companyIds,
      },
    })

    return goal
  } catch (error) {
    console.error('Error linking companies to goal:', error)
    throw error
  }
}

/**
 * Get companies linked to a goal
 */
export async function getLinkedCompanies(goalId: string, workspaceId: string) {
  try {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      select: { companyIds: true },
    })

    if (!goal || !goal.companyIds) return []

    const companyIds = goal.companyIds as string[]

    const companies = await prisma.company.findMany({
      where: {
        id: { in: companyIds },
        workspaceId,
      },
      select: {
        id: true,
        name: true,
        revenue: true,
        industry: true,
      },
    })

    return companies
  } catch (error) {
    console.error('Error fetching linked companies:', error)
    return []
  }
}
