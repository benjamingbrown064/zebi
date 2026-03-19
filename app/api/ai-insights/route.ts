import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/workspace'
import { validateAIAuth } from '@/lib/doug-auth'
import {
  getAIInsights,
  createAIInsight,
  AIInsightFilters,
  CreateAIInsightInput,
} from '@/app/actions/ai-insights'

/**
 * GET /api/ai-insights
 * List all AI insights with optional filters
 * Query params: companyId, insightType, status, priority, search
 */
export async function GET(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    let workspaceId: string

    if (auth.valid) {
      const wid = request.nextUrl.searchParams.get('workspaceId')
      if (!wid) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
      workspaceId = wid
    } else {
      workspaceId = await requireWorkspace()
    }

    const searchParams = request.nextUrl.searchParams

    const filters: AIInsightFilters = {
      companyId: searchParams.get('companyId') || undefined,
      insightType: searchParams.get('insightType') || undefined,
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority')
        ? parseInt(searchParams.get('priority')!)
        : undefined,
      search: searchParams.get('search') || undefined,
    }

    const insights = await getAIInsights(workspaceId, filters)
    return NextResponse.json(insights)
  } catch (error) {
    console.error('Error in GET /api/ai-insights:', error)
    return NextResponse.json({ error: 'Failed to fetch AI insights' }, { status: 500 })
  }
}

/**
 * POST /api/ai-insights
 * Create a new AI insight
 */
export async function POST(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    let workspaceId: string

    const body: CreateAIInsightInput & { workspaceId?: string } = await request.json()

    if (auth.valid) {
      if (!body.workspaceId) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
      workspaceId = body.workspaceId
    } else {
      workspaceId = await requireWorkspace()
    }

    if (!body.title || !body.summary || !body.insightType || !body.detailedAnalysis) {
      return NextResponse.json(
        { error: 'Missing required fields: title, summary, insightType, detailedAnalysis' },
        { status: 400 }
      )
    }

    if (body.priority === undefined || body.priority < 1 || body.priority > 4) {
      return NextResponse.json({ error: 'priority must be between 1 and 4' }, { status: 400 })
    }

    const insight = await createAIInsight(workspaceId, body)
    return NextResponse.json(insight, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/ai-insights:', error)
    return NextResponse.json({ error: 'Failed to create AI insight' }, { status: 500 })
  }
}
