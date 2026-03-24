import { NextRequest, NextResponse } from 'next/server'
import { requireDougAuth } from '@/lib/doug-auth'
import { getDougWorkspaceId } from '@/lib/doug-workspace'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/doug/my-tasks
 * 
 * Get tasks assigned to Doug (via assigneeId or botAssignee="doug")
 * 
 * Query params:
 * - bot: Specify which bot ("doug" or "harvey") - defaults to "doug"
 */
export async function GET(request: NextRequest) {
  const authError = requireDougAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const bot = searchParams.get('bot') || 'doug'
    
    // Resolve workspace from Doug API context
    const workspaceId = await getDougWorkspaceId()

    // Get tasks assigned to the specified bot
    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
        botAssignee: bot, // "doug" or "harvey"
        completedAt: null,
        archivedAt: null,
      },
      include: {
        status: { select: { name: true, type: true } },
        objective: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: [
        { priority: 'asc' },
        { dueAt: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status?.name,
        statusType: t.status?.type,
        priority: t.priority,
        dueAt: t.dueAt?.toISOString(),
        objective: t.objective?.title,
        project: t.project?.name,
        space: t.company?.name,
        botAssignee: t.botAssignee,
        createdAt: t.createdAt.toISOString(),
        aiGenerated: t.aiGenerated,
      })),
      total: tasks.length,
      assignedTo: bot,
    })
  } catch (error) {
    console.error('[Doug API] Failed to get my tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Doug tasks' },
      { status: 500 }
    )
  }
}
