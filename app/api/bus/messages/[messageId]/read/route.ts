import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/bus/messages/[messageId]/read
 * Mark a message (or all messages in a thread) as read.
 *
 * Body:
 * {
 *   workspaceId: string
 *   threadId?:   string   — if provided, marks all messages in thread as read
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params
  const auth = validateAIAuth(request)
  const body = await request.json().catch(() => ({}))

  let workspaceId: string
  if (auth.valid) {
    if (!body.workspaceId) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    workspaceId = body.workspaceId
  } else {
    workspaceId = await requireWorkspace()
  }

  const now = new Date()

  if (body.threadId) {
    // Mark entire thread as read
    await prisma.agentMessage.updateMany({
      where: { workspaceId, threadId: body.threadId, readAt: null },
      data:  { readAt: now },
    })
    return NextResponse.json({ success: true, markedThread: body.threadId })
  }

  // Mark single message
  const message = await prisma.agentMessage.findFirst({ where: { id: messageId, workspaceId } })
  if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

  await prisma.agentMessage.update({ where: { id: messageId }, data: { readAt: now } })
  return NextResponse.json({ success: true, messageId })
}
