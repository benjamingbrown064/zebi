/**
 * GET  /api/tasks/:taskId/comments  — list all comments on a task
 * POST /api/tasks/:taskId/comments  — create a comment (bot or human)
 *
 * Auth: session cookie (human) or Bearer token (bot via relay).
 * Bot identity is resolved from the X-Actor-Agent header injected by /api/relay.
 * Body fields:
 *   { content: string, workspaceId: string, authorAgent?: string, authorType?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000'

const COMMENT_SELECT = {
  id:          true,
  taskId:      true,
  workspaceId: true,
  createdBy:   true,
  authorAgent: true,
  authorType:  true,
  bodyRich:    true,
  createdAt:   true,
  updatedAt:   true,
} as const

function shapeComment(c: any) {
  return {
    id:          c.id,
    taskId:      c.taskId,
    workspaceId: c.workspaceId,
    createdBy:   c.createdBy,
    authorAgent: c.authorAgent ?? null,
    authorType:  c.authorType ?? 'user',
    body:        typeof c.bodyRich === 'object' && c.bodyRich !== null && 'text' in c.bodyRich
                   ? String((c.bodyRich as { text: string }).text)
                   : '',
    createdAt:   c.createdAt,
    updatedAt:   c.updatedAt,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const auth = validateAIAuth(request)
    let workspaceId: string

    if (auth.valid) {
      const wid = request.nextUrl.searchParams.get('workspaceId')
      if (!wid) return NextResponse.json({ success: false, error: 'workspaceId is required' }, { status: 400 })
      workspaceId = wid
    } else {
      workspaceId = await requireWorkspace()
    }

    // Verify task belongs to workspace
    const task = await prisma.task.findFirst({ where: { id: params.taskId, workspaceId } })
    if (!task) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })

    const comments = await prisma.taskComment.findMany({
      where:   { taskId: params.taskId, workspaceId },
      select:  COMMENT_SELECT,
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ success: true, comments: comments.map(shapeComment) })
  } catch (err) {
    console.error('GET /api/tasks/[taskId]/comments error:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch comments' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const auth = validateAIAuth(request)
    let workspaceId: string

    const body = await request.json()

    if (auth.valid) {
      if (!body.workspaceId) return NextResponse.json({ success: false, error: 'workspaceId is required' }, { status: 400 })
      workspaceId = body.workspaceId
    } else {
      workspaceId = await requireWorkspace()
    }

    const content: string = body.content || body.body || ''
    if (!content.trim()) {
      return NextResponse.json({ success: false, error: 'content is required', code: 'MISSING_CONTENT', field: 'content' }, { status: 400 })
    }

    // Verify task belongs to workspace
    const task = await prisma.task.findFirst({ where: { id: params.taskId, workspaceId } })
    if (!task) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })

    // Resolve bot identity: relay injects X-Actor-Agent; body fields are fallback
    const actorAgent = request.headers.get('x-actor-agent') || body.authorAgent || null
    const actorType  = body.authorType || (actorAgent ? 'agent' : 'user')

    const comment = await prisma.taskComment.create({
      data: {
        taskId:      params.taskId,
        workspaceId,
        createdBy:   body.createdBy || DEFAULT_USER_ID,
        bodyRich:    { text: content },
        authorAgent: actorAgent,
        authorType:  actorType,
      },
      select: COMMENT_SELECT,
    })

    return NextResponse.json({ success: true, comment: shapeComment(comment) }, { status: 201 })
  } catch (err) {
    console.error('POST /api/tasks/[taskId]/comments error:', err)
    return NextResponse.json({ success: false, error: 'Failed to create comment' }, { status: 500 })
  }
}
