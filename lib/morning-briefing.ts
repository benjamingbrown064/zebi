/**
 * Morning Briefing Generator — Multi-Agent Edition
 *
 * Generates a founder-facing morning brief using real agent/task data:
 * - Decisions needed (tasks with decisionNeeded=true)
 * - Agent workloads (Harvey / Theo / Doug / Casper)
 * - Pending handoffs
 * - Waiting on Ben
 * - Blocked tasks
 * - Top priorities
 * - Yesterday's completions
 */

import { prisma } from './prisma'

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
const AGENTS = ['harvey', 'theo', 'doug', 'casper'] as const

export interface MorningBriefingData {
  date: string
  generatedAt: string
  workspace: { id: string; name: string }

  topPriorities: Array<{
    id: string
    title: string
    priority: number
    ownerAgent: string | null
    spaceName: string | null
    taskType: string | null
  }>

  decisionInbox: Array<{
    id: string
    title: string
    ownerAgent: string | null
    decisionSummary: string | null
    spaceName: string | null
  }>

  waitingOnBen: Array<{
    id: string
    title: string
    ownerAgent: string | null
    nextAction: string | null
    spaceName: string | null
  }>

  agentWorkloads: Array<{
    agent: string
    totalActive: number
    blocked: number
    decisionNeeded: number
    waitingOnBen: number
  }>

  blockedTasks: Array<{
    id: string
    title: string
    ownerAgent: string | null
    blockedReason: string | null
    spaceName: string | null
  }>

  pendingHandoffs: Array<{
    id: string
    fromAgent: string
    toAgent: string
    summary: string
    createdAt: string
  }>

  recentCompletions: Array<{
    id: string
    title: string
    ownerAgent: string | null
    completionNote: string | null
    spaceName: string | null
  }>

  workflowHealth: {
    totalActiveTasks: number
    ownerCoveragePercent: number
    openDecisions: number
    waitingOnBenCount: number
    pendingHandoffCount: number
    blockedCount: number
  }
}

/**
 * Generate morning briefing for a workspace
 */
