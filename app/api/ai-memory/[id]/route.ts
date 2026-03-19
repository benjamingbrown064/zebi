import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/workspace'
import { validateAIAuth } from '@/lib/doug-auth'
import {
  getAIMemory,
  updateAIMemory,
  deleteAIMemory,
  UpdateAIMemoryInput,
} from '@/app/actions/ai-memory'

/**
 * GET /api/ai-memory/[id]
 * Get a single AI memory by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const memory = await getAIMemory(workspaceId, params.id)
    if (!memory) {
      return NextResponse.json({ error: 'AI memory not found' }, { status: 404 })
    }
    return NextResponse.json(memory)
  } catch (error) {
    console.error('Error in GET /api/ai-memory/[id]:', error)
    return NextResponse.json({ error: 'Failed to fetch AI memory' }, { status: 500 })
  }
}

/**
 * PUT /api/ai-memory/[id]
 * Update an existing AI memory
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = validateAIAuth(request)
    let workspaceId: string

    const body: UpdateAIMemoryInput & { workspaceId?: string } = await request.json()

    if (auth.valid) {
      if (!body.workspaceId) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
      workspaceId = body.workspaceId
    } else {
      workspaceId = await requireWorkspace()
    }

    if (body.confidenceScore !== undefined && (body.confidenceScore < 1 || body.confidenceScore > 10)) {
      return NextResponse.json({ error: 'confidenceScore must be between 1 and 10' }, { status: 400 })
    }

    const memory = await updateAIMemory(workspaceId, params.id, body)
    return NextResponse.json(memory)
  } catch (error) {
    console.error('Error in PUT /api/ai-memory/[id]:', error)
    return NextResponse.json({ error: 'Failed to update AI memory' }, { status: 500 })
  }
}

/**
 * DELETE /api/ai-memory/[id]
 * Delete an AI memory
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    await deleteAIMemory(workspaceId, params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/ai-memory/[id]:', error)
    return NextResponse.json({ error: 'Failed to delete AI memory' }, { status: 500 })
  }
}
