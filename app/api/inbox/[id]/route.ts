import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'

// GET /api/inbox/[id] - Get single inbox item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = await requireWorkspace()
    
    const inboxItem = await prisma.inboxItem.findFirst({
      where: {
        id: params.id,
        workspaceId,
      },
      include: {
        workspace: {
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

    if (!inboxItem) {
      return NextResponse.json(
        { error: 'Inbox item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(inboxItem)
  } catch (error) {
    console.error('Failed to fetch inbox item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inbox item' },
      { status: 500 }
    )
  }
}

// PATCH /api/inbox/[id] - Update inbox item
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      rawText,
      cleanedText,
      transcript,
      assigneeId,
      projectId,
      dueDate,
      priority,
      status,
      aiProcessed,
      aiSummary,
      aiSuggestions,
      convertedTaskIds,
      metadata,
    } = body

    // Build update data object
    const updateData: any = {}
    
    if (rawText !== undefined) updateData.rawText = rawText
    if (cleanedText !== undefined) updateData.cleanedText = cleanedText
    if (transcript !== undefined) updateData.transcript = transcript
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId
    if (projectId !== undefined) updateData.projectId = projectId
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (priority !== undefined) updateData.priority = priority
    if (status !== undefined) {
      updateData.status = status
      // Update processedAt timestamp when status changes to processed or converted
      if (status === 'processed' || status === 'converted') {
        updateData.processedAt = new Date()
      }
    }
    if (aiProcessed !== undefined) updateData.aiProcessed = aiProcessed
    if (aiSummary !== undefined) updateData.aiSummary = aiSummary
    if (aiSuggestions !== undefined) updateData.aiSuggestions = aiSuggestions
    if (convertedTaskIds !== undefined) updateData.convertedTaskIds = convertedTaskIds
    if (metadata !== undefined) updateData.metadata = metadata

    const inboxItem = await prisma.inboxItem.update({
      where: {
        id: params.id,
      },
      data: updateData,
      include: {
        workspace: {
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

    return NextResponse.json(inboxItem)
  } catch (error) {
    console.error('Failed to update inbox item:', error)
    return NextResponse.json(
      { error: 'Failed to update inbox item' },
      { status: 500 }
    )
  }
}

// DELETE /api/inbox/[id] - Delete inbox item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.inboxItem.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete inbox item:', error)
    return NextResponse.json(
      { error: 'Failed to delete inbox item' },
      { status: 500 }
    )
  }
}
