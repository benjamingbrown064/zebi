import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'


// Mark as dynamic route (uses searchParams)
export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/plan
 * Get current day plan
 */
export async function GET(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()
    
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const tasks = await prisma.task.findMany({
      where: { 
        workspaceId,
        archivedAt: null,
        todayPinDate: { gte: todayStart }
      },
      orderBy: [
        { todayCategory: 'asc' },
        { todayOrder: 'asc' }
      ],
      include: {
        status: { select: { name: true, type: true } },
        project: { select: { name: true } },
        company: { select: { name: true } },
      }
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Failed to get plan:', error)
    return NextResponse.json(
      { error: 'Failed to get plan' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dashboard/plan
 * Add task to today's plan
 */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()
    const { taskId, category } = await request.json()

    if (!taskId || !category) {
      return NextResponse.json(
        { error: 'taskId and category required' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = ['main', 'secondary', 'additional', 'other']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      )
    }

    // Get current max order in category
    const maxOrderTask = await prisma.task.findFirst({
      where: {
        workspaceId,
        todayCategory: category,
        todayPinDate: { not: null }
      },
      orderBy: { todayOrder: 'desc' },
      select: { todayOrder: true }
    })

    const nextOrder = (maxOrderTask?.todayOrder || 0) + 1

    // Update task
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        todayPinDate: new Date(),
        todayCategory: category,
        todayOrder: nextOrder
      },
      include: {
        status: { select: { name: true, type: true } },
        project: { select: { name: true } },
        company: { select: { name: true } },
      }
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Failed to add task to plan:', error)
    return NextResponse.json(
      { error: 'Failed to add task to plan' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/dashboard/plan
 * Remove task from today's plan
 */
export async function DELETE(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()
    const taskId = request.nextUrl.searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId required' },
        { status: 400 }
      )
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        todayPinDate: null,
        todayCategory: null,
        todayOrder: null
      }
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Failed to remove task from plan:', error)
    return NextResponse.json(
      { error: 'Failed to remove task from plan' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/dashboard/plan
 * Update task category or order
 */
export async function PATCH(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()
    const { taskId, category, order } = await request.json()

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    
    if (category !== undefined) {
      updateData.todayCategory = category
    }
    
    if (order !== undefined) {
      updateData.todayOrder = order
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        status: { select: { name: true, type: true } },
        project: { select: { name: true } },
        company: { select: { name: true } },
      }
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Failed to update task plan:', error)
    return NextResponse.json(
      { error: 'Failed to update task plan' },
      { status: 500 }
    )
  }
}
