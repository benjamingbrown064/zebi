import { NextResponse } from 'next/server'
import { getTasks } from '@/app/actions/tasks'

export async function GET() {
  try {
    const workspaceId = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
    console.log(`[DEBUG] Testing getTasks for workspace ${workspaceId}`)
    
    const tasks = await getTasks(workspaceId)
    
    console.log(`[DEBUG] getTasks returned ${tasks.length} tasks`)
    
    return NextResponse.json({
      success: true,
      taskCount: tasks.length,
      tasks: tasks.slice(0, 3), // First 3 for brevity
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[DEBUG] Test failed:', errorMsg)
    
    return NextResponse.json({
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
