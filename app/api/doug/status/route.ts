import { NextRequest, NextResponse } from 'next/server'
import { requireDougAuth } from '@/lib/doug-auth'
import { getDougWorkspaceId } from '@/lib/doug-workspace'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/doug/status
 * 
 * Get workspace overview - objectives, companies, tasks, blockers
 * Used by Doug to understand current state before taking action
 */
export async function GET(request: NextRequest) {
  // Validate Doug's auth token
  const authError = requireDougAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    // Resolve workspace from Doug API context
    const workspaceId = await getDougWorkspaceId()

    // Fetch overview data in parallel
    const [objectives, companies, tasks, blockers, goals] = await Promise.all([
      // Active objectives with progress
      prisma.objective.findMany({
        where: {
          workspaceId,
          status: { in: ['active', 'on_track', 'at_risk', 'blocked'] },
        },
        include: {
          company: { select: { id: true, name: true } },
          goal: { select: { id: true, name: true } },
          milestones: {
            where: { completedAt: null },
            orderBy: { targetDate: 'asc' },
            take: 1,
          },
          blockers: {
            where: { resolvedAt: null },
          },
          _count: {
            select: { tasks: true, projects: true },
          },
        },
        orderBy: { deadline: 'asc' },
        take: 10,
      }),

      // Companies with active projects
      prisma.company.findMany({
        where: {
          workspaceId,
          archivedAt: null,
        },
        include: {
          _count: {
            select: {
              projects: true,
              tasks: true,
              objectives: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),

      // Recent incomplete tasks
      prisma.task.findMany({
        where: {
          workspaceId,
          archivedAt: null,
          completedAt: null,
        },
        include: {
          project: { select: { id: true, name: true } },
          objective: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // All unresolved blockers
      prisma.objectiveBlocker.findMany({
        where: {
          resolvedAt: null,
          objective: {
            workspaceId,
            status: { in: ['active', 'on_track', 'at_risk', 'blocked'] },
          },
        },
        include: {
          objective: {
            select: {
              id: true,
              title: true,
              company: { select: { name: true } },
            },
          },
        },
        orderBy: { detectedAt: 'desc' },
      }),

      // All active goals
      prisma.goal.findMany({
        where: {
          workspaceId,
          status: 'active',
        },
        select: {
          id: true,
          name: true,
          targetValue: true,
          currentValue: true,
          unit: true,
          endDate: true,
        },
        orderBy: { endDate: 'asc' },
      }),
    ])

    // Format response
    const status = {
      workspace: {
        id: workspaceId,
        name: 'My Workspace',
      },
      summary: {
        objectives: objectives.length,
        companies: companies.length,
        tasks: tasks.length,
        blockers: blockers.length,
        goals: goals.length,
      },
      objectives: objectives.map((obj) => ({
        id: obj.id,
        title: obj.title,
        company: obj.company?.name,
        goal: obj.goal?.name,
        status: obj.status,
        progress: `${obj.currentValue}/${obj.targetValue} ${obj.unit || ''}`,
        progressPercent: Number(obj.progressPercent),
        deadline: obj.deadline.toISOString(),
        daysUntilDeadline: Math.ceil(
          (obj.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
        nextMilestone: obj.milestones[0]
          ? {
              title: obj.milestones[0].title,
              targetValue: Number(obj.milestones[0].targetValue),
              targetDate: obj.milestones[0].targetDate.toISOString(),
            }
          : null,
        blockers: obj.blockers.length,
        taskCount: obj._count.tasks,
        projectCount: obj._count.projects,
      })),
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        industry: c.industry,
        stage: c.stage,
        revenue: c.revenue ? Number(c.revenue) : null,
        projectCount: c._count.projects,
        taskCount: c._count.tasks,
        objectiveCount: c._count.objectives,
      })),
      recentTasks: tasks.slice(0, 10).map((t) => ({
        id: t.id,
        title: t.title,
        project: t.project?.name,
        objective: t.objective?.title,
        priority: t.priority,
        createdAt: t.createdAt.toISOString(),
      })),
      blockers: blockers.map((b) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        severity: b.severity,
        objective: {
          id: b.objective.id,
          title: b.objective.title,
          company: b.objective.company?.name,
        },
        detectedAt: b.detectedAt.toISOString(),
      })),
      goals: goals.map((g) => ({
        id: g.id,
        name: g.name,
        progress: `${g.currentValue}/${g.targetValue} ${g.unit || ''}`,
        endDate: g.endDate.toISOString(),
      })),
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('[Doug API] Failed to get status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspace status' },
      { status: 500 }
    )
  }
}
