/**
 * Bulk Inbox Operations API Route
 * POST /api/inbox/bulk - Bulk update or delete inbox items
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  bulkUpdateInboxItems,
  bulkDeleteInboxItems,
  type UpdateInboxItemParams,
} from '@/lib/services/inbox-service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/inbox/bulk
 * Bulk update or delete inbox items
 */
export async function POST(request: NextRequest) {
  try {
    

    const body = await request.json()
    const { action, ids, updates } = body

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'action and ids array are required' },
        { status: 400 }
      )
    }

    if (action === 'update') {
      if (!updates) {
        return NextResponse.json(
          { error: 'updates object is required for update action' },
          { status: 400 }
        )
      }

      const updateParams: UpdateInboxItemParams = {}

      // Map update fields
      if (updates.status !== undefined) updateParams.status = updates.status
      if (updates.assigneeId !== undefined) updateParams.assigneeId = updates.assigneeId
      if (updates.projectId !== undefined) updateParams.projectId = updates.projectId
      if (updates.priority !== undefined) updateParams.priority = updates.priority
      if (updates.dueDate !== undefined) {
        updateParams.dueDate = updates.dueDate ? new Date(updates.dueDate) : null
      }

      const result = await bulkUpdateInboxItems(ids, updateParams)

      return NextResponse.json({ success: true, count: result.count })
    }

    if (action === 'delete') {
      const result = await bulkDeleteInboxItems(ids)

      return NextResponse.json({ success: true, count: result.count })
    }

    return NextResponse.json(
      { error: 'Invalid action. Must be "update" or "delete"' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('POST /api/inbox/bulk error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to perform bulk operation' },
      { status: 500 }
    )
  }
}
