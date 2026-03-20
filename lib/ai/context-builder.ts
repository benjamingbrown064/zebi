import { prisma } from '@/lib/prisma'

export interface AIContext {
  workspace: {
    id: string
    name: string
    primaryGoal: any | null
    activeGoals: any[]
    companies: any[]
    activeObjectives: any[]
    activeProjects: any[]
    recentTasks: any[]
    blockers: any[]
  }
  user: {
    preferences: Record<string, any>
    workingHours?: { start: string; end: string }
    timezone?: string
  }
  temporal: {
    currentDate: string
    dayOfWeek: string
    upcomingDeadlines: any[]
  }
}

/**
 * Build context for AI from workspace data
 */
// In-process context cache: avoids 7 DB queries per AI request (TTL: 2 min)
const contextCache = new Map<string, { result: Awaited<ReturnType<typeof buildContextUncached>>; expiresAt: number }>()
const CONTEXT_CACHE_TTL = 2 * 60 * 1000

async function buildContextUncached(
  workspaceId: string,
  userId: string
): Promise<AIContext> {
  // Fetch workspace data in parallel
  const [goals, companies, objectives, projects, tasks, blockers] = await Promise.all([
    // Active goals (sorted by end date, most urgent first)
    prisma.goal.findMany({
      where: { workspaceId, status: 'active' },
      select: {
        id: true,
        name: true,
        targetValue: true,
        currentValue: true,
        unit: true,
        endDate: true,
        missionId: true,
        owner: true,
      },
      orderBy: { endDate: 'asc' },
      take: 10,
    }),

    // Active companies
    prisma.company.findMany({
      where: { workspaceId, archivedAt: null },
      select: {
        id: true,
        name: true,
        industry: true,
        stage: true,
        revenue: true,
      },
      take: 20,
    }),

    // Active objectives with progress
    prisma.objective.findMany({
      where: {
        workspaceId,
        status: { in: ['active', 'on_track', 'at_risk', 'blocked'] },
      },
      select: {
        id: true,
        title: true,
        currentValue: true,
        targetValue: true,
        unit: true,
        deadline: true,
        progressPercent: true,
        priority: true,
        goalId: true,
        companyId: true,
        status: true,
        updatedAt: true,
        company: { select: { name: true } },
      },
      orderBy: { deadline: 'asc' },
      take: 20,
    }),

    // Active projects
    prisma.project.findMany({
      where: { workspaceId, archivedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        goalId: true,
        companyId: true,
        objectiveId: true,
        priority: true,
        owner: true,
        updatedAt: true,
        company: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),

    // Active tasks (not just last 7 days - get all active tasks)
    prisma.task.findMany({
      where: {
        workspaceId,
        completedAt: null,
        archivedAt: null,
      },
      select: {
        id: true,
        title: true,
        priority: true,
        dueAt: true,
        assigneeId: true,
        goalId: true,
        companyId: true,
        objectiveId: true,
        projectId: true,
        todayPinDate: true,
        plannedDate: true,
        updatedAt: true,
        status: { select: { name: true, type: true } },
        project: { select: { name: true } },
        company: { select: { name: true } },
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }, // Fall back to newest for undated tasks
      ],
      take: 50, // Need enough to surface all priority tasks
    }),

    // Active blockers
    prisma.objectiveBlocker.findMany({
      where: {
        resolvedAt: null,
        objective: {
          workspaceId,
          status: { in: ['active', 'on_track', 'at_risk', 'blocked'] },
        },
      },
      select: {
        id: true,
        title: true,
        severity: true,
        objectiveId: true,
        detectedAt: true,
        objective: { select: { title: true, id: true } },
      },
      orderBy: { detectedAt: 'desc' },
      take: 10,
    }),
  ])

  // Identify primary goal (first active goal, or most urgent)
  const primaryGoal = goals.length > 0 ? goals[0] : null

  // Get upcoming deadlines (next 14 days)
  const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const upcomingDeadlines = [
    ...objectives
      .filter((obj) => obj.deadline <= twoWeeksFromNow)
      .map((obj) => ({
        type: 'objective' as const,
        id: obj.id,
        title: obj.title,
        date: obj.deadline,
      })),
    ...tasks
      .filter((task) => task.dueAt && task.dueAt <= twoWeeksFromNow)
      .map((task) => ({
        type: 'task' as const,
        id: task.id,
        title: task.title,
        date: task.dueAt!,
      })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  // Get user preferences from AI memory (if exists)
  const memory = await prisma.aIAssistantMemory.findMany({
    where: { workspaceId, userId, category: 'preference' },
    select: { key: true, value: true },
  })
  const preferences = Object.fromEntries(
    memory.map((m) => [m.key, m.value])
  )

  // Add "isRevenueLinked" flag to items based on company presence
  const enhancedTasks = tasks.map(t => ({
    ...t,
    isRevenueLinked: !!t.companyId,
    lastActivity: t.updatedAt,
    todayPinDate: t.todayPinDate?.toISOString(),
    plannedDate: t.plannedDate?.toISOString() || t.plannedDate,
  }))

  const enhancedProjects = projects.map(p => ({
    ...p,
    isRevenueLinked: !!p.companyId,
    lastActivity: p.updatedAt,
    deadline: null, // Projects don't have explicit deadlines
  }))

  const enhancedObjectives = objectives.map(obj => ({
    ...obj,
    isRevenueLinked: !!obj.companyId,
    lastActivity: obj.updatedAt,
  }))

  return {
    workspace: {
      id: workspaceId,
      name: 'My Workspace', // TODO: Get from workspace table when available
      primaryGoal,
      activeGoals: goals.map((g) => ({
        id: g.id,
        name: g.name,
        progress: `${g.currentValue}/${g.targetValue} ${g.unit || ''}`,
        endDate: g.endDate.toISOString(),
        owner: g.owner,
      })),
      companies: companies.map(c => ({
        id: c.id,
        name: c.name,
        industry: c.industry,
        stage: c.stage,
        revenue: c.revenue?.toString(),
      })),
      activeObjectives: enhancedObjectives.map((obj) => ({
        id: obj.id,
        title: obj.title,
        progress: `${obj.currentValue}/${obj.targetValue} ${obj.unit || ''}`,
        progressPercent: Number(obj.progressPercent),
        deadline: obj.deadline.toISOString(),
        priority: obj.priority,
        goalId: obj.goalId,
        companyId: obj.companyId,
        company: obj.company?.name,
        status: obj.status,
        isRevenueLinked: obj.isRevenueLinked,
        lastActivity: obj.lastActivity.toISOString(),
      })),
      activeProjects: enhancedProjects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        goalId: p.goalId,
        companyId: p.companyId,
        objectiveId: p.objectiveId,
        priority: p.priority,
        owner: p.owner,
        deadline: null, // Projects don't have explicit deadlines in schema
        company: p.company?.name,
        isRevenueLinked: p.isRevenueLinked,
        lastActivity: p.lastActivity.toISOString(),
      })),
      recentTasks: enhancedTasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status.name,
        statusType: t.status.type,
        dueAt: t.dueAt?.toISOString(),
        assigneeId: t.assigneeId,
        goalId: t.goalId,
        companyId: t.companyId,
        objectiveId: t.objectiveId,
        projectId: t.projectId,
        project: t.project?.name,
        company: t.company?.name,
        isRevenueLinked: t.isRevenueLinked,
        lastActivity: t.lastActivity.toISOString(),
        todayPinDate: t.todayPinDate,
        plannedDate: t.plannedDate,
      })),
      blockers: blockers.map((b) => ({
        id: b.id,
        title: b.title,
        severity: b.severity,
        objectiveId: b.objectiveId,
        objective: b.objective.title,
        detectedAt: b.detectedAt.toISOString(),
      })),
    },
    user: {
      preferences,
      workingHours: preferences.workingHours as { start: string; end: string } | undefined,
      timezone: (preferences.timezone as string) || 'UTC',
    },
    temporal: {
      currentDate: new Date().toISOString(),
      dayOfWeek: new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
      }).format(new Date()),
      upcomingDeadlines: upcomingDeadlines.map((d) => ({
        ...d,
        date: d.date.toISOString(),
      })),
    },
  }
}

