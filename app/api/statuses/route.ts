import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const DEFAULT_STATUSES = [
  { name: 'Inbox', type: 'inbox', sortOrder: 0 },
  { name: 'Planned', type: 'planned', sortOrder: 1 },
  { name: 'Doing', type: 'doing', sortOrder: 2 },
  { name: 'Blocked', type: 'blocked', sortOrder: 3 },
  { name: 'Done', type: 'done', sortOrder: 4 },
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
    
    console.log(`[API:statuses] Fetching for workspace ${workspaceId}`)
    const startTime = Date.now()
    
    let statuses = await prisma.status.findMany({
      where: { workspaceId },
      orderBy: { sortOrder: 'asc' }
    })

    // If no statuses exist, create defaults
    if (statuses.length === 0) {
      console.log(`[API:statuses] Creating default statuses`)
      await prisma.status.createMany({
        data: DEFAULT_STATUSES.map(s => ({
          workspaceId,
          name: s.name,
          type: s.type,
          sortOrder: s.sortOrder,
          isSystem: true,
        }))
      })

      statuses = await prisma.status.findMany({
        where: { workspaceId },
        orderBy: { sortOrder: 'asc' }
      })
    }

    const duration = Date.now() - startTime
    console.log(`[API:statuses] Returned ${statuses.length} statuses in ${duration}ms`)

    return NextResponse.json({
      success: true,
      statuses: statuses.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        isSystem: s.isSystem,
        sortOrder: s.sortOrder,
      })),
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[API:statuses] Error:', errorMsg)
    
    return NextResponse.json({
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
