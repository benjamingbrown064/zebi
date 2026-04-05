/**
 * POST /api/agents/heartbeat
 *
 * Called by agents (Harvey, Theo, Doug, Casper) to report their current status.
 * Uses upsert — one row per agent per workspace, always current.
 *
 * Auth: Bearer token (same HARVEY_API_TOKEN / DOUG_API_TOKEN etc.)
 *
 * Body (all optional except workspaceId):
 * {
 *   workspaceId:      string   — required
 *   event:            "ping" | "task_start" | "task_complete" | "task_blocked" | "idle"
 *   currentTaskId:    string?  — task the agent is working on right now
 *   currentTaskTitle: string?  — human-readable task title
 *   metadata:         object?  — any extra context
 * }
 *
 * GET /api/agents/heartbeat?workspaceId=xxx
 * Returns all heartbeat rows for the workspace (for debugging / status panel)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAIAuth } from '@/lib/doug-auth'
import { prisma } from '@/lib/prisma'

const VALID_EVENTS = ['ping', 'task_start', 'task_complete', 'task_blocked', 'idle'] as const
type HeartbeatEvent = typeof VALID_EVENTS[number]

export async function POST(req: NextRequest) {
  // Auth
  const { valid, assistant } = validateAIAuth(req)
  if (!valid || !assistant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : null
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
  }

  const event: HeartbeatEvent = VALID_EVENTS.includes(body.event as HeartbeatEvent)
    ? (body.event as HeartbeatEvent)
    : 'ping'

  const currentTaskId    = typeof body.currentTaskId    === 'string' ? body.currentTaskId    : null
  const currentTaskTitle = typeof body.currentTaskTitle === 'string' ? body.currentTaskTitle : null
  const metadata         = body.metadata && typeof body.metadata === 'object' ? body.metadata : null

  try {
    const heartbeat = await prisma.agentHeartbeat.upsert({
      where: {
        workspaceId_agent: {
          workspaceId,
          agent: assistant,
        },
      },
      create: {
        workspaceId,
        agent: assistant,
        lastSeenAt: new Date(),
        event,
        currentTaskId,
        currentTaskTitle,
        metadata: metadata ?? undefined,
      },
      update: {
        lastSeenAt: new Date(),
        event,
        currentTaskId,
        currentTaskTitle,
        metadata: metadata ?? undefined,
      },
    })

    return NextResponse.json({ ok: true, agent: assistant, lastSeenAt: heartbeat.lastSeenAt })
  } catch (err) {
    console.error('[heartbeat] DB error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  // Auth — allow any valid agent token or just check workspaceId for now
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
  }

  try {
    const heartbeats = await prisma.agentHeartbeat.findMany({
      where: { workspaceId },
      orderBy: { lastSeenAt: 'desc' },
    })
    return NextResponse.json({ heartbeats })
  } catch (err) {
    console.error('[heartbeat] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
