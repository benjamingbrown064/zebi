import { NextResponse } from 'next/server'
import { getFilters } from '@/app/actions/filters'

export async function GET() {
  try {
    const workspaceId = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
    console.log(`[TEST_FILTERS] Calling getFilters for workspace ${workspaceId}`)
    
    const startTime = Date.now()
    const filters = await getFilters(workspaceId)
    const duration = Date.now() - startTime
    
    console.log(`[TEST_FILTERS] getFilters returned ${filters.length} filters in ${duration}ms`)
    
    return NextResponse.json({
      success: true,
      filterCount: filters.length,
      filters: filters,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[TEST_FILTERS] Error:', errorMsg)
    
    return NextResponse.json({
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
