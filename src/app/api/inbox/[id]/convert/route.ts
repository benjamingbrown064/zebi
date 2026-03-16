/**
 * Convert Inbox Item to Task API Route
 * POST /api/inbox/[id]/convert - Convert inbox item to task
 */

import { NextRequest, NextResponse } from 'next/server'
import { convertInboxItemToTask, getInboxItem } from '@/lib/services/inbox-service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/inbox/[id]/convert
 * Convert an inbox item to a task
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    

    // Get the inbox item
    const inboxItem = await getInboxItem(params.id)

    if (!inboxItem) {
      return NextResponse.json({ error: 'Inbox item not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      title,
      description,
      statusId,
      assigneeId,
      projectId,
      dueAt,
      priority,
    } = body

    if (!statusId) {
      return NextResponse.json(
        { error: 'statusId is required' },
        { status: 400 }
      )
    }

    // Convert to task
    const task = await convertInboxItemToTask(params.id, {
      title: title || inboxItem.rawText.substring(0, 100), // Use first 100 chars as title if not provided
      description: description || inboxItem.rawText,
      statusId,
      workspaceId: inboxItem.workspaceId,
      assigneeId: assigneeId || inboxItem.assigneeId || undefined,
      projectId: projectId || inboxItem.projectId || undefined,
      dueAt: dueAt ? new Date(dueAt) : inboxItem.dueDate || undefined,
      priority: priority !== undefined ? priority : inboxItem.priority || 3,
      createdBy: 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74',
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/inbox/[id]/convert error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to convert inbox item to task' },
      { status: 500 }
    )
  }
}
