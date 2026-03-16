/**
 * Inbox Item API Routes
 * GET    /api/inbox/[id] - Get inbox item
 * PATCH  /api/inbox/[id] - Update inbox item
 * DELETE /api/inbox/[id] - Delete inbox item
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getInboxItem,
  updateInboxItem,
  deleteInboxItem,
  type UpdateInboxItemParams,
} from '@/lib/services/inbox-service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/inbox/[id]
 * Get a single inbox item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    

    const inboxItem = await getInboxItem(params.id)

    if (!inboxItem) {
      return NextResponse.json({ error: 'Inbox item not found' }, { status: 404 })
    }

    return NextResponse.json(inboxItem)
  } catch (error: any) {
    console.error('GET /api/inbox/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inbox item' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/inbox/[id]
 * Update an inbox item
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    

    const body = await request.json()
    const updateParams: UpdateInboxItemParams = {}

    // Map body fields to update params
    if (body.rawText !== undefined) updateParams.rawText = body.rawText
    if (body.cleanedText !== undefined) updateParams.cleanedText = body.cleanedText
    if (body.assigneeId !== undefined) updateParams.assigneeId = body.assigneeId
    if (body.projectId !== undefined) updateParams.projectId = body.projectId
    if (body.dueDate !== undefined) {
      updateParams.dueDate = body.dueDate ? new Date(body.dueDate) : null
    }
    if (body.priority !== undefined) updateParams.priority = body.priority
    if (body.status !== undefined) updateParams.status = body.status
    if (body.aiProcessed !== undefined) updateParams.aiProcessed = body.aiProcessed
    if (body.aiSummary !== undefined) updateParams.aiSummary = body.aiSummary
    if (body.aiSuggestions !== undefined) updateParams.aiSuggestions = body.aiSuggestions
    if (body.processedAt !== undefined) {
      updateParams.processedAt = body.processedAt ? new Date(body.processedAt) : undefined
    }

    const updated = await updateInboxItem(params.id, updateParams)

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('PATCH /api/inbox/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update inbox item' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/inbox/[id]
 * Delete an inbox item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    

    await deleteInboxItem(params.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/inbox/[id] error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete inbox item' },
      { status: 500 }
    )
  }
}
