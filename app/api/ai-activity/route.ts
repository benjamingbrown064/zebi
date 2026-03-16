import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering (uses request.url)
export const dynamic = 'force-dynamic'

/**
 * GET /api/ai-activity
 * Fetch AI activity (suggestions/alerts) for a workspace
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const type = searchParams.get('type')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    // Build where clause
    const where: any = {
      workspaceId,
      // Include all statuses for activity feed
      status: { in: ['pending', 'implemented', 'dismissed'] },
    }

    // Filter by type if specified
    if (type && type !== 'all') {
      where.type = type
    }

    // Fetch activities from ai_suggestions table
    const activities = await prisma.aISuggestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        reasoning: true,
        actions: true,
        confidence: true,
        status: true,
        context: true,
        createdAt: true,
      },
    })

    // Transform to activity format
    const formattedActivities = activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      reasoning: activity.reasoning,
      actions: activity.actions as any[],
      confidence: activity.confidence,
      status: activity.status,
      context: activity.context as any,
      createdAt: activity.createdAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      count: formattedActivities.length,
      activities: formattedActivities,
    })
  } catch (error) {
    console.error('Failed to fetch AI activity:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch AI activity',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
