import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

const VALID_AGENTS = ['harvey', 'theo', 'doug', 'casper', 'ben', 'system', 'all']

/**
 * POST /api/bus/messages
 *
 * Send a new message or reply to an existing thread.
 *
 * Body:
 * {
 *   workspaceId:    string
 *   toAgent:        "harvey"|"theo"|"doug"|"casper"|"ben"|"all"
 *   body:           string           — the message content
 *   subject?:       string           — only on new threads
 *   threadId?:      string           — omit to start a new thread
 *   taskId?:        string
 *   handoffId?:     string
 *   companyId?:     string
 *   projectId?:     string
 *   actionRequired?: boolean
 *   actionDeadline?: string          — ISO date
 * }
 */
export async function POST(request: NextRequest) {
  const auth = validateAIAuth(request)
  const body = await request.json()

  let workspaceId: string
  if (auth.valid) {
    if (!body.workspaceId) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    workspaceId = body.workspaceId
  } else {
    workspaceId = await requireWorkspace()
  }

  const fromAgent = auth.assistant ?? body.fromAgent ?? 'system'
  const { toAgent, subject, threadId, taskId, handoffId, companyId, projectId, actionRequired, actionDeadline } = body
  const messageBody = body.body

  if (!messageBody?.trim()) return NextResponse.json({ error: 'body is required' }, { status: 400 })
  if (!toAgent || !VALID_AGENTS.includes(toAgent)) {
    return NextResponse.json({ error: `toAgent must be one of: ${VALID_AGENTS.join(', ')}` }, { status: 400 })
  }

  // If replying to a thread, validate it exists
  if (threadId) {
    const thread = await prisma.agentMessage.findFirst({
      where: { workspaceId, threadId },
    })
    if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  // Create the message — threadId is its own id for new threads
  const message = await prisma.agentMessage.create({
    data: {
      workspaceId,
      threadId:       threadId ?? '',       // will be updated below for new threads
      fromAgent,
      toAgent,
      subject:        threadId ? null : (subject ?? null),
      body:           messageBody.trim(),
      taskId:         taskId    ?? null,
      handoffId:      handoffId ?? null,
      companyId:      companyId ?? null,
      projectId:      projectId ?? null,
      actionRequired: Boolean(actionRequired),
      actionDeadline: actionDeadline ? new Date(actionDeadline) : null,
    },
  })

  // For new threads, set threadId = message id
  const finalMessage = threadId ? message : await prisma.agentMessage.update({
    where: { id: message.id },
    data:  { threadId: message.id },
  })

  // Log to ActivityLog for the audit trail
  await prisma.activityLog.create({
    data: {
      workspaceId,
      eventType:    'agent_message',
      eventPayload: {
        messageId:      finalMessage.id,
        threadId:       finalMessage.threadId,
        fromAgent,
        toAgent,
        subject:        finalMessage.subject,
        bodyPreview:    messageBody.slice(0, 200),
        isReply:        Boolean(threadId),
        actionRequired: Boolean(actionRequired),
        taskId:         taskId ?? null,
        handoffId:      handoffId ?? null,
      },
      createdBy:  '00000000-0000-0000-0000-000000000000',
      aiAgent:    fromAgent,
      companyId:  companyId ?? null,
      projectId:  projectId ?? null,
      taskId:     taskId    ?? null,
    },
  }).catch(() => { /* never block on activity log */ })

  return NextResponse.json({ success: true, message: finalMessage }, { status: 201 })
}

/**
 * GET /api/bus/messages
 *
 * Query params:
 *   workspaceId  required
 *   toAgent      filter by recipient
 *   fromAgent    filter by sender
 *   threadId     get full thread
 *   taskId       all messages on a task
 *   unread       "true" — only unread messages
 *   limit        default 100
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

  const toAgent   = searchParams.get('toAgent')   || undefined
  const fromAgent = searchParams.get('fromAgent') || undefined
  const threadId  = searchParams.get('threadId')  || undefined
  const taskId    = searchParams.get('taskId')     || undefined
  const unread    = searchParams.get('unread') === 'true'
  const limit     = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

  const where: any = { workspaceId }
  if (toAgent)   where.toAgent   = toAgent
  if (fromAgent) where.fromAgent = fromAgent
  if (threadId)  where.threadId  = threadId
  if (taskId)    where.taskId    = taskId
  if (unread)    where.readAt    = null

  const messages = await prisma.agentMessage.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    take:    limit,
  })

  // Enrich with task titles where linked
  const taskIds = [...new Set(messages.map(m => m.taskId).filter(Boolean))] as string[]
  const tasks   = taskIds.length > 0
    ? await prisma.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, title: true } })
    : []
  const taskMap = Object.fromEntries(tasks.map(t => [t.id, t.title]))

  const enriched = messages.map(m => ({
    ...m,
    taskTitle: m.taskId ? (taskMap[m.taskId] ?? null) : null,
  }))

  return NextResponse.json({ success: true, count: enriched.length, messages: enriched })
}
