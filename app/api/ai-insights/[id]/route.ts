import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/workspace'
import {
  getAIInsight,
  updateAIInsight,
  deleteAIInsight,
  UpdateAIInsightInput,
} from '@/app/actions/ai-insights'


/**
 * GET /api/ai-insights/[id]
 * Get a single AI insight by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = await requireWorkspace()
    const insight = await getAIInsight(workspaceId, params.id)

    if (!insight) {
      return NextResponse.json(
        { error: 'AI insight not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(insight)
  } catch (error) {
    console.error('Error in GET /api/ai-insights/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI insight' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/ai-insights/[id]
 * Update an existing AI insight
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = await requireWorkspace()
    const body: UpdateAIInsightInput = await request.json()

    // Validate priority if provided
    if (
      body.priority !== undefined &&
      (body.priority < 1 || body.priority > 4)
    ) {
      return NextResponse.json(
        { error: 'priority must be between 1 and 4' },
        { status: 400 }
      )
    }

    const insight = await updateAIInsight(
      workspaceId,
      params.id,
      body
    )

    return NextResponse.json(insight)
  } catch (error) {
    console.error('Error in PUT /api/ai-insights/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to update AI insight' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ai-insights/[id]
 * Delete an AI insight
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = await requireWorkspace()
    await deleteAIInsight(workspaceId, params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/ai-insights/[id]:', error)
    return NextResponse.json(
      { error: 'Failed to delete AI insight' },
      { status: 500 }
    )
  }
}
