import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const VALID_FLAGS = ['blocker', 'risk', 'opportunity', 'dependency'] as const
const EVIDENCE_TYPES = ['document', 'task', 'objective', 'memory', 'insight', 'url'] as const

/**
 * PATCH /api/meetings/[id]/contributions/[cid]
 * Edit own contribution — only while meeting is still contributing
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  try {
    const { id, cid } = await params
    const body = await request.json()

    const contribution = await prisma.meetingContribution.findUnique({ where: { id: cid } })
    if (!contribution || contribution.meetingId !== id) {
      return NextResponse.json({ error: 'Contribution not found' }, { status: 404 })
    }

    const meeting = await prisma.meeting.findUnique({ where: { id }, select: { status: true } })
    if (!meeting || meeting.status === 'concluded' || meeting.status === 'archived') {
      return NextResponse.json({ error: 'Cannot edit a contribution on a concluded or archived meeting' }, { status: 400 })
    }

    // Validate flags if provided
    if (body.flags?.length) {
      const invalid = body.flags.filter((f: string) => !VALID_FLAGS.includes(f as any))
      if (invalid.length > 0) {
        return NextResponse.json({ error: `Invalid flags: ${invalid.join(', ')}` }, { status: 400 })
      }
    }

    // Validate evidenceRefs if provided
    if (body.evidenceRefs?.length) {
      for (const ref of body.evidenceRefs) {
        if (!EVIDENCE_TYPES.includes(ref.type)) {
          return NextResponse.json({ error: `Invalid evidenceRef type: ${ref.type}` }, { status: 400 })
        }
        if (ref.type === 'url' && !ref.url) {
          return NextResponse.json({ error: 'evidenceRef of type "url" requires a url field' }, { status: 400 })
        }
        if (ref.type !== 'url' && !ref.id) {
          return NextResponse.json({ error: `evidenceRef of type "${ref.type}" requires an id field` }, { status: 400 })
        }
      }
    }

    const updated = await prisma.meetingContribution.update({
      where: { id: cid },
      data: {
        ...(body.position       !== undefined && { position:       body.position }),
        ...(body.reasoning      !== undefined && { reasoning:      body.reasoning }),
        ...(body.recommendation !== undefined && { recommendation: body.recommendation }),
        ...(body.confidence     !== undefined && { confidence:     body.confidence }),
        ...(body.flags          !== undefined && { flags:          body.flags }),
        ...(body.skillsUsed     !== undefined && { skillsUsed:     body.skillsUsed }),
        ...(body.evidenceRefs   !== undefined && { evidenceRefs:   body.evidenceRefs }),
      },
    })

    return NextResponse.json({ success: true, contribution: updated })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
