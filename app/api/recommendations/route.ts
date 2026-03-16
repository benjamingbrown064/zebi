import { NextRequest, NextResponse } from 'next/server'
import { RecommendationEngine } from '@/lib/ai/recommendation-engine'
import { prisma } from '@/lib/prisma'

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
const USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

export async function GET(request: NextRequest) {
  try {
    // Check for cached recommendations (less than 4 hours old)
    const cached = await prisma.aISuggestion.findMany({
      where: {
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
        status: 'pending',
        createdAt: {
          gt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (cached.length > 0) {
      return NextResponse.json({
        recommendations: cached.map((s) => ({
          id: s.id,
          type: s.type,
          priority: s.confidence > 80 ? 'high' : s.confidence > 60 ? 'medium' : 'low',
          title: s.title,
          description: s.description,
          reasoning: s.reasoning,
          actions: s.actions,
          confidence: s.confidence,
        })),
        cached: true,
      })
    }

    // Generate fresh recommendations
    const engine = new RecommendationEngine()
    const recommendations = await engine.generateDailyRecommendations(
      WORKSPACE_ID,
      USER_ID
    )

    return NextResponse.json({
      recommendations,
      cached: false,
    })
  } catch (error) {
    console.error('Failed to generate recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}