/**
 * Format context for LLM prompt
 */
export function formatContextForPrompt(context: AIContext): string {
  const lines = [
    '# Workspace Context',
    '',
    `**Date:** ${context.temporal.currentDate.split('T')[0]} (${context.temporal.dayOfWeek})`,
    '',
  ]

  // Primary Goal (if set)
  if (context.workspace.primaryGoal) {
    lines.push('## Primary Goal')
    const deadline = typeof context.workspace.primaryGoal.endDate === 'string' 
      ? context.workspace.primaryGoal.endDate.split('T')[0]
      : context.workspace.primaryGoal.endDate.toISOString().split('T')[0]
    lines.push(`**${context.workspace.primaryGoal.name}**: ${context.workspace.primaryGoal.progress} (deadline: ${deadline})`)
    lines.push('')
  }

  // Active Goals
  lines.push('## Active Goals')
  lines.push(
    context.workspace.activeGoals.length > 0
      ? context.workspace.activeGoals
          .map((g) => `- ${g.name}: ${g.progress} (deadline: ${g.endDate.split('T')[0]})`)
          .join('\n')
      : '- No active goals'
  )
  lines.push('')

  // Companies
  if (context.workspace.companies.length > 0) {
    lines.push('## Companies')
    lines.push(
      context.workspace.companies
        .map((c) => `- ${c.name}${c.stage ? ` (${c.stage})` : ''}${c.revenue ? ` - Revenue: ${c.revenue}` : ''}`)
        .join('\n')
    )
    lines.push('')
  }

  // Active Objectives
  lines.push('## Active Objectives')
  lines.push(
    context.workspace.activeObjectives.length > 0
      ? context.workspace.activeObjectives
          .map(
            (obj) =>
              `- ${obj.title}${obj.company ? ` (${obj.company})` : ''}: ${obj.progressPercent}% complete (deadline: ${obj.deadline.split('T')[0]}) [${obj.status}]`
          )
          .join('\n')
      : '- No active objectives'
  )
  lines.push('')

  // Active Projects
  lines.push('## Active Projects')
  lines.push(
    context.workspace.activeProjects.length > 0
      ? context.workspace.activeProjects
          .slice(0, 10)
          .map(
            (p) =>
              `- ${p.name}${p.company ? ` (${p.company})` : ''}${p.deadline ? ` - deadline: ${p.deadline.split('T')[0]}` : ''}${p.priority ? ` [P${p.priority}]` : ''}`
          )
          .join('\n')
      : '- No active projects'
  )
  lines.push('')

  // Recent Tasks
  lines.push('## Active Tasks')
  lines.push(
    context.workspace.recentTasks.length > 0
      ? context.workspace.recentTasks
          .slice(0, 15)
          .map(
            (t) =>
              `- [P${t.priority}] ${t.title}${t.company ? ` (${t.company})` : ''} (${t.status})${t.dueAt ? ` - due ${t.dueAt.split('T')[0]}` : ''}`
          )
          .join('\n')
      : '- No active tasks'
  )
  lines.push('')

  // Blockers
  lines.push('## Blockers')
  lines.push(
    context.workspace.blockers.length > 0
      ? context.workspace.blockers
          .map((b) => `- [${b.severity}] ${b.title} (${b.objective})`)
          .join('\n')
      : '- No active blockers'
  )
  lines.push('')

  // Upcoming Deadlines
  lines.push('## Upcoming Deadlines (Next 14 Days)')
  lines.push(
    context.temporal.upcomingDeadlines.length > 0
      ? context.temporal.upcomingDeadlines
          .slice(0, 10)
          .map((d) => `- ${d.title} (${d.type}) - ${d.date.split('T')[0]}`)
          .join('\n')
      : '- No upcoming deadlines'
  )

  return lines.join('\n')
}


export async function buildContext(workspaceId: string, userId?: string) {
  const key = `${workspaceId}:${userId || 'anon'}`
  const cached = contextCache.get(key)
  if (cached && Date.now() < cached.expiresAt) return cached.result

  const result = await buildContextUncached(workspaceId, userId)
  contextCache.set(key, { result, expiresAt: Date.now() + CONTEXT_CACHE_TTL })
  return result
}
