import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
    
    console.log(`[API:filters] Fetching for workspace ${workspaceId}`)
    const startTime = Date.now()
    
    const filters = await prisma.savedFilter.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' }
    })

    const duration = Date.now() - startTime
    console.log(`[API:filters] Returned ${filters.length} filters in ${duration}ms`)

    return NextResponse.json({
      success: true,
      filters: filters.map((f) => ({
        id: f.id,
        workspaceId: f.workspaceId,
        name: f.name,
        definition: (f.definition as Record<string, unknown>) || {},
        defaultView: (f.defaultView as 'list' | 'board') || 'list',
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[API:filters] Error:', errorMsg)
    
    return NextResponse.json({
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
