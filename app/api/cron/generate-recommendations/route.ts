import { NextRequest, NextResponse } from 'next/server'

import { RecommendationEngine } from '@/lib/ai/recommendation-engine'
import { prisma } from '@/lib/prisma'

import { requireApiKey } from '@/lib/auth-api'



// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Generate recommendations cron job
 * Processes all workspaces or a specific workspace if provided
 */
export async function POST(request: NextRequest) {
  try {
    // Require API authentication
    const authError = requireApiKey(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    // If specific workspace requested, process only that one
    if (workspaceId) {
      return await processWorkspace(workspaceId)
    }

    // Otherwise, process all workspaces
    return await processAllWorkspaces()
  } catch (error) {
    console.error('Failed to generate recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}

/**
 * Process a single workspace
 */
async function processWorkspace(workspaceId: string) {
  // Get workspace owner
  const owner = await prisma.workspaceMember.findFirst({
    where: { workspaceId, role: 'owner' },
  })

  if (!owner) {
    return NextResponse.json(
      { error: 'No owner found for workspace' },
      { status: 404 }
    )
  }

  const engine = new RecommendationEngine()
  const recommendations = await engine.generateDailyRecommendations(
    workspaceId,
    owner.userId
  )

  return NextResponse.json({
    success: true,
    workspaceId,
    count: recommendations.length,
    recommendations,
  })
}

/**
 * Process all active workspaces
 */
async function processAllWorkspaces() {
  // Get all workspaces with at least one owner
  const workspaces = await prisma.workspace.findMany({
    include: {
      members: {
        where: { role: 'owner' },
        take: 1,
      },
    },
  })

  const engine = new RecommendationEngine()
  const results = []

  for (const workspace of workspaces) {
    if (workspace.members.length === 0) {
      console.warn(`Workspace ${workspace.id} has no owner, skipping`)
      continue
    }

    const owner = workspace.members[0]

    try {
      const recommendations = await engine.generateDailyRecommendations(
        workspace.id,
        owner.userId
      )

      results.push({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        recommendationsGenerated: recommendations.length,
      })
    } catch (error) {
      console.error(`Failed to generate recommendations for workspace ${workspace.id}:`, error)
      results.push({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    workspacesProcessed: results.length,
    totalRecommendations: results.reduce((sum, r) => sum + (r.recommendationsGenerated || 0), 0),
    results,
  })
}
