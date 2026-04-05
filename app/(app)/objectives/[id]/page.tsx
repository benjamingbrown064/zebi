import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ObjectiveDetailClient from './client'

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'

export default async function ObjectiveDetailPage({ params }: { params: { id: string } }) {
  try {
    // Parallelize all independent queries for faster loading
    const [
      objective,
      memories,
      insights,
      activityLogs,
    ] = await Promise.all([
      // Main objective query - optimized with select statements
      prisma.objective.findUnique({
        where: { id: params.id },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              industry: true,
              stage: true,
              revenue: true,
            },
          },
          goal: {
            select: {
              id: true,
              name: true,
            },
          },
          milestones: {
            orderBy: { targetDate: 'asc' },
            take: 20, // Limit to first 20 milestones
          },
          progressEntries: {
            orderBy: { entryDate: 'desc' },
            take: 30, // Limit to 30 most recent entries
          },
          blockers: {
            where: { resolvedAt: null }, // Only unresolved blockers
            orderBy: { detectedAt: 'desc' },
          },
          // OPTIMIZATION: Only load project summaries, not all tasks
          projects: {
            where: { archivedAt: null },
            select: {
              id: true,
              name: true,
              description: true,
              priority: true,
              createdAt: true,
              updatedAt: true,
              // Use _count to get task counts without loading all tasks
              _count: {
                select: {
                  tasks: {
                    where: { archivedAt: null },
                  },
                },
              },
              // Only load task summary data
              tasks: {
                where: { 
                  archivedAt: null,
                  completedAt: { not: null }, // Only completed tasks for progress calc
                },
                select: {
                  id: true,
                  completedAt: true,
                },
              },
            },
            orderBy: { priority: 'asc' },
            take: 50, // Limit to first 50 projects
          },
          // OPTIMIZATION: Limit direct tasks
          tasks: {
            where: { archivedAt: null },
            select: {
              id: true,
              title: true,
              statusId: true,
              completedAt: true,
              createdAt: true,
              status: {
                select: {
                  name: true,
                  type: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 100, // Limit to first 100 tasks
          },
        },
      }),
      
      // AI memories - separate query for better performance
      prisma.aIMemory.findMany({
        where: {
          OR: [
            { companyId: params.id }, // This should be objective.companyId, but we'll fix in a second pass
          ],
        },
        select: {
          id: true,
          memoryType: true,
          title: true,
          description: true,
          confidenceScore: true,
          source: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { confidenceScore: 'desc' },
        take: 10,
      }),
      
      // AI insights - separate query
      prisma.aIInsight.findMany({
        where: {
          status: { in: ['new', 'reviewed'] },
        },
        select: {
          id: true,
          insightType: true,
          title: true,
          summary: true,
          priority: true,
          status: true,
          createdAt: true,
          reviewedAt: true,
        },
        orderBy: { priority: 'asc' },
        take: 10,
      }),
      
      // Activity logs - separate query with limit
      prisma.activityLog.findMany({
        where: {
          objectiveId: params.id,
        },
        select: {
          id: true,
          eventType: true,
          eventPayload: true,
          createdBy: true,
          createdAt: true,
          aiAgent: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20, // Only load first 20 activity logs
      }),
    ])

    if (!objective) {
      return notFound()
    }

    // Now fetch memories/insights with correct space ID
    const [additionalMemories, spaceInsights] = await Promise.all([
      objective.companyId
        ? prisma.aIMemory.findMany({
            where: {
              companyId: objective.companyId,
            },
            select: {
              id: true,
              memoryType: true,
              title: true,
              description: true,
              confidenceScore: true,
              source: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { confidenceScore: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),
      objective.companyId
        ? prisma.aIInsight.findMany({
            where: {
              companyId: objective.companyId,
              status: { in: ['new', 'reviewed'] },
            },
            select: {
              id: true,
              insightType: true,
              title: true,
              summary: true,
              priority: true,
              status: true,
              createdAt: true,
              reviewedAt: true,
            },
            orderBy: { priority: 'asc' },
            take: 10,
          })
        : Promise.resolve([]),
    ])

    // Merge and deduplicate memories
    const allMemories = [...memories, ...additionalMemories]
      .filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)
      .slice(0, 10)

    // Merge and deduplicate insights
    const allInsights = [...insights, ...spaceInsights]
      .filter((i, idx, arr) => arr.findIndex(x => x.id === i.id) === idx)
      .slice(0, 10)

    // Calculate progress breakdown (for auto-progress objectives)
    let progressBreakdown = null
    if (objective.progressMode === 'auto') {
      const directTasks = objective.tasks
      const completedDirectTasks = directTasks.filter(t => t.completedAt).length
      
      // Calculate project task totals from counts
      const projectTaskTotal = objective.projects.reduce(
        (sum, p) => sum + p._count.tasks,
        0
      )
      const projectTaskCompleted = objective.projects.reduce(
        (sum, p) => sum + p.tasks.length, // p.tasks only has completed tasks
        0
      )

      progressBreakdown = {
        totalTasks: objective.totalTaskCount || 0,
        completedTasks: objective.completedTaskCount || 0,
        directTasks: {
          total: directTasks.length,
          completed: completedDirectTasks,
        },
        projectTasks: {
          total: projectTaskTotal,
          completed: projectTaskCompleted,
        },
        scopeChangeNote: objective.scopeChangeNote || null,
        lastRecalc: objective.lastProgressRecalc?.toISOString() || null,
      }
    }

    // Map and serialize data
    const mappedObjective = {
      ...objective,
      currentValue: Number(objective.currentValue),
      targetValue: Number(objective.targetValue),
      progressPercent: Number(objective.progressPercent),
      progressBreakdown,
      startDate: objective.startDate.toISOString(),
      deadline: objective.deadline.toISOString(),
      createdAt: objective.createdAt.toISOString(),
      updatedAt: objective.updatedAt.toISOString(),
      completedAt: objective.completedAt?.toISOString() || null,
      lastChecked: objective.lastChecked?.toISOString() || null,
      lastProgressRecalc: objective.lastProgressRecalc?.toISOString() || null,
      space: objective.company
        ? {
            ...objective.company,
            revenue: objective.company.revenue ? Number(objective.company.revenue) : null,
          }
        : null,
      milestones: objective.milestones.map(m => ({
        ...m,
        targetValue: Number(m.targetValue),
        targetDate: m.targetDate.toISOString(),
        completedAt: m.completedAt?.toISOString() || null,
      })),
      progressEntries: objective.progressEntries.map(p => ({
        ...p,
        value: Number(p.value),
        entryDate: p.entryDate.toISOString(),
        createdAt: p.createdAt.toISOString(),
      })),
      blockers: objective.blockers.map(b => ({
        ...b,
        detectedAt: b.detectedAt.toISOString(),
        resolvedAt: b.resolvedAt?.toISOString() || null,
      })),
      projects: objective.projects.map(p => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        taskCount: p._count.tasks,
        completedTaskCount: p.tasks.length,
        // Don't send the full tasks array to client
        tasks: p.tasks.map(t => ({
          id: t.id,
          completedAt: t.completedAt?.toISOString() || null,
        })),
      })),
      tasks: objective.tasks.map(t => ({
        ...t,
        completedAt: t.completedAt?.toISOString() || null,
        createdAt: t.createdAt.toISOString(),
      })),
    }

    const mappedMemories = allMemories.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }))

    const mappedInsights = allInsights.map(i => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
      reviewedAt: i.reviewedAt?.toISOString() || null,
    }))

    const mappedActivityLogs = activityLogs.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    }))

    return (
      <ObjectiveDetailClient
        objective={mappedObjective}
        memories={mappedMemories}
        insights={mappedInsights}
        activityLogs={mappedActivityLogs}
      />
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Failed to load objective:', msg)
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <div className="text-red-600">Failed to load objective: {msg}</div>
      </div>
    )
  }
}
