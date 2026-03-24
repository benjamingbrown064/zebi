'use server'

import { prisma } from '@/lib/prisma'

export interface AIInsight {
  id: string
  workspaceId: string
  companyId: string | null
  insightType: string
  title: string
  summary: string
  detailedAnalysis: any
  suggestedActions: any
  priority: number
  status: string
  createdAt: Date
  reviewedAt: Date | null
  reviewedBy: string | null
  space?: {
    id: string
    name: string
  } | null
}

export interface CreateAIInsightInput {
  companyId?: string
  insightType: string
  title: string
  summary: string
  detailedAnalysis: any
  suggestedActions?: any
  priority: number
}

export interface UpdateAIInsightInput {
  companyId?: string
  insightType?: string
  title?: string
  summary?: string
  detailedAnalysis?: any
  suggestedActions?: any
  priority?: number
  status?: string
}

export interface AIInsightFilters {
  companyId?: string
  insightType?: string
  status?: string
  priority?: number
  search?: string
}

/**
 * Get all AI insights for a workspace with optional filters
 */
export async function getAIInsights(
  workspaceId: string,
  filters?: AIInsightFilters
): Promise<AIInsight[]> {
  try {
    const where: any = { workspaceId }

    if (filters?.companyId) {
      where.companyId = filters.companyId
    }

    if (filters?.insightType) {
      where.insightType = filters.insightType
    }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.priority !== undefined) {
      where.priority = filters.priority
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' as any } },
        { summary: { contains: filters.search, mode: 'insensitive' as any } },
      ]
    }

    const insights = await prisma.aIInsight.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // new first
        { priority: 'asc' }, // higher priority first (1 = highest)
        { createdAt: 'desc' },
      ],
    })

    return insights
  } catch (error) {
    console.error('Error fetching AI insights:', error)
    throw new Error('Failed to fetch AI insights')
  }
}

/**
 * Get a single AI insight by ID
 */
export async function getAIInsight(
  workspaceId: string,
  insightId: string
): Promise<AIInsight | null> {
  try {
    const insight = await prisma.aIInsight.findFirst({
      where: {
        id: insightId,
        
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return insight
  } catch (error) {
    console.error('Error fetching AI insight:', error)
    throw new Error('Failed to fetch AI insight')
  }
}

/**
 * Create a new AI insight
 */
export async function createAIInsight(
  workspaceId: string,
  input: CreateAIInsightInput
): Promise<AIInsight> {
  try {
    const insight = await prisma.aIInsight.create({
      data: {
        workspaceId,
        companyId: input.companyId || null,
        insightType: input.insightType,
        title: input.title,
        summary: input.summary,
        detailedAnalysis: input.detailedAnalysis,
        suggestedActions: input.suggestedActions || null,
        priority: input.priority,
        status: 'new',
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return insight
  } catch (error) {
    console.error('Error creating AI insight:', error)
    throw new Error('Failed to create AI insight')
  }
}

/**
 * Update an existing AI insight
 */
export async function updateAIInsight(
  workspaceId: string,
  insightId: string,
  updates: UpdateAIInsightInput
): Promise<AIInsight> {
  try {
    // First verify workspace ownership
    const existing = await prisma.aIInsight.findUnique({
      where: { id: insightId },
    })
    
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new Error('Insight not found or access denied')
    }

    const insight = await prisma.aIInsight.update({
      where: {
        id: insightId,
      },
      data: updates,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return insight
  } catch (error) {
    console.error('Error updating AI insight:', error)
    throw new Error('Failed to update AI insight')
  }
}

/**
 * Delete an AI insight
 */
export async function deleteAIInsight(
  workspaceId: string,
  insightId: string
): Promise<boolean> {
  try {
    await prisma.aIInsight.delete({
      where: {
        id: insightId,
        
      },
    })

    return true
  } catch (error) {
    console.error('Error deleting AI insight:', error)
    throw new Error('Failed to delete AI insight')
  }
}

/**
 * Review an AI insight (marks as reviewed)
 */
export async function reviewAIInsight(
  workspaceId: string,
  insightId: string,
  userId: string
): Promise<AIInsight> {
  try {
    const insight = await prisma.aIInsight.update({
      where: {
        id: insightId,
        
      },
      data: {
        status: 'reviewed',
        reviewedAt: new Date(),
        reviewedBy: userId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return insight
  } catch (error) {
    console.error('Error reviewing AI insight:', error)
    throw new Error('Failed to review AI insight')
  }
}

/**
 * Mark an AI insight as implemented
 */
export async function implementAIInsight(
  workspaceId: string,
  insightId: string,
  userId: string
): Promise<AIInsight> {
  try {
    const insight = await prisma.aIInsight.update({
      where: {
        id: insightId,
        
      },
      data: {
        status: 'implemented',
        reviewedAt: new Date(),
        reviewedBy: userId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return insight
  } catch (error) {
    console.error('Error implementing AI insight:', error)
    throw new Error('Failed to implement AI insight')
  }
}

/**
 * Dismiss an AI insight
 */
export async function dismissAIInsight(
  workspaceId: string,
  insightId: string,
  userId: string
): Promise<AIInsight> {
  try {
    const insight = await prisma.aIInsight.update({
      where: {
        id: insightId,
        
      },
      data: {
        status: 'dismissed',
        reviewedAt: new Date(),
        reviewedBy: userId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return insight
  } catch (error) {
    console.error('Error dismissing AI insight:', error)
    throw new Error('Failed to dismiss AI insight')
  }
}

/**
 * Get insight types for filtering
 */
export async function getInsightTypes(): Promise<string[]> {
  return [
    'opportunity',
    'risk',
    'strategy',
    'optimization',
  ]
}

/**
 * Get insight statuses for filtering
 */
export async function getInsightStatuses(): Promise<string[]> {
  return [
    'new',
    'reviewed',
    'implemented',
    'dismissed',
  ]
}
