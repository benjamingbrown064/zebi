import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'
import { validateAIAuth } from '@/lib/doug-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    const { searchParams } = request.nextUrl

    let workspaceId: string
    if (auth.valid) {
      const wid = searchParams.get('workspaceId')
      if (!wid) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
      workspaceId = wid
    } else {
      workspaceId = await requireWorkspace()
    }

    const companyId   = searchParams.get('companyId')
    const projectId   = searchParams.get('projectId')
    const objectiveId = searchParams.get('objectiveId')
    const taskId      = searchParams.get('taskId')
    const agentFilter = searchParams.get('agent')
    const limit       = Math.min(parseInt(searchParams.get('limit') || '100'), 200)

    const where: any = { workspaceId }

    if (companyId)   where.companyId   = companyId
    if (projectId)   where.projectId   = projectId
    if (objectiveId) where.objectiveId = objectiveId
    if (taskId)      where.taskId      = taskId
    if (agentFilter) where.aiAgent     = agentFilter

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        goal: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Activity fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    )
  }
}
