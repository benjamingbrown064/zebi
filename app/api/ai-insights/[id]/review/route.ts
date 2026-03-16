import { NextRequest, NextResponse } from 'next/server'
import { reviewAIInsight } from '@/app/actions/ai-insights'
import { requireWorkspace } from '@/lib/workspace'

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

/**
 * POST /api/ai-insights/[id]/review
 * Mark an AI insight as reviewed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = await requireWorkspace()
    const insight = await reviewAIInsight(
      workspaceId,
      params.id,
      PLACEHOLDER_USER_ID
    )

    return NextResponse.json(insight)
  } catch (error) {
    console.error('Error in POST /api/ai-insights/[id]/review:', error)
    return NextResponse.json(
      { error: 'Failed to review AI insight' },
      { status: 500 }
    )
  }
}
