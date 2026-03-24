/**
 * Intelligence Queries
 * Cross-entity query system for AI Memory and AI Insights
 * Provides fast access to related context for AI analysis
 */

import { prisma } from './prisma'

/**
 * Get full space context (memories + insights + projects + tasks)
 * Used by AI to make informed decisions
 */
export async function getSpaceIntelligence(
  workspaceId: string,
  companyId: string
) {
  const startTime = Date.now()

  const [space, memories, insights, projects, tasks] = await Promise.all([
    // Space profile
    prisma.space.findFirst({
      where: {
        id: companyId,
      },
    }),

    // All memories for this space
    prisma.aIMemory.findMany({
      where: {
        companyId,
        workspaceId,
      },
      orderBy: {
        confidenceScore: 'desc',
      },
      take: 50, // Top 50 memories
    }),

    // All insights for this space
    prisma.aIInsight.findMany({
      where: {
        companyId,
        workspaceId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20, // Last 20 insights
    }),

    // Active projects
    prisma.project.findMany({
      where: {
        companyId,
        workspaceId,
        archivedAt: null,
      },
      include: {
        tasks: {
          where: {
            archivedAt: null,
          },
        },
      },
    }),

    // Recent tasks
    prisma.task.findMany({
      where: {
        companyId,
        workspaceId,
        archivedAt: null,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 100,
    }),
  ])

  const elapsed = Date.now() - startTime

  return {
    space,
    memories,
    insights,
    projects,
    tasks,
    stats: {
      memoryCount: memories.length,
      insightCount: insights.length,
      projectCount: projects.length,
      taskCount: tasks.length,
      queryTimeMs: elapsed,
    },
  }
}

/**
 * Get project context (memories + tasks + space context)
 */
export async function getProjectIntelligence(
  workspaceId: string,
  projectId: string
) {
  const startTime = Date.now()

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspaceId,
    },
    include: {
      company: true,
    },
  })

  if (!project) {
    return null
  }

  const [memories, tasks, spaceMemories] = await Promise.all([
    // Project-specific memories
    prisma.aIMemory.findMany({
      where: {
        projectId,
        workspaceId,
      },
      orderBy: {
        confidenceScore: 'desc',
      },
    }),

    // All project tasks
    prisma.task.findMany({
      where: {
        projectId,
        workspaceId,
        archivedAt: null,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    }),

    // Related space memories (if project has a space)
    project.companyId
      ? prisma.aIMemory.findMany({
          where: {
            companyId: project.companyId,
            workspaceId,
          },
          orderBy: {
            confidenceScore: 'desc',
          },
          take: 20,
        })
      : Promise.resolve([]),
  ])

  const elapsed = Date.now() - startTime

  return {
    project,
    memories,
    spaceMemories,
    tasks,
    stats: {
      memoryCount: memories.length,
      spaceMemoryCount: spaceMemories.length,
      taskCount: tasks.length,
      queryTimeMs: elapsed,
    },
  }
}

/**
 * Search across all intelligence (memories + insights)
 * Fast fuzzy search for Doug to reference context
 */
export async function searchIntelligence(
  workspaceId: string,
  query: string,
  options?: {
    companyId?: string
    limit?: number
  }
) {
  const startTime = Date.now()
  const limit = options?.limit || 20

  const whereClause: any = {
    workspaceId,
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ],
  }

  if (options?.companyId) {
    whereClause.companyId = options.companyId
  }

  const [memories, insights] = await Promise.all([
    prisma.aIMemory.findMany({
      where: whereClause,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        confidenceScore: 'desc',
      },
      take: limit,
    }),

    prisma.aIInsight.findMany({
      where: {
        workspaceId,
        ...(options?.companyId && { companyId: options.companyId }),
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { summary: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    }),
  ])

  const elapsed = Date.now() - startTime

  return {
    memories,
    insights,
    stats: {
      memoryCount: memories.length,
      insightCount: insights.length,
      queryTimeMs: elapsed,
    },
  }
}

/**
 * Get recent intelligence activity
 * Shows what Doug has been learning
 */
export async function getRecentIntelligenceActivity(
  workspaceId: string,
  limit: number = 20
) {
  const startTime = Date.now()

  const [recentMemories, recentInsights] = await Promise.all([
    prisma.aIMemory.findMany({
      where: {
        workspaceId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    }),

    prisma.aIInsight.findMany({
      where: {
        workspaceId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    }),
  ])

  const elapsed = Date.now() - startTime

  // Merge and sort by creation date
  const combined = [
    ...recentMemories.map((m) => ({ type: 'memory' as const, item: m })),
    ...recentInsights.map((i) => ({ type: 'insight' as const, item: i })),
  ].sort((a, b) => {
    const aTime = a.item.createdAt.getTime()
    const bTime = b.item.createdAt.getTime()
    return bTime - aTime
  })

  return {
    activity: combined.slice(0, limit),
    stats: {
      totalCount: combined.length,
      queryTimeMs: elapsed,
    },
  }
}

/**
 * Get intelligence summary for dashboard
 * Quick stats about what Doug knows
 */
export async function getIntelligenceSummary(workspaceId: string) {
  const startTime = Date.now()

  const [
    totalMemories,
    totalInsights,
    newInsights,
    highConfidenceMemories,
  ] = await Promise.all([
    prisma.aIMemory.count({
      where: { workspaceId },
    }),

    prisma.aIInsight.count({
      where: { workspaceId },
    }),

    prisma.aIInsight.count({
      where: {
        workspaceId,
        status: 'new',
      },
    }),

    prisma.aIMemory.count({
      where: {
        workspaceId,
        confidenceScore: { gte: 8 },
      },
    }),
  ])

  const elapsed = Date.now() - startTime

  return {
    totalMemories,
    totalInsights,
    newInsights,
    highConfidenceMemories,
    queryTimeMs: elapsed,
  }
}
