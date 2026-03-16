import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('[DB_TEST] Starting database test...')
    
    // Test 1: Simple count
    const taskCount = await prisma.task.count()
    console.log(`[DB_TEST] Total tasks in DB: ${taskCount}`)
    
    // Test 2: Query workspace
    const workspaceId = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    })
    console.log(`[DB_TEST] Workspace found: ${workspace?.name}`)
    
    // Test 3: Query tasks for workspace
    const tasks = await prisma.task.findMany({
      where: { workspaceId },
      select: {
        id: true,
        title: true,
        statusId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
    console.log(`[DB_TEST] Tasks in workspace: ${tasks.length}`)
    
    // Test 4: Query with relations
    const tasksWithRelations = await prisma.task.findMany({
      where: { workspaceId },
      include: {
        tags: {
          include: { tag: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })
    console.log(`[DB_TEST] Query with relations successful: ${tasksWithRelations.length} tasks`)
    
    return NextResponse.json({
      success: true,
      tests: {
        totalTasks: taskCount,
        workspaceFound: !!workspace,
        workspaceName: workspace?.name,
        tasksinWorkspace: tasks.length,
        tasksWithRelations: tasksWithRelations.length,
      },
      sampleTask: tasks[0] || null,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? (err.stack || '').split('\n').slice(0, 5).join('\n') : ''
    
    console.error('[DB_TEST] Error:', errorMsg)
    console.error('[DB_TEST] Stack:', stack)
    
    return NextResponse.json({
      success: false,
      error: errorMsg,
      stack: stack,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
