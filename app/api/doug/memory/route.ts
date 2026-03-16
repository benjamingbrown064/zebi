import { NextRequest, NextResponse } from 'next/server'
import { requireDougAuth } from '@/lib/doug-auth'
import { getDougWorkspaceId } from '@/lib/doug-workspace'
import { createAIMemory, CreateAIMemoryInput } from '@/app/actions/ai-memory'
import { prisma } from '@/lib/prisma'

const DEFAULT_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

/**
 * GET /api/doug/memory
 * 
 * Retrieve AI memories with optional filtering
 * 
 * Query params:
 * - createdBy: Filter by creator ("doug", "harvey", or user UUID)
 * - memoryType: Filter by type
 * - limit: Max results (default 50)
 */
export async function GET(request: NextRequest) {
  const authError = requireDougAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const createdBy = searchParams.get('createdBy')
    const memoryType = searchParams.get('memoryType')
    const limit = parseInt(searchParams.get('limit') || '50')

    const workspaceId = await getDougWorkspaceId()

    const memories = await prisma.aIMemory.findMany({
      where: {
        workspaceId,
        ...(createdBy && { createdBy }),
        ...(memoryType && { memoryType }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        memoryType: true,
        confidenceScore: true,
        createdBy: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ memories })
  } catch (error) {
    console.error('[Doug API] Failed to fetch memories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI memories' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/doug/memory
 * 
 * Create an AI memory entry (Doug can document setup, integration notes, etc.)
 * 
 * Body:
 * {
 *   "title": "Doug AI Assistant Integration Setup",
 *   "description": "Detailed setup information...",
 *   "memoryType": "setup_documentation",
 *   "confidenceScore": 10,
 *   "tags": ["doug", "integration"],
 *   "companyId": "uuid" (optional),
 *   "projectId": "uuid" (optional),
 *   "createdBy": "doug" | "harvey" | user-uuid (optional, defaults to caller)
 * }
 */
export async function POST(request: NextRequest) {
  const authError = requireDougAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const body: CreateAIMemoryInput & { userId?: string } = await request.json()

    // Resolve workspace from Doug API context
    const workspaceId = await getDougWorkspaceId(body.userId)
    const userId = body.userId || DEFAULT_USER_ID

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
      userId,
      body
    )

    return NextResponse.json({
      memory: {
        id: memory.id,
        title: memory.title,
        memoryType: memory.memoryType,
        confidenceScore: memory.confidenceScore,
        createdAt: memory.createdAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[Doug API] Failed to create memory:', error)
    return NextResponse.json(
      { error: 'Failed to create AI memory' },
      { status: 500 }
    )
  }
}
