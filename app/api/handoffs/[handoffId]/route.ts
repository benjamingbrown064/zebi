import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'

/**
 * GET /api/handoffs/[handoffId]
 * Fetch a single handoff.
 *
 * PATCH /api/handoffs/[handoffId]
 * Update handoff status (accepted | done | rejected) or any mutable field.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { handoffId: string } }
) {
  try {
    const auth = validateAIAuth(request)
    let workspaceId: string
    if (auth.valid) {
      const wid = request.nextUrl.searchParams.get('workspaceId')
      if (!wid) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
      workspaceId = wid
    } else {
      workspaceId = await requireWorkspace()
    }

    const handoff = await prisma.handoff.findFirst({
      where: { id: params.handoffId, workspaceId },
    })

    if (!handoff) return NextResponse.json({ error: 'Handoff not found' }, { status: 404 })
    return NextResponse.json({ success: true, handoff })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { handoffId: string } }
) {
  try {
    const auth = validateAIAuth(request)
    const body = await request.json()

    let workspaceId: string
    if (auth.valid) {
      if (!body.workspaceId) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
      workspaceId = body.workspaceId
    } else {
      workspaceId = await requireWorkspace()
    }

    const existing = await prisma.handoff.findFirst({ where: { id: params.handoffId, workspaceId } })
    if (!existing) return NextResponse.json({ error: 'Handoff not found' }, { status: 404 })

    const VALID_STATUSES = ['pending', 'accepted', 'rejected', 'done']
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    const handoff = await prisma.handoff.update({
      where: { id: params.handoffId },
      data: {
        ...(body.status          !== undefined && { status: body.status }),
        ...(body.status === 'accepted'         && { acceptedAt: new Date() }),
        ...(body.summary         !== undefined && { summary: body.summary }),
        ...(body.requestedOutcome !== undefined && { requestedOutcome: body.requestedOutcome }),
        ...(body.completedWork   !== undefined && { completedWork: body.completedWork }),
        ...(body.remainingWork   !== undefined && { remainingWork: body.remainingWork }),
        ...(body.blockers        !== undefined && { blockers: body.blockers }),
        ...(body.filesChanged    !== undefined && { filesChanged: body.filesChanged }),
        ...(body.linkedDocIds    !== undefined && { linkedDocIds: body.linkedDocIds }),
        ...(body.decisionNeeded  !== undefined && { decisionNeeded: Boolean(body.decisionNeeded) }),
        ...(body.decisionSummary !== undefined && { decisionSummary: body.decisionSummary || null }),
      },
    })

    return NextResponse.json({ success: true, handoff })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
