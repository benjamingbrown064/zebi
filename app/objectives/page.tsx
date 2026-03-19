import { prisma } from '@/lib/prisma'
import ObjectivesClient from './client'
import { requireWorkspace } from '@/lib/workspace'

// Force revalidation on every request (no caching)
export const revalidate = 0

export default async function ObjectivesPage() {
  try {
    // Get user's workspace (enforces auth and workspace access)
    const workspaceId = await requireWorkspace()
    
    // Fetch objectives with related data
    const [objectives, companies, goals] = await Promise.all([
      prisma.objective.findMany({
        where: { workspaceId },
        include: {
          company: {
            select: { id: true, name: true },
          },
          goal: {
            select: { id: true, name: true },
          },
          milestones: {
            orderBy: { targetDate: 'asc' },
            where: { completedAt: null },
          },
          blockers: {
            where: { resolvedAt: null },
          },
          // Tasks trimmed - use _count for list view performance
          _count: {
            select: {
              tasks: true,
              projects: true,
            },
          },
        },
        orderBy: { deadline: 'asc' },
      }),
      prisma.company.findMany({
        where: { workspaceId, archivedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.goal.findMany({
        where: { workspaceId },
        select: { id: true, name: true },
        orderBy: { createdAt: 'desc' },
      }),
    ])


    // Map objectives with computed fields
    const mappedObjectives = objectives.map((obj) => {
      // Find next milestone
      const nextMilestone = obj.milestones.find(
        (m) => !m.completedAt && Number(m.targetValue) > Number(obj.currentValue)
      )

      // Calculate days until next milestone
      const daysUntilMilestone = nextMilestone
        ? Math.ceil((new Date(nextMilestone.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null

      // AI/human work detection removed for performance (was using full tasks array)
      const aiTask = null
      const humanTask = null

      return {
        id: obj.id,
        title: obj.title,
        description: obj.description,
        companyId: obj.company?.id,
        companyName: obj.company?.name,
        goalId: obj.goal?.id,
        goalName: obj.goal?.name,
        objectiveType: obj.objectiveType,
        metricType: obj.metricType,
        currentValue: Number(obj.currentValue),
        targetValue: Number(obj.targetValue),
        unit: obj.unit,
        startDate: obj.startDate.toISOString(),
        deadline: obj.deadline.toISOString(),
        status: obj.status,
        progressPercent: Number(obj.progressPercent),
        priority: obj.priority,
        activeBlockers: obj.blockers.length,
        nextMilestone: nextMilestone
          ? {
              title: nextMilestone.title,
              targetValue: Number(nextMilestone.targetValue),
              targetDate: nextMilestone.targetDate.toISOString(),
              daysUntil: daysUntilMilestone!,
            }
          : undefined,
        aiWork: aiTask?.title,
        humanWork: humanTask?.title,
        taskCount: obj._count.tasks,
        projectCount: obj._count.projects,
      }
    })

    return (
      <ObjectivesClient
        initialObjectives={mappedObjectives}
        companies={companies}
        goals={goals}
        workspaceId={workspaceId}
      />
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Failed to load objectives:', msg)
    return (
      <div className="min-h-screen bg-bg-cream flex items-center justify-center">
        <div className="text-red-600">Failed to load objectives: {msg}</div>
      </div>
    )
  }
}