export async function generateMorningBriefing(
  workspaceId: string = DEFAULT_WORKSPACE_ID
): Promise<MorningBriefingData> {
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  })
  if (!workspace) throw new Error(`Workspace ${workspaceId} not found`)

  const [
    topPriorityTasks,
    allActiveTasks,
    blockedTasks,
    decisionTasks,
    waitingOnBenTasks,
    recentCompletions,
    pendingHandoffs,
  ] = await Promise.all([
    // Top 5 priorities
    prisma.task.findMany({
      where: { workspaceId, archivedAt: null, completedAt: null },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      take: 5,
      select: {
        id: true, title: true, priority: true, taskType: true,
        ownerAgent: true,
        company: { select: { name: true } },
      },
    }),

    // All active (for workload calc)
    prisma.task.findMany({
      where: { workspaceId, archivedAt: null, completedAt: null },
      select: {
        id: true, ownerAgent: true, blockedReason: true,
        waitingOn: true, decisionNeeded: true, priority: true,
      },
    }),

    // Blocked tasks
    prisma.task.findMany({
      where: {
        workspaceId, archivedAt: null, completedAt: null,
        NOT: { blockedReason: null },
      },
      orderBy: { priority: 'asc' },
      take: 10,
      select: {
        id: true, title: true, ownerAgent: true, blockedReason: true,
        company: { select: { name: true } },
      },
    }),

    // Decisions inbox
    prisma.task.findMany({
      where: { workspaceId, archivedAt: null, completedAt: null, decisionNeeded: true },
      orderBy: { priority: 'asc' },
      take: 10,
      select: {
        id: true, title: true, ownerAgent: true, decisionSummary: true,
        company: { select: { name: true } },
      },
    }),

    // Waiting on Ben
    prisma.task.findMany({
      where: { workspaceId, archivedAt: null, completedAt: null, waitingOn: 'ben' },
      orderBy: { priority: 'asc' },
      take: 10,
      select: {
        id: true, title: true, ownerAgent: true, nextAction: true,
        company: { select: { name: true } },
      },
    }),

    // Completed last 24h
    prisma.task.findMany({
      where: { workspaceId, completedAt: { gte: last24h } },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: {
        id: true, title: true, ownerAgent: true, completionNote: true,
        company: { select: { name: true } },
      },
    }),

    // Pending handoffs
    prisma.handoff.findMany({
      where: { workspaceId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, fromAgent: true, toAgent: true, summary: true, createdAt: true,
      },
    }),
  ])

  // Agent workloads
  const agentWorkloads = AGENTS.map(agent => {
    const agentTasks = allActiveTasks.filter(t => t.ownerAgent === agent)
    return {
      agent,
      totalActive: agentTasks.length,
      blocked: agentTasks.filter(t => t.blockedReason).length,
      decisionNeeded: agentTasks.filter(t => t.decisionNeeded).length,
      waitingOnBen: agentTasks.filter(t => t.waitingOn === 'ben').length,
    }
  })

  const totalActiveTasks = allActiveTasks.length
  const tasksWithOwner = allActiveTasks.filter(t => t.ownerAgent).length
  const ownerCoveragePercent = totalActiveTasks > 0
    ? Math.round((tasksWithOwner / totalActiveTasks) * 100)
    : 100

  return {
    date: now.toISOString().split('T')[0],
    generatedAt: now.toISOString(),
    workspace: { id: workspace.id, name: workspace.name },

    topPriorities: topPriorityTasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      ownerAgent: t.ownerAgent,
      spaceName: t.company?.name ?? null,
      taskType: t.taskType,
    })),

    decisionInbox: decisionTasks.map(t => ({
      id: t.id,
      title: t.title,
      ownerAgent: t.ownerAgent,
      decisionSummary: t.decisionSummary,
      spaceName: t.company?.name ?? null,
    })),

    waitingOnBen: waitingOnBenTasks.map(t => ({
      id: t.id,
      title: t.title,
      ownerAgent: t.ownerAgent,
      nextAction: t.nextAction,
      spaceName: t.company?.name ?? null,
    })),

    agentWorkloads,

    blockedTasks: blockedTasks.map(t => ({
      id: t.id,
      title: t.title,
      ownerAgent: t.ownerAgent,
      blockedReason: t.blockedReason,
      spaceName: t.company?.name ?? null,
    })),

    pendingHandoffs: pendingHandoffs.map(h => ({
      id: h.id,
      fromAgent: h.fromAgent,
      toAgent: h.toAgent,
      summary: h.summary,
      createdAt: h.createdAt.toISOString(),
    })),

    recentCompletions: recentCompletions.map(t => ({
      id: t.id,
      title: t.title,
      ownerAgent: t.ownerAgent,
      completionNote: t.completionNote,
      spaceName: t.company?.name ?? null,
    })),

    workflowHealth: {
      totalActiveTasks,
      ownerCoveragePercent,
      openDecisions: decisionTasks.length,
      waitingOnBenCount: waitingOnBenTasks.length,
      pendingHandoffCount: pendingHandoffs.length,
      blockedCount: blockedTasks.length,
    },
  }
}

/**
 * Format morning briefing as clean Telegram text (plain, not MarkdownV2 — simpler and safer)
 */
