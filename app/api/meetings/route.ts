import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

const VALID_FLAGS    = ['blocker', 'risk', 'opportunity', 'dependency'] as const
const VALID_STATUSES = ['draft', 'open', 'contributing', 'concluded', 'archived'] as const
const VALID_AGENTS   = ['harvey', 'theo', 'doug', 'casper', 'ben'] as const

/**
 * GET /api/meetings?workspaceId=...&status=open&participant=harvey
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = request.nextUrl
    const status      = searchParams.get('status')      || undefined
    const participant = searchParams.get('participant') || undefined

    const where: any = { workspaceId }
    if (status) where.status = status
    if (participant) {
      where.OR = [
        { requiredParticipants: { has: participant } },
        { optionalParticipants: { has: participant } },
      ]
    }

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        contributions: {
          select: { id: true, author: true, role: true, position: true, confidence: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Compute pendingContributors at query time — never persisted
    const enriched = meetings.map(m => ({
      ...m,
      pendingContributors: m.requiredParticipants.filter(
        p => !m.contributions.some(c => c.author === p)
      ),
      contributionCount: m.contributions.length,
    }))

    return NextResponse.json({ success: true, count: enriched.length, meetings: enriched })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * POST /api/meetings
 * Create a meeting. Ben-initiated only in v1 (agents cannot create).
 *
 * Required: workspaceId, title, agenda, requiredParticipants, createdBy, createdByType
 */
export async function POST(request: NextRequest) {
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

    // Validate required fields
    const missing: string[] = []
    if (!body.title)                        missing.push('title')
    if (!body.agenda)                       missing.push('agenda')
    if (!body.requiredParticipants?.length) missing.push('requiredParticipants')
    if (!body.createdBy)                    missing.push('createdBy')
    if (!body.createdByType)                missing.push('createdByType')

    if (missing.length > 0) {
      return NextResponse.json({
        error: `Missing required fields: ${missing.join(', ')}`,
        required: {
          title:                'string',
          agenda:               'string — markdown, the question/context for the meeting',
          requiredParticipants: 'string[] — agents/ben who must contribute, e.g. ["harvey","doug","theo"]',
          createdBy:            'string — user UUID or agent name',
          createdByType:        '"user" | "agent"',
        },
        optional: {
          optionalParticipants: 'string[] — invited but non-blocking',
          requiredSkills:       'string[] — skill IDs agents should use',
          status:               'draft | open — default "draft"',
        },
      }, { status: 400 })
    }

    // Validate participant values
    const allParticipants = [
      ...(body.requiredParticipants ?? []),
      ...(body.optionalParticipants ?? []),
    ]
    const invalidParticipants = allParticipants.filter(p => !VALID_AGENTS.includes(p))
    if (invalidParticipants.length > 0) {
      return NextResponse.json({
        error: `Invalid participants: ${invalidParticipants.join(', ')}. Valid values: ${VALID_AGENTS.join(', ')}`,
      }, { status: 400 })
    }

    // Validate requiredSkills exist (if provided)
    if (body.requiredSkills?.length) {
      const skills = await prisma.skill.findMany({
        where: { id: { in: body.requiredSkills }, workspaceId },
        select: { id: true },
      })
      const foundIds = skills.map(s => s.id)
      const missing = body.requiredSkills.filter((id: string) => !foundIds.includes(id))
      if (missing.length > 0) {
        return NextResponse.json({ error: `Skill IDs not found: ${missing.join(', ')}` }, { status: 400 })
      }
    }

    const meeting = await prisma.meeting.create({
      data: {
        workspaceId,
        title:                body.title,
        agenda:               body.agenda,
        status:               body.status || 'draft',
        requiredParticipants: body.requiredParticipants,
        optionalParticipants: body.optionalParticipants || [],
        requiredSkills:       body.requiredSkills || [],
        createdBy:            body.createdBy,
        createdByType:        body.createdByType,
      },
      include: { contributions: true },
    })

    // Notify required participants via bus if meeting is opened immediately
    if (meeting.status === 'open') {
      await notifyParticipants(meeting, workspaceId)
    }

    return NextResponse.json({
      success: true,
      meeting: {
        ...meeting,
        pendingContributors: meeting.requiredParticipants,
      },
    }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export async function notifyParticipants(meeting: any, workspaceId: string) {
  for (const agent of meeting.requiredParticipants) {
    if (agent === 'ben') continue // Ben sees it in the UI
    try {
      await prisma.agentMessage.create({
        data: {
          workspaceId,
          threadId:      meeting.id,
          fromAgent:     'system',
          toAgent:       agent,
          subject:       `Meeting: ${meeting.title}`,
          body:          `You have been asked to contribute to a meeting.\n\nTitle: ${meeting.title}\n\nAgenda:\n${meeting.agenda}\n\nPlease read the full meeting and post your contribution using POST /api/meetings/${meeting.id}/contribute`,
          actionRequired: true,
        },
      })
    } catch (e) {
      console.error(`[meetings] Failed to notify ${agent}:`, e)
    }
  }
}
