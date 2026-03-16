/**
 * Inbox API Routes
 * POST   /api/inbox - Create inbox item
 * GET    /api/inbox - List inbox items with filters
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  createInboxItem,
  getInboxItems,
  getInboxStats,
  type InboxItemFilters,
} from '@/lib/services/inbox-service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/inbox
 * List inbox items with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const workspaceId = searchParams.get('workspaceId')
    const action = searchParams.get('action')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    // Handle stats request
    if (action === 'stats') {
      const userId = searchParams.get('userId') || 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'
      const stats = await getInboxStats(workspaceId, userId)
      return NextResponse.json(stats)
    }

    // Build filters
    const filters: InboxItemFilters = {}

    const status = searchParams.get('status')
    if (status) {
      filters.status = status.split(',') as any
    }

    const sourceType = searchParams.get('sourceType')
    if (sourceType) {
      filters.sourceType = sourceType as any
    }

    const createdBy = searchParams.get('createdBy')
    if (createdBy) {
      filters.createdBy = createdBy
    }

    const projectId = searchParams.get('projectId')
    if (projectId) {
      filters.projectId = projectId
    }

    const assigneeId = searchParams.get('assigneeId')
    if (assigneeId) {
      filters.assigneeId = assigneeId
    }

    const fromDate = searchParams.get('fromDate')
    if (fromDate) {
      filters.fromDate = new Date(fromDate)
    }

    const toDate = searchParams.get('toDate')
    if (toDate) {
      filters.toDate = new Date(toDate)
    }

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await getInboxItems(workspaceId, filters, limit, offset)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('GET /api/inbox error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inbox items' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/inbox
 * Create a new inbox item
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspaceId,
      rawText,
      sourceType = 'text',
      transcript,
      assigneeId,
      projectId,
      dueDate,
      priority,
      metadata,
    } = body

    if (!workspaceId || !rawText) {
      return NextResponse.json(
        { error: 'workspaceId and rawText are required' },
        { status: 400 }
      )
    }

    const inboxItem = await createInboxItem({
      workspaceId,
      createdBy: 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74',
      rawText,
      sourceType,
      transcript,
      assigneeId,
      projectId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority,
      metadata,
    })

    return NextResponse.json(inboxItem, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/inbox error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create inbox item' },
      { status: 500 }
    )
  }
}
