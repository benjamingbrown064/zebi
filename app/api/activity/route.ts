import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const projectId = searchParams.get('projectId')
    const objectiveId = searchParams.get('objectiveId')
    const taskId = searchParams.get('taskId')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get user's workspaces
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: { userId: user.id },
        },
      },
      select: { id: true },
    })

    const workspaceIds = workspaces.map((w) => w.id)

    if (workspaceIds.length === 0) {
      return NextResponse.json({ logs: [] })
    }

    const where: any = {
      workspaceId: { in: workspaceIds },
    }

    if (companyId) where.companyId = companyId
    if (projectId) where.projectId = projectId
    if (objectiveId) where.objectiveId = objectiveId
    if (taskId) where.taskId = taskId

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
