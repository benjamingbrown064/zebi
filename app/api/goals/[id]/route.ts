import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * GET /api/goals/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    const goal = await prisma.goal.findFirst({
      where: { id: params.id, workspaceId },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      goal: {
        id: goal.id,
        name: goal.name,
        currentValue: Number(goal.currentValue),
        targetValue: Number(goal.targetValue),
        unit: goal.unit || null,
        endDate: goal.endDate.toISOString().split('T')[0],
        status: goal.status,
        metricType: goal.metricType,
        workspaceId: goal.workspaceId,
        createdAt: goal.createdAt.toISOString(),
        updatedAt: goal.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('GET /api/goals/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch goal' }, { status: 500 })
  }
}

/**
 * PUT /api/goals/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = validateAIAuth(request)
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, name, metricType, targetValue, currentValue, unit, endDate, status } = body

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    const existing = await prisma.goal.findFirst({ where: { id: params.id, workspaceId } })
    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const goal = await prisma.goal.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(metricType !== undefined && { metricType }),
        ...(targetValue !== undefined && { targetValue: new Decimal(targetValue) }),
        ...(currentValue !== undefined && { currentValue: new Decimal(currentValue) }),
        ...(unit !== undefined && { unit }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(status !== undefined && { status }),
      },
    })

    return NextResponse.json({
      success: true,
      goal: {
        id: goal.id,
        name: goal.name,
        currentValue: Number(goal.currentValue),
        targetValue: Number(goal.targetValue),
        unit: goal.unit || null,
        endDate: goal.endDate.toISOString().split('T')[0],
        status: goal.status,
        metricType: goal.metricType,
        workspaceId: goal.workspaceId,
        createdAt: goal.createdAt.toISOString(),
        updatedAt: goal.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('PUT /api/goals/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

/**
 * DELETE /api/goals/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = validateAIAuth(request)
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    const existing = await prisma.goal.findFirst({ where: { id: params.id, workspaceId } })
    if (!existing) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    await prisma.goal.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/goals/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
}
