import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const AGENTS = ['harvey', 'theo', 'doug', 'casper'] as const
type Agent = typeof AGENTS[number]

const AGENT_ROLES: Record<Agent, string> = {
  harvey: 'Strategic & Commercial',
  theo:   'Research & Planning',
  doug:   'Technical & Systems',
  casper: 'Ops & Execution',
}

/**
 * GET /api/cron/daily-wraps
 * Called at midnight UTC by Vercel cron (or OpenClaw cron).
 * For each agent, pulls today's task activity and writes a daily wrap AIMemory.
 * Also accepts ?agent=harvey to trigger a single agent wrap manually.
 */
export async function GET(request: NextRequest) {
  // Allow both Vercel cron (CRON_SECRET) and agent token
  const authHeader = request.headers.get('authorization') ?? ''
  const cronSecret  = process.env.CRON_SECRET
  const isVercel    = request.headers.get('x-vercel-cron') === '1'
  const isInternal  = cronSecret && authHeader === `Bearer ${cronSecret}`
  const isAgent     = [
    process.env.DOUG_API_TOKEN,
    process.env.HARVEY_API_TOKEN,
    process.env.THEO_API_TOKEN,
    process.env.CASPER_API_TOKEN,
  ].includes(authHeader.replace('Bearer ', ''))

  if (!isVercel && !isInternal && !isAgent && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const singleAgent = request.nextUrl.searchParams.get('agent') as Agent | null
  const agentsToProcess = singleAgent ? [singleAgent] : [...AGENTS]

  // Get today's date string
  const today     = new Date()
  const dateStr   = today.toISOString().split('T')[0] // "YYYY-MM-DD"
  const dayStart  = new Date(dateStr + 'T00:00:00.000Z')
  const dayEnd    = new Date(dateStr + 'T23:59:59.999Z')

  // Get all workspaces
  const workspaces = await prisma.workspace.findMany({ select: { id: true, name: true } })

  const results: any[] = []

  for (const workspaceId of workspaces.map(w => w.id)) {
    for (const agent of agentsToProcess) {
      try {
        // Skip if wrap already exists for today
        const existing = await prisma.aIMemory.findFirst({
          where: {
            workspaceId,
            authorAgent: agent,
            entryType:   'daily_wrap',
            date:        dateStr,
          },
        })
        if (existing) {
          results.push({ agent, workspaceId, status: 'skipped', reason: 'already exists' })
          continue
        }

        // Pull today's task activity for this agent
        const completedTasks = await prisma.task.findMany({
          where: {
            workspaceId,
            ownerAgent: agent,
            completedAt: { gte: dayStart, lte: dayEnd },
          },
          select: { id: true, title: true, completedAt: true, completionNote: true },
        })

        const inProgressTasks = await prisma.task.findMany({
          where: {
            workspaceId,
            ownerAgent: agent,
            completedAt: null,
            archivedAt:  null,
            updatedAt:   { gte: dayStart },
          },
          select: { id: true, title: true, priority: true, blockedReason: true, waitingOn: true },
          take: 10,
        })

        const blockedTasks = inProgressTasks.filter(t => t.blockedReason)
        const activeTasks  = inProgressTasks.filter(t => !t.blockedReason)

        // Pull today's handoffs sent/received
        const handoffsSent = await prisma.handoff.findMany({
          where: { workspaceId, fromAgent: agent, createdAt: { gte: dayStart } },
          select: { id: true, toAgent: true, summary: true },
        })
        const handoffsReceived = await prisma.handoff.findMany({
          where: { workspaceId, toAgent: agent, createdAt: { gte: dayStart } },
          select: { id: true, fromAgent: true, summary: true },
        })

        // Pull today's other memory entries (progress notes etc.) to include in wrap
        const todayEntries = await prisma.aIMemory.findMany({
          where: {
            workspaceId,
            authorAgent: agent,
            date: dateStr,
            entryType: { not: 'daily_wrap' },
          },
          select: { title: true, entryType: true },
        })

        const completed: string[] = [
          ...completedTasks.map(t => t.completionNote ? `${t.title} — ${t.completionNote}` : t.title),
        ]

        const pending: string[] = activeTasks.map(t => t.title)

        const blockers: string[] = blockedTasks.map(t =>
          `${t.title}${t.blockedReason ? ` — ${t.blockedReason}` : ''}${t.waitingOn && t.waitingOn !== 'none' ? ` (waiting on ${t.waitingOn})` : ''}`
        )

        const handoffNotes: string[] = [
          ...handoffsSent.map(h => `Handed off to ${h.toAgent}: ${h.summary}`),
          ...handoffsReceived.map(h => `Received from ${h.fromAgent}: ${h.summary}`),
        ]

        const hasActivity = completed.length > 0 || pending.length > 0 || todayEntries.length > 0

        const description = [
          `Daily wrap for ${agent} (${AGENT_ROLES[agent as Agent]}) — ${dateStr}`,
          '',
          completed.length > 0 ? `Completed: ${completed.length} task(s)` : 'No tasks completed today.',
          pending.length > 0   ? `In progress: ${pending.length} task(s)` : '',
          blockers.length > 0  ? `Blocked: ${blockers.length} item(s)` : '',
          handoffNotes.length > 0 ? `Handoffs: ${handoffNotes.length}` : '',
          todayEntries.length > 0 ? `Other entries logged today: ${todayEntries.map(e => e.title).join(', ')}` : '',
        ].filter(Boolean).join('\n')

        const tags = [
          'daily-wrap',
          agent,
          ...(completed.length > 0     ? ['completed'] : []),
          ...(blockers.length > 0      ? ['blockers']  : []),
          ...(handoffNotes.length > 0  ? ['handoffs']  : []),
        ]

        const wrap = await prisma.aIMemory.create({
          data: {
            workspaceId,
            memoryType:     'summary',
            entryType:      'daily_wrap',
            authorAgent:    agent,
            authorType:     'agent',
            createdBy:      agent,
            date:           dateStr,
            title:          `${agent.charAt(0).toUpperCase() + agent.slice(1)} — Daily Wrap ${dateStr}`,
            description,
            confidenceScore: 8,
            tags,
            completed:      completed   as any,
            pending:        pending     as any,
            blockers:       blockers    as any,
            decisions:      []          as any,
            tomorrowFirst:  pending.slice(0, 3) as any, // top 3 pending = tomorrow's first priorities
          },
        })

        results.push({ agent, workspaceId, status: 'created', memoryId: wrap.id, hasActivity })
      } catch (err) {
        results.push({ agent, workspaceId, status: 'error', error: err instanceof Error ? err.message : String(err) })
      }
    }
  }

  return NextResponse.json({ success: true, date: dateStr, results })
}
