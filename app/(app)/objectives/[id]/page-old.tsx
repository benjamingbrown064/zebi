import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ObjectiveDetailClient from './client'

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'

export default async function ObjectiveDetailPage({ params }: { params: { id: string } }) {
  try {
    // Fetch objective with full context
    const objective = await prisma.objective.findUnique({
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
        },
        progressEntries: {
          orderBy: { entryDate: 'desc' },
        },
        blockers: {
          orderBy: { detectedAt: 'desc' },
        },
        projects: {
          where: { archivedAt: null },
          include: {
            tasks: {
              where: { archivedAt: null },
              select: {
                id: true,
                title: true,
                statusId: true,
                completedAt: true,
              },
            },
          },
          orderBy: { priority: 'asc' },
        },
        tasks: {
          where: { archivedAt: null },
          include: {
            status: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!objective) {
      return notFound()
    }

    // Fetch AI memories for intelligence tab
    const memories = await prisma.aIMemory.findMany({
      where: {
        OR: [
          { companyId: objective.companyId },
          { projectId: { in: objective.projects.map(p => p.id) } },
        ],
      },
      orderBy: { confidenceScore: 'desc' },
      take: 10,
    })

    // Fetch AI insights for intelligence tab
    const insights = await prisma.aIInsight.findMany({
      where: {
        companyId: objective.companyId || undefined,
        status: { in: ['new', 'reviewed'] },
      },
      orderBy: { priority: 'asc' },
      take: 10,
    })

    // Fetch activity log
    const activityLogs = await prisma.activityLog.findMany({
      where: {
        OR: [
          { objectiveId: objective.id },
          { projectId: { in: objective.projects.map(p => p.id) } },
          { taskId: { in: objective.tasks.map(t => t.id) } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Calculate progress breakdown (for auto-progress objectives)
    let progressBreakdown = null
    if (objective.progressMode === 'auto') {
      const directTasks = objective.tasks
      const projectTaskIds = new Set(objective.projects.flatMap(p => p.tasks.map(t => t.id)))
      const projectTasks = objective.projects.flatMap(p => p.tasks).filter(t => !directTasks.some(dt => dt.id === t.id))
      
      progressBreakdown = {
        totalTasks: objective.totalTaskCount || 0,
        completedTasks: objective.completedTaskCount || 0,
        directTasks: {
          total: directTasks.length,
          completed: directTasks.filter(t => t.completedAt).length
        },
        projectTasks: {
          total: projectTasks.length,
          completed: projectTasks.filter(t => t.completedAt).length
        },
        scopeChangeNote: objective.scopeChangeNote || null,
        lastRecalc: objective.lastProgressRecalc?.toISOString() || null
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
      space: objective.company ? {
        ...objective.company,
        revenue: objective.company.revenue ? Number(objective.company.revenue) : null,
      } : null,
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
        tasks: p.tasks.map(t => ({
          ...t,
          completedAt: t.completedAt?.toISOString() || null,
        })),
      })),
      tasks: objective.tasks.map(t => ({
        ...t,
        dueAt: t.dueAt?.toISOString() || null,
        completedAt: t.completedAt?.toISOString() || null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    }

    const mappedMemories = memories.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }))

    const mappedInsights = insights.map(i => ({
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
      <div className="min-h-screen bg-bg-cream flex items-center justify-center">
        <div className="text-red-600">Failed to load objective: {msg}</div>
      </div>
    )
  }
}
