import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

/**
 * POST /api/handoffs/[handoffId]/accept
 * 
 * Accept a pending handoff.
 * - Marks handoff status as "accepted"
 * - Sets acceptedAt timestamp
 * - Returns full handoff details + context bundle
 * 
 * This is a convenience endpoint that wraps PATCH with status="accepted"
 * and includes context retrieval in one call.
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

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    const agent = auth.assistant!

    // Check handoff exists and is pending
    const existing = await prisma.handoff.findFirst({
      where: {
        id: params.handoffId,
        workspaceId,
        toAgent: agent, // Only the target agent can accept
        status: 'pending',
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Handoff not found, not addressed to you, or already accepted' },
        { status: 404 }
      )
    }

    // Accept the handoff
    const handoff = await prisma.handoff.update({
      where: { id: params.handoffId },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
    })

    // Update linked task if present
    if (handoff.taskId) {
      await prisma.task.update({
        where: { id: handoff.taskId },
        data: {
          ownerAgent: agent,
          waitingOn: null, // Clear waiting state
        },
      }).catch(() => {}) // Non-fatal if task update fails
    }

    // Mark any related messages as read
    await prisma.agentMessage.updateMany({
      where: {
        workspaceId,
        handoffId: params.handoffId,
        toAgent: agent,
        readAt: null,
      },
      data: { readAt: new Date() },
    }).catch(() => {})

    // Build context bundle (similar to /context endpoint)
    const contextBundle: any = {
      handoff,
      relatedTask: null,
      relatedMemories: [],
      relatedInsights: [],
      relatedDocs: [],
    }

    // Fetch related task
    if (handoff.taskId) {
      contextBundle.relatedTask = await prisma.task.findUnique({
        where: { id: handoff.taskId },
        include: {
          company: { select: { name: true } },
          project: { select: { name: true } },
          objective: { select: { id: true, title: true, deadline: true } },
        },
      })
    }

    // Fetch related AI memories
    if (handoff.companyId) {
      contextBundle.relatedMemories = await prisma.aIMemory.findMany({
        where: {
          workspaceId,
          companyId: handoff.companyId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          description: true,
          entryType: true,
          authorAgent: true,
          createdAt: true,
        },
      })
    }

    // Fetch related AI insights
    if (handoff.linkedDocIds && handoff.linkedDocIds.length > 0) {
      contextBundle.relatedInsights = await prisma.aIInsight.findMany({
        where: {
          workspaceId,
          id: { in: handoff.linkedDocIds },
        },
        select: {
          id: true,
          title: true,
          summary: true,
          insightType: true,
          priority: true,
          tags: true,
          detailedAnalysis: true,
          suggestedActions: true,
          createdAt: true,
        },
      })
    }

    // Log acceptance
    await prisma.activityLog.create({
      data: {
        workspaceId,
        eventType: 'handoff_accepted',
        eventPayload: {
          handoffId: handoff.id,
          fromAgent: handoff.fromAgent,
          toAgent: handoff.toAgent,
          taskId: handoff.taskId,
          summary: handoff.summary,
        },
        createdBy: '00000000-0000-0000-0000-000000000000',
        aiAgent: agent,
        taskId: handoff.taskId,
        companyId: handoff.companyId,
        projectId: handoff.projectId,
      },
    }).catch(() => {}) // Non-fatal

    return NextResponse.json({
      success: true,
      message: 'Handoff accepted',
      handoff,
      context: contextBundle,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[API:handoffs/accept]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
