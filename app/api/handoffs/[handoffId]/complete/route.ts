import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/handoffs/[handoffId]/complete
 * 
 * Mark an accepted handoff as complete.
 * - Marks handoff status as "done"
 * - Records completion note and output
 * - Notifies originating agent
 * - Updates linked task if provided
 * 
 * Body:
 * - workspaceId: string (required)
 * - completionNote: string (optional)
 * - outputUrl?: string (optional link to deliverable)
 * - markTaskDone?: boolean (if true, also marks linked task as complete)
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
    const completionNote = body.completionNote || 'Work completed'
    const outputUrl = body.outputUrl
    const markTaskDone = body.markTaskDone || false

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    const agent = auth.assistant!

    // Check handoff exists and is accepted
    const existing = await prisma.handoff.findFirst({
      where: {
        id: params.handoffId,
        workspaceId,
        toAgent: agent, // Only the assigned agent can complete
        status: 'accepted',
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Handoff not found, not assigned to you, or not in accepted state' },
        { status: 404 }
      )
    }

    // Mark handoff as done
    const handoff = await prisma.handoff.update({
      where: { id: params.handoffId },
      data: {
        status: 'done',
        completedWork: existing.completedWork + `\n\nCompleted by ${agent}: ${completionNote}`,
      },
    })

    // Update linked task if present and requested
    if (handoff.taskId && markTaskDone) {
      await prisma.task.update({
        where: { id: handoff.taskId },
        data: {
          completedAt: new Date(),
          completionNote,
          ...(outputUrl && { outputUrl }),
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
        subject: `Handoff complete: ${handoff.summary}`,
        body: `${agent} has completed the handoff.\n\nOutcome: ${handoff.requestedOutcome}\n\nResult: ${completionNote}${outputUrl ? `\n\nOutput: ${outputUrl}` : ''}`,
        taskId: handoff.taskId,
        handoffId: handoff.id,
        companyId: handoff.companyId,
        projectId: handoff.projectId,
        actionRequired: false,
      },
    }).then(async (msg) => {
      await prisma.agentMessage.update({
        where: { id: msg.id },
        data: { threadId: msg.id },
      })
    }).catch(() => {})

    // Log completion
    await prisma.activityLog.create({
      data: {
        workspaceId,
        eventType: 'handoff_completed',
        eventPayload: {
          handoffId: handoff.id,
          fromAgent: handoff.fromAgent,
          toAgent: handoff.toAgent,
          taskId: handoff.taskId,
          completionNote,
          outputUrl,
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
      message: 'Handoff marked as complete',
      handoff,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API:handoffs/complete]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
