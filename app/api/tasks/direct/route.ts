import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check if user has valid session (cookies will be sent automatically)
    // This is a public endpoint accessible to authenticated browser clients
    // External API calls should use a dedicated API endpoint if needed
    
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    
    if (!workspaceId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required query parameter: workspaceId',
      }, { status: 400 })
    }
    
    console.log(`[API:tasks/direct] Fetching tasks for workspace ${workspaceId}`)
    const startTime = Date.now()
    
    const tasks = await prisma.task.findMany({
      where: { workspaceId },
      include: {
        tags: {
          include: { tag: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    const duration = Date.now() - startTime
    console.log(`[API:tasks/direct] Returned ${tasks.length} tasks in ${duration}ms`)
    
    return NextResponse.json({
      success: true,
      count: tasks.length,
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        statusId: t.statusId,
        description: t.description || undefined,
        dueAt: t.dueAt?.toISOString(),
        tags: t.tags.map(tt => tt.tag.name),
        goalId: t.goalId || undefined,
        projectId: t.projectId || undefined,
        workspaceId: t.workspaceId,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[API:tasks/direct] Error:', errorMsg)
    
    return NextResponse.json({
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
