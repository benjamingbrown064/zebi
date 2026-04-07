import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { notifyParticipants } from '@/lib/meetings-notify'

/**
 * GET  /api/meetings/[id]   — full meeting + contributions
 * PATCH /api/meetings/[id]  — update status, write conclusion
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        contributions: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

    const pendingContributors = meeting.requiredParticipants.filter(
      p => !meeting.contributions.some(c => c.author === p)
    )

    return NextResponse.json({
      success: true,
      meeting: { ...meeting, pendingContributors },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.meeting.findUnique({
      where: { id },
      include: { contributions: { select: { author: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

    const data: any = {}

    // Status transitions
    if (body.status) {
      const VALID = ['draft', 'open', 'contributing', 'concluded', 'archived']
      if (!VALID.includes(body.status)) {
        return NextResponse.json({ error: `Invalid status. Valid: ${VALID.join(', ')}` }, { status: 400 })
      }
      data.status = body.status
    }

    // Conclusion — structured shape enforced
    if (body.conclusion !== undefined) {
      const c = body.conclusion
      if (!c.decision || !c.rationale) {
        return NextResponse.json({
          error: 'conclusion requires: decision (string), rationale (string)',
          shape: {
            decision:        'string — the final decision',
            rationale:       'string — why this decision was made',
            resultingActions:'[{ title, assignTo, dueDate? }] — optional',
            owners:          'string[] — optional',
            reviewDate:      'string ISO date — optional',
          },
        }, { status: 400 })
      }
      data.conclusion = {
        decision:         c.decision,
        rationale:        c.rationale,
        resultingActions: c.resultingActions || [],
        owners:           c.owners           || [],
        reviewDate:       c.reviewDate        || null,
      }
      // Auto-conclude if conclusion written
      if (!body.status) data.status = 'concluded'
      data.concludedBy     = body.concludedBy     || null
      data.concludedByType = body.concludedByType || null
      data.concludedAt     = new Date()
    }

    // Agenda / title updates (draft only)
    if (body.title  && existing.status === 'draft') data.title  = body.title
    if (body.agenda && existing.status === 'draft') data.agenda = body.agenda

    const meeting = await prisma.meeting.update({
      where: { id },
      data,
      include: { contributions: { orderBy: { createdAt: 'asc' } } },
    })

    // If just opened, notify participants
    if (body.status === 'open' && existing.status !== 'open') {
      await notifyParticipants(meeting, meeting.workspaceId)
    }

    const pendingContributors = meeting.requiredParticipants.filter(
      p => !meeting.contributions.some(c => c.author === p)
    )

    return NextResponse.json({ success: true, meeting: { ...meeting, pendingContributors } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
