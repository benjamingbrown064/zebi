import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'

const DEFAULT_WORKSPACE = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'

function getWorkspaceId(req: NextRequest, body?: any): string {
  return (
    body?.workspaceId ||
    req.nextUrl.searchParams.get('workspaceId') ||
    DEFAULT_WORKSPACE
  )
}

// GET /api/agents — list all agents with live presence + stats
export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceId(request)

    const [agents, heartbeats, taskCounts] = await Promise.all([
      prisma.agent.findMany({
        where: { workspaceId },
        include: { knowledgeLinks: { orderBy: { order: 'asc' } } },
        orderBy: { name: 'asc' },
      }),
      prisma.agentHeartbeat.findMany({ where: { workspaceId } }),
      prisma.task.groupBy({
        by: ['ownerAgent'],
        where: { workspaceId, archivedAt: null, ownerAgent: { not: null } },
        _count: { id: true },
      }),
    ])

    const heartbeatMap: Record<string, any> = {}
    for (const hb of heartbeats) heartbeatMap[hb.agent] = hb

    const taskCountMap: Record<string, number> = {}
    for (const t of taskCounts) {
      if (t.ownerAgent) taskCountMap[t.ownerAgent] = t._count.id
    }

    const now = Date.now()
    const enriched = agents.map(agent => {
      const hb = heartbeatMap[agent.id]
      const msSince = hb ? now - new Date(hb.lastSeenAt).getTime() : null
      const presence =
        msSince === null ? 'offline'
        : msSince < 10 * 60 * 1000 ? 'active'
        : msSince < 60 * 60 * 1000 ? 'idle'
        : 'offline'
      return {
        ...agent,
        presence,
        lastSeenAt: hb?.lastSeenAt || null,
        openTasks: taskCountMap[agent.id] || 0,
      }
    })

    return NextResponse.json({ success: true, agents: enriched })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST /api/agents — create agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const workspaceId = getWorkspaceId(request, body)

    if (!body.id || !body.name) {
      return NextResponse.json({ success: false, error: 'id and name are required' }, { status: 400 })
    }

    const agent = await prisma.agent.create({
      data: {
        id: body.id,
        workspaceId,
        name: body.name,
        role: body.role || '',
        perspective: body.perspective || '',
        tagline: body.tagline || '',
        identity: body.identity || '',
        toneOfVoice: body.toneOfVoice || '',
        workingStyle: body.workingStyle || '',
        coreResponsibilities: body.coreResponsibilities || '',
        escalationRules: body.escalationRules || '',
        decisionScope: body.decisionScope || '',
        approvalBoundaries: body.approvalBoundaries || '',
        avatar: body.avatar || null,
        status: body.status || 'active',
      },
    })

    return NextResponse.json({ success: true, agent })
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Agent with this id already exists in workspace' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
