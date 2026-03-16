import { NextResponse } from 'next/server'
import { getStatuses } from '@/app/actions/statuses'

export async function GET() {
  try {
    const workspaceId = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
    console.log(`[TEST_STATUS] Calling getStatuses for workspace ${workspaceId}`)
    
    const startTime = Date.now()
    const statuses = await getStatuses(workspaceId)
    const duration = Date.now() - startTime
    
    console.log(`[TEST_STATUS] getStatuses returned ${statuses.length} statuses in ${duration}ms`)
    
    return NextResponse.json({
      success: true,
      statusCount: statuses.length,
      statuses: statuses,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[TEST_STATUS] Error:', errorMsg)
    
    return NextResponse.json({
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
