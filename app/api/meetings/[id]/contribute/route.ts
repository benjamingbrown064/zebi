import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'

const VALID_FLAGS = ['blocker', 'risk', 'opportunity', 'dependency'] as const
const VALID_ROLES = [
  'strategic-commercial',
  'research-planning',
  'technical-systems',
  'ops-execution',
  'founder',
] as const
const EVIDENCE_TYPES = ['document', 'task', 'objective', 'memory', 'insight', 'url'] as const

/**
 * POST /api/meetings/[id]/contribute
 * Agent posts their structured contribution to a meeting.
 *
 * Required: author, role, position, reasoning, recommendation, confidence
 * Optional: flags, skillsUsed, evidenceRefs
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = validateAIAuth(request)
    const body = await request.json()

    // Fetch meeting
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: { contributions: { select: { author: true } } },
    })
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    if (!['open', 'contributing'].includes(meeting.status)) {
      return NextResponse.json({ error: `Cannot contribute to a meeting with status "${meeting.status}"` }, { status: 400 })
    }

    // Validate required fields
    const missing: string[] = []
    if (!body.author)         missing.push('author')
    if (!body.role)           missing.push('role')
    if (!body.position)       missing.push('position')
    if (!body.reasoning)      missing.push('reasoning')
    if (!body.recommendation) missing.push('recommendation')
    if (body.confidence === undefined) missing.push('confidence')

    if (missing.length > 0) {
      return NextResponse.json({
        error: `Missing required fields: ${missing.join(', ')}`,
        required: {
          author:         '"harvey" | "theo" | "doug" | "casper" | "ben"',
          role:           VALID_ROLES.join(' | '),
          position:       'string — 1–2 sentence headline stance',
          reasoning:      'string — full explanation',
          recommendation: 'string — what should happen',
          confidence:     'number 1–5',
        },
        optional: {
          flags:        `string[] — allowed: ${VALID_FLAGS.join(', ')}`,
          skillsUsed:   'string[] — skill IDs used to inform this contribution',
          evidenceRefs: '[{ type, id?, url?, label? }]',
        },
      }, { status: 400 })
    }

    // Validate role
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: `Invalid role. Valid: ${VALID_ROLES.join(', ')}` }, { status: 400 })
    }

    // Validate confidence range
    if (body.confidence < 1 || body.confidence > 5) {
      return NextResponse.json({ error: 'confidence must be 1–5' }, { status: 400 })
    }

    // Validate flags — allowlist only
    if (body.flags?.length) {
      const invalid = body.flags.filter((f: string) => !VALID_FLAGS.includes(f as any))
      if (invalid.length > 0) {
        return NextResponse.json({
          error: `Invalid flags: ${invalid.join(', ')}. Allowed: ${VALID_FLAGS.join(', ')}`,
        }, { status: 400 })
      }
    }

    // Validate evidenceRefs shape
    if (body.evidenceRefs?.length) {
      for (const ref of body.evidenceRefs) {
        if (!ref.type || !EVIDENCE_TYPES.includes(ref.type)) {
          return NextResponse.json({
            error: `Invalid evidenceRef type "${ref.type}". Valid: ${EVIDENCE_TYPES.join(', ')}`,
          }, { status: 400 })
        }
        if (ref.type === 'url' && !ref.url) {
          return NextResponse.json({ error: 'evidenceRef of type "url" requires a url field' }, { status: 400 })
        }
        if (ref.type !== 'url' && !ref.id) {
          return NextResponse.json({ error: `evidenceRef of type "${ref.type}" requires an id field` }, { status: 400 })
        }
      }
    }

    // Validate skillsUsed exist in workspace
    if (body.skillsUsed?.length) {
      const skills = await prisma.skill.findMany({
        where: { id: { in: body.skillsUsed }, workspaceId: meeting.workspaceId },
        select: { id: true },
      })
      const foundIds = skills.map(s => s.id)
      const notFound = body.skillsUsed.filter((sid: string) => !foundIds.includes(sid))
      if (notFound.length > 0) {
        return NextResponse.json({ error: `Skill IDs not found in workspace: ${notFound.join(', ')}` }, { status: 400 })
      }
    }

    // Check author is a participant
    const allParticipants = [...meeting.requiredParticipants, ...meeting.optionalParticipants]
    if (!allParticipants.includes(body.author)) {
      return NextResponse.json({ error: `"${body.author}" is not a participant in this meeting` }, { status: 400 })
    }

    // Check for duplicate contribution from this author
    if (meeting.contributions.some(c => c.author === body.author)) {
      return NextResponse.json({
        error: `${body.author} has already contributed. Use PATCH /api/meetings/${id}/contributions/[cid] to edit.`,
      }, { status: 409 })
    }

    const contribution = await prisma.meetingContribution.create({
      data: {
        meetingId:      id,
        author:         body.author,
        role:           body.role,
        position:       body.position,
        reasoning:      body.reasoning,
        recommendation: body.recommendation,
        confidence:     body.confidence,
        flags:          body.flags       || [],
        skillsUsed:     body.skillsUsed  || [],
        evidenceRefs:   body.evidenceRefs || [],
      },
    })

    // Advance status to 'contributing' on first contribution
    if (meeting.status === 'open') {
      await prisma.meeting.update({ where: { id }, data: { status: 'contributing' } })
    }

    // Check if all required contributors have now responded
    const allContributed = meeting.requiredParticipants.every(
      p => p === body.author || meeting.contributions.some(c => c.author === p)
    )

    return NextResponse.json({
      success: true,
      contribution,
      allContributed,
      message: allContributed
        ? 'All required contributors have responded. Ben can now write the conclusion.'
        : undefined,
    }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
