import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

/**
 * GET /api/bus/threads
 *
 * Returns thread summaries — one row per thread, showing the opening message
 * subject, latest message preview, unread count, participants, and context links.
 *
 * Query params:
 *   workspaceId   required
 *   toAgent       filter threads involving this recipient
 *   fromAgent     filter threads from this agent
 *   taskId        threads linked to a specific task
 *   unreadOnly    "true" — only threads with unread messages
 *   limit         default 50
 */
export async function GET(request: NextRequest) {
  const auth = validateAIAuth(request)
  const { searchParams } = request.nextUrl

  let workspaceId: string
  if (auth.valid) {
    const wid = searchParams.get('workspaceId')
    if (!wid) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    workspaceId = wid
  } else {
    workspaceId = await requireWorkspace()
  }

  const toAgentFilter   = searchParams.get('toAgent')    || undefined
  const fromAgentFilter = searchParams.get('fromAgent')  || undefined
  const taskIdFilter    = searchParams.get('taskId')     || undefined
  const unreadOnly      = searchParams.get('unreadOnly') === 'true'
  const limit           = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

  // Get all messages in scope
  const where: any = { workspaceId }
  if (toAgentFilter)   where.toAgent   = toAgentFilter
  if (fromAgentFilter) where.fromAgent = fromAgentFilter
  if (taskIdFilter)    where.taskId    = taskIdFilter

  const messages = await prisma.agentMessage.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  })

  // Group into threads
  const threadMap = new Map<string, {
    threadId:      string
    subject:       string | null
    openedBy:      string
    participants:  Set<string>
    messages:      typeof messages
    unreadCount:   number
    latestAt:      Date
    taskId:        string | null
    handoffId:     string | null
    companyId:     string | null
    projectId:     string | null
    actionRequired: boolean
  }>()

  for (const msg of messages) {
    if (!threadMap.has(msg.threadId)) {
      threadMap.set(msg.threadId, {
        threadId:      msg.threadId,
        subject:       msg.subject,
        openedBy:      msg.fromAgent,
        participants:  new Set(),
        messages:      [],
        unreadCount:   0,
        latestAt:      msg.createdAt,
        taskId:        msg.taskId,
        handoffId:     msg.handoffId,
        companyId:     msg.companyId,
        projectId:     msg.projectId,
        actionRequired: msg.actionRequired,
      })
    }
    const thread = threadMap.get(msg.threadId)!
    thread.messages.push(msg)
    thread.participants.add(msg.fromAgent)
    thread.participants.add(msg.toAgent)
    if (!msg.readAt) thread.unreadCount++
    if (msg.createdAt > thread.latestAt) thread.latestAt = msg.createdAt
    if (msg.actionRequired) thread.actionRequired = true
    // Prefer first non-null subject
    if (!thread.subject && msg.subject) thread.subject = msg.subject
  }

  // Enrich with task titles
  const taskIds = [...new Set([...threadMap.values()].map(t => t.taskId).filter(Boolean))] as string[]
  const tasks   = taskIds.length > 0
    ? await prisma.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, title: true } })
    : []
  const taskMap = Object.fromEntries(tasks.map(t => [t.id, t.title]))

  // Build response
  let threads = [...threadMap.values()]
    .filter(t => !unreadOnly || t.unreadCount > 0)
    .sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime())
    .slice(0, limit)
    .map(t => {
      const latest = t.messages[t.messages.length - 1]
      const opening = t.messages[0]
      return {
        threadId:       t.threadId,
        subject:        t.subject ?? opening.body.slice(0, 80),
        openedBy:       t.openedBy,
        participants:   [...t.participants].filter(p => p !== 'all'),
        messageCount:   t.messages.length,
        unreadCount:    t.unreadCount,
        actionRequired: t.actionRequired,
        latestAt:       t.latestAt.toISOString(),
        latestPreview:  latest.body.slice(0, 120),
        latestFrom:     latest.fromAgent,
        taskId:         t.taskId,
        taskTitle:      t.taskId ? (taskMap[t.taskId] ?? null) : null,
        handoffId:      t.handoffId,
        companyId:      t.companyId,
        projectId:      t.projectId,
      }
    })

  return NextResponse.json({ success: true, count: threads.length, threads })
}