export function formatMorningBriefing(briefing: MorningBriefingData): string {
  const lines: string[] = []
  const date = new Date(briefing.date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  lines.push(`🌅 Morning Brief — ${date}`)
  lines.push('')

  // Decisions first — most important
  if (briefing.decisionInbox.length > 0) {
    lines.push(`🔴 DECISIONS NEEDED (${briefing.decisionInbox.length})`)
    for (const t of briefing.decisionInbox) {
      const agent = t.ownerAgent ? ` [${t.ownerAgent}]` : ''
      const space = t.spaceName ? ` · ${t.spaceName}` : ''
      lines.push(`  • ${t.title}${agent}${space}`)
      if (t.decisionSummary) lines.push(`    → ${t.decisionSummary}`)
    }
    lines.push('')
  }

  // Waiting on Ben
  if (briefing.waitingOnBen.length > 0) {
    lines.push(`⏳ WAITING ON YOU (${briefing.waitingOnBen.length})`)
    for (const t of briefing.waitingOnBen) {
      const agent = t.ownerAgent ? ` [${t.ownerAgent}]` : ''
      lines.push(`  • ${t.title}${agent}`)
      if (t.nextAction) lines.push(`    → ${t.nextAction}`)
    }
    lines.push('')
  }

  // Agent workloads
  const activeAgents = briefing.agentWorkloads.filter(a => a.totalActive > 0)
  if (activeAgents.length > 0) {
    lines.push('🤖 AGENT STATUS')
    for (const a of briefing.agentWorkloads) {
      if (a.totalActive === 0) continue
      const flags: string[] = []
      if (a.blocked > 0) flags.push(`${a.blocked} blocked`)
      if (a.decisionNeeded > 0) flags.push(`${a.decisionNeeded} decisions`)
      if (a.waitingOnBen > 0) flags.push(`${a.waitingOnBen} waiting on you`)
      const flagStr = flags.length > 0 ? ` — ${flags.join(', ')}` : ''
      lines.push(`  ${a.agent.charAt(0).toUpperCase() + a.agent.slice(1)}: ${a.totalActive} tasks${flagStr}`)
    }
    lines.push('')
  }

  // Pending handoffs
  if (briefing.pendingHandoffs.length > 0) {
    lines.push(`🔄 PENDING HANDOFFS (${briefing.pendingHandoffs.length})`)
    for (const h of briefing.pendingHandoffs) {
      lines.push(`  • ${h.fromAgent} → ${h.toAgent}: ${h.summary}`)
    }
    lines.push('')
  }

  // Blocked
  if (briefing.blockedTasks.length > 0) {
    lines.push(`🚫 BLOCKED (${briefing.blockedTasks.length})`)
    for (const t of briefing.blockedTasks.slice(0, 5)) {
      const agent = t.ownerAgent ? ` [${t.ownerAgent}]` : ''
      lines.push(`  • ${t.title}${agent}`)
      if (t.blockedReason) lines.push(`    → ${t.blockedReason}`)
    }
    lines.push('')
  }

  // Top priorities
  if (briefing.topPriorities.length > 0) {
    lines.push('📋 TOP PRIORITIES')
    for (const t of briefing.topPriorities) {
      const agent = t.ownerAgent ? ` [${t.ownerAgent}]` : ' [unassigned]'
      const space = t.spaceName ? ` · ${t.spaceName}` : ''
      lines.push(`  • ${t.title}${agent}${space}`)
    }
    lines.push('')
  }

  // Yesterday
  if (briefing.recentCompletions.length > 0) {
    lines.push(`✅ COMPLETED YESTERDAY (${briefing.recentCompletions.length})`)
    for (const t of briefing.recentCompletions.slice(0, 5)) {
      const agent = t.ownerAgent ? ` [${t.ownerAgent}]` : ''
      lines.push(`  • ${t.title}${agent}`)
    }
    lines.push('')
  }

  // Health footer
  const h = briefing.workflowHealth
  lines.push(`📊 ${h.totalActiveTasks} active tasks · ${h.ownerCoveragePercent}% assigned · zebi.app/founder`)

  return lines.join('\n')
}

/**
 * Store briefing as ActivityLog entry
 */
export async function storeBriefing(
  workspaceId: string,
  briefingText: string,
  briefingData: MorningBriefingData
) {
  await prisma.activityLog.create({
    data: {
      workspaceId,
      eventType: 'morning_briefing',
      eventPayload: JSON.parse(JSON.stringify({
        text: briefingText,
        data: briefingData,
        generatedAt: briefingData.generatedAt,
      })),
      createdBy: '00000000-0000-0000-0000-000000000000',
      aiAgent: 'morning-briefing',
    },
  })
}

// Keep old export name as alias for any existing callers
export const formatMorningBriefingForTelegram = formatMorningBriefing
