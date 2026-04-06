import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
const STALE_HOURS = 48

/**
 * GET /api/cron/stale-tasks
 *
 * Vercel cron — runs once daily at 09:00 UTC.
 * Finds tasks that are in-progress (completedAt null, ownerAgent set)
 * but haven't been updated in STALE_HOURS. For each:
 * 1. Sends a bus message to the owning agent: "Your task is stale — update or flag blocked"
 * 2. Sends Ben a bus message listing all stale tasks
 * 3. Logs to ActivityLog
 */
function verifyCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true
  const legacy = request.headers.get('x-cron-secret')
  return legacy === secret
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceId = request.nextUrl.searchParams.get('workspaceId') ?? DEFAULT_WORKSPACE_ID
  const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000)

  // Find in-progress tasks with ownerAgent set, not completed, not archived,
  // not explicitly blocked (blockedReason already set — agent knows), not waiting on ben
  const staleTasks = await prisma.task.findMany({
    where: {
      workspaceId,
      completedAt: null,
      archivedAt:  null,
      NOT:  { ownerAgent: null },
      blockedReason: null,          // already blocked tasks don't need stale alert
      waitingOn: { notIn: ['ben', 'external'] },
      updatedAt: { lt: cutoff },
    },
    orderBy: [{ priority: 'asc' }, { updatedAt: 'asc' }],
    take: 30,
    select: {
      id: true, title: true, priority: true,
      ownerAgent: true, taskType: true,
      updatedAt: true, nextAction: true,
      company: { select: { name: true } },
    },
  })

  if (staleTasks.length === 0) {
    return NextResponse.json({ success: true, staleCount: 0, message: 'No stale tasks' })
  }

  const now   = new Date()
  const results: { taskId: string; agent: string; notified: boolean }[] = []

  // Group by agent
  const byAgent = new Map<string, typeof staleTasks>()
  for (const t of staleTasks) {
    const agent = t.ownerAgent!
    if (!byAgent.has(agent)) byAgent.set(agent, [])
    byAgent.get(agent)!.push(t)
  }

  // Notify each agent
  for (const [agent, tasks] of byAgent) {
    const taskLines = tasks.map(t => {
      const hoursStale = Math.round((now.getTime() - new Date(t.updatedAt).getTime()) / 3600000)
      const space = t.company?.name ? ` [${t.company.name}]` : ''
      return `• "${t.title}"${space} — no update in ${hoursStale}h${t.nextAction ? `\n  Next action: ${t.nextAction}` : ''}`
    }).join('\n')

    const msg = await prisma.agentMessage.create({
      data: {
        workspaceId,
        threadId:      '',
        fromAgent:     'system',
        toAgent:       agent,
        subject:       `${tasks.length} stale task${tasks.length > 1 ? 's' : ''} need your attention`,
        body:          `The following task${tasks.length > 1 ? 's have' : ' has'} had no update for ${STALE_HOURS}+ hours:\n\n${taskLines}\n\nFor each task, please either:\n- Update it with progress (PATCH completionNote or nextAction)\n- Mark it blocked (blockedReason + waitingOn)\n- Mark it done if complete\n\nIf you need Ben's input, set decisionNeeded: true.`,
        actionRequired: true,
      },
    })
    await prisma.agentMessage.update({ where: { id: msg.id }, data: { threadId: msg.id } })

    // Log to activity
    await prisma.activityLog.create({
      data: {
        workspaceId,
        eventType:    'agent_message',
        eventPayload: {
          messageId:      msg.id,
          threadId:       msg.id,
          fromAgent:      'system',
          toAgent:        agent,
          subject:        msg.subject,
          bodyPreview:    msg.body.slice(0, 200),
          actionRequired: true,
          staleTaskCount: tasks.length,
          staleCronRun:   true,
        },
        createdBy: '00000000-0000-0000-0000-000000000000',
        aiAgent:   'system',
      },
    }).catch(() => {})

    for (const t of tasks) results.push({ taskId: t.id, agent, notified: true })
  }

  // Notify Ben with full summary
  const agentSummary = [...byAgent.entries()].map(([agent, tasks]) =>
    `${agent.charAt(0).toUpperCase() + agent.slice(1)}: ${tasks.length} stale task${tasks.length > 1 ? 's' : ''}`
  ).join('\n')

  const allTaskLines = staleTasks.map(t => {
    const hoursStale = Math.round((now.getTime() - new Date(t.updatedAt).getTime()) / 3600000)
    const space = t.company?.name ? ` · ${t.company.name}` : ''
    return `• [${t.ownerAgent}] "${t.title}"${space} — ${hoursStale}h stale`
  }).join('\n')

  const benMsg = await prisma.agentMessage.create({
    data: {
      workspaceId,
      threadId:      '',
      fromAgent:     'system',
      toAgent:       'ben',
      subject:       `${staleTasks.length} stale task${staleTasks.length > 1 ? 's' : ''} across your agents`,
      body:          `Daily stale task report — tasks with no update in ${STALE_HOURS}+ hours:\n\n${agentSummary}\n\n${allTaskLines}\n\nAgents have been notified. If tasks remain stale tomorrow, consider reassigning or descoping them.`,
      actionRequired: false,
    },
  })
  await prisma.agentMessage.update({ where: { id: benMsg.id }, data: { threadId: benMsg.id } })

  return NextResponse.json({
    success:    true,
    staleCount: staleTasks.length,
    byAgent:    Object.fromEntries([...byAgent.entries()].map(([a, t]) => [a, t.length])),
    results,
    timestamp:  now.toISOString(),
  })
}
