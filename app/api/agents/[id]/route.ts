import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_WORKSPACE = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'

function getWorkspaceId(req: NextRequest, body?: any): string {
  return (
    body?.workspaceId ||
    req.nextUrl.searchParams.get('workspaceId') ||
    DEFAULT_WORKSPACE
  )
}

// GET /api/agents/[id] — full agent profile + live stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const workspaceId = getWorkspaceId(request)
    const now = Date.now()

    const [agent, heartbeat, tasks, handoffs, memories, insights] = await Promise.all([
      prisma.agent.findUnique({
        where: { workspaceId_id: { workspaceId, id } },
        include: {
          knowledgeLinks: {
            orderBy: { order: 'asc' },
            include: {
              skill: { select: { id: true, title: true, category: true, skillType: true, description: true } },
              document: { select: { id: true, title: true, documentType: true } },
            }
          }
        },
      }),
      prisma.agentHeartbeat.findUnique({ where: { workspaceId_agent: { workspaceId, agent: id } } }),
      prisma.task.findMany({
        where: { workspaceId, ownerAgent: id, archivedAt: null },
        include: { status: true, project: { select: { id: true, name: true } } },
        orderBy: [{ completedAt: 'asc' }, { priority: 'asc' }],
        take: 100,
      }),
      prisma.handoff.findMany({
        where: {
          workspaceId,
          OR: [{ fromAgent: id }, { toAgent: id }],
          status: { in: ['pending', 'accepted'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.aIMemory.findMany({
        where: { workspaceId, authorAgent: id },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      prisma.aIInsight.findMany({
        where: { workspaceId, createdBy: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    if (!agent) {
      return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })
    }

    const msSince = heartbeat ? now - new Date(heartbeat.lastSeenAt).getTime() : null
    const presence =
      msSince === null ? 'offline'
      : msSince < 10 * 60 * 1000 ? 'active'
      : msSince < 60 * 60 * 1000 ? 'idle'
      : 'offline'

    // Task stats
    const openTasks = tasks.filter((t: any) => !t.completedAt)
    const blockedTasks = openTasks.filter((t: any) => t.blockedReason)
    const decisionTasks = openTasks.filter((t: any) => t.decisionNeeded)
    const waitingOnBen = openTasks.filter((t: any) => t.waitingOn === 'ben')
    const doneTasks = tasks.filter((t: any) => t.completedAt)

    return NextResponse.json({
      success: true,
      agent: {
        ...agent,
        presence,
        lastSeenAt: heartbeat?.lastSeenAt || null,
        currentTaskId: heartbeat?.currentTaskId || null,
        currentTaskTitle: heartbeat?.currentTaskTitle || null,
        stats: {
          openTasks: openTasks.length,
          blockedTasks: blockedTasks.length,
          decisionTasks: decisionTasks.length,
          waitingOnBen: waitingOnBen.length,
          doneTasks: doneTasks.length,
          totalHandoffs: handoffs.length,
        },
        tasks,
        handoffs,
        memories,
        insights,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// PATCH /api/agents/[id] — update profile fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const workspaceId = getWorkspaceId(request, body)

    const existing = await prisma.agent.findUnique({
      where: { workspaceId_id: { workspaceId, id } },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })
    }

    const profileFields = [
      'name','role','perspective','tagline','identity','toneOfVoice',
      'workingStyle','coreResponsibilities','escalationRules',
      'decisionScope','approvalBoundaries','avatar','status',
    ]

    const updateData: any = {}
    for (const field of profileFields) {
      if (body[field] !== undefined) updateData[field] = body[field]
    }

    // Bump profileVersion if any content field changed
    const contentFields = ['identity','toneOfVoice','workingStyle','coreResponsibilities','escalationRules','decisionScope','approvalBoundaries','role','tagline']
    const hasContentChange = contentFields.some(f => updateData[f] !== undefined)
    if (hasContentChange) updateData.profileVersion = existing.profileVersion + 1

    const agent = await prisma.agent.update({
      where: { workspaceId_id: { workspaceId, id } },
      data: updateData,
      include: { knowledgeLinks: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json({ success: true, agent })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
