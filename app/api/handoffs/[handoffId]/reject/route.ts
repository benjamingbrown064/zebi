import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/handoffs/[handoffId]/reject
 * 
 * Reject a pending handoff.
 * - Marks handoff status as "rejected"
 * - Optionally records rejection reason
 * - Notifies originating agent
 * 
 * Body:
 * - workspaceId: string (required)
 * - reason?: string (optional rejection reason)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { handoffId: string } }
) {
  try {
    const auth = validateAIAuth(request)
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const workspaceId = body.workspaceId
    const reason = body.reason || 'Not specified'

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    const agent = auth.assistant!

    // Check handoff exists and is pending
    const existing = await prisma.handoff.findFirst({
      where: {
        id: params.handoffId,
        workspaceId,
        toAgent: agent, // Only the target agent can reject
        status: 'pending',
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Handoff not found, not addressed to you, or not pending' },
        { status: 404 }
      )
    }

    // Reject the handoff
    const handoff = await prisma.handoff.update({
      where: { id: params.handoffId },
      data: {
        status: 'rejected',
        blockers: reason, // Store rejection reason in blockers field
      },
    })

    // Clear task handoff state if present
    if (handoff.taskId) {
      await prisma.task.update({
        where: { id: handoff.taskId },
        data: {
          handoffToAgent: null,
          waitingOn: handoff.fromAgent, // Return to originating agent
        },
      }).catch(() => {})
    }

    // Notify originating agent
    await prisma.agentMessage.create({
      data: {
        workspaceId,
        threadId: '', // will be set to own id
        fromAgent: agent,
        toAgent: handoff.fromAgent,
        subject: `Handoff rejected: ${handoff.summary}`,
        body: `${agent} has rejected the handoff.\n\nReason: ${reason}\n\nOriginal request: ${handoff.requestedOutcome}`,
        taskId: handoff.taskId,
        handoffId: handoff.id,
        companyId: handoff.companyId,
        projectId: handoff.projectId,
        actionRequired: true,
      },
    }).then(async (msg) => {
      await prisma.agentMessage.update({
        where: { id: msg.id },
        data: { threadId: msg.id },
      })
    }).catch(() => {})

    // Log rejection
    await prisma.activityLog.create({
      data: {
        workspaceId,
        eventType: 'handoff_rejected',
        eventPayload: {
          handoffId: handoff.id,
          fromAgent: handoff.fromAgent,
          toAgent: handoff.toAgent,
          taskId: handoff.taskId,
          reason,
        },
        createdBy: '00000000-0000-0000-0000-000000000000',
        aiAgent: agent,
        taskId: handoff.taskId,
        companyId: handoff.companyId,
        projectId: handoff.projectId,
      },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Handoff rejected',
      handoff,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API:handoffs/reject]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
