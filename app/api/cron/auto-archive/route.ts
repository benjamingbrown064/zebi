import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

import { autoArchiveCompleted } from '@/app/actions/archive'

import { requireApiKey } from '@/lib/auth-api'


/**

// Force dynamic rendering
export const dynamic = 'force-dynamic'

 * Cron endpoint for auto-archiving completed tasks
 * Expected to be called daily at midnight UTC
 * 
 * Usage: POST /api/cron/auto-archive
 * Headers:
 *   - Authorization: Bearer <CRON_SECRET>
 * Optional query params:
 *   - workspaceId: specific workspace ID (if empty, processes all)
 */
export async function POST(request: NextRequest) {
  try {
    // Require API authentication
    const authError = requireApiKey(request);
    if (authError) return authError;

    // Check if we should process a specific workspace (moved to query param)
    const { searchParams } = new URL(request.url);
    const specificWorkspaceId = searchParams.get('workspaceId')

    let workspaceIds: string[]

    if (specificWorkspaceId) {
      workspaceIds = [specificWorkspaceId]
    } else {
      // Get all workspaces (retention logic moved to autoArchiveCompleted)
      const workspaces = await prisma.workspace.findMany({
        select: { id: true }
      })
      workspaceIds = workspaces.map(w => w.id)
    }

    console.log(`Starting auto-archive for ${workspaceIds.length} workspace(s)`)

    // Process each workspace
    const results: Record<string, number> = {}
    for (const workspaceId of workspaceIds) {
      const archivedCount = await autoArchiveCompleted(workspaceId)
      results[workspaceId] = archivedCount
    }

    const totalArchived = Object.values(results).reduce((sum, count) => sum + count, 0)
    console.log(`Auto-archive complete. Total archived: ${totalArchived}`)

    return NextResponse.json({
      success: true,
      workspacesProcessed: workspaceIds.length,
      results,
      totalArchived,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Auto-archive cron job failed:', errorMsg)

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for health check
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Auto-archive cron endpoint is healthy',
    documentation: 'POST to this endpoint to trigger auto-archive. Use x-cron-token header for auth.',
  })
}
