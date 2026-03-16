import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/workspace'
import {
  getAIMemories,
  createAIMemory,
  AIMemoryFilters,
  CreateAIMemoryInput,
} from '@/app/actions/ai-memory'

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

/**
 * GET /api/ai-memory
 * List all AI memories with optional filters
 * Query params: companyId, projectId, memoryType, search, minConfidence
 */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()
    const searchParams = request.nextUrl.searchParams
    
    const filters: AIMemoryFilters = {
      companyId: searchParams.get('companyId') || undefined,
      projectId: searchParams.get('projectId') || undefined,
      memoryType: searchParams.get('memoryType') || undefined,
      search: searchParams.get('search') || undefined,
      minConfidence: searchParams.get('minConfidence')
        ? parseInt(searchParams.get('minConfidence')!)
        : undefined,
    }

    const memories = await getAIMemories(workspaceId, filters)

    return NextResponse.json(memories)
  } catch (error) {
    console.error('Error in GET /api/ai-memory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI memories' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ai-memory
 * Create a new AI memory
 */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()
    const body: CreateAIMemoryInput = await request.json()

    // Validate required fields
    if (!body.title || !body.description || !body.memoryType) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, memoryType' },
        { status: 400 }
      )
    }

    if (
      body.confidenceScore === undefined ||
      body.confidenceScore < 1 ||
      body.confidenceScore > 10
    ) {
      return NextResponse.json(
        { error: 'confidenceScore must be between 1 and 10' },
        { status: 400 }
      )
    }

    const memory = await createAIMemory(
      workspaceId,
      PLACEHOLDER_USER_ID,
      body
    )

    return NextResponse.json(memory, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/ai-memory:', error)
    return NextResponse.json(
      { error: 'Failed to create AI memory' },
      { status: 500 }
    )
  }
}
