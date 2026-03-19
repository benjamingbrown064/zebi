import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { Decimal } from '@prisma/client/runtime/library'

export const revalidate = 120 // Cache for 120s — invalidated on writes


const DEFAULT_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

/**
 * GET /api/goals
 * List goals for a workspace
 * Query params: workspaceId (required), status (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const status = searchParams.get('status')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    const where: any = { workspaceId }
    if (status) {
      where.status = status
    } else {
      where.status = { in: ['active', 'paused'] }
    }

    const goals = await prisma.goal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      goals: goals.map(g => ({
        id: g.id,
        name: g.name,
        currentValue: Number(g.currentValue),
        targetValue: Number(g.targetValue),
        unit: g.unit || null,
        endDate: g.endDate.toISOString().split('T')[0],
        status: g.status,
        metricType: g.metricType,
        workspaceId: g.workspaceId,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('GET /api/goals error:', error)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

/**
 * POST /api/goals
 * Create a new goal
 */
export async function POST(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, name, metricType, targetValue, currentValue, unit, startDate, endDate } = body

    if (!workspaceId || !name || !metricType || !targetValue || !endDate) {
      return NextResponse.json(
        { error: 'Required: workspaceId, name, metricType, targetValue, endDate' },
        { status: 400 }
      )
    }

    const goal = await prisma.goal.create({
      data: {
        workspaceId,
        createdBy: DEFAULT_USER_ID as any,
        name,
        metricType,
        targetValue: new Decimal(targetValue),
        currentValue: new Decimal(currentValue || 0),
        unit: unit || null,
        startDate: new Date(startDate || new Date()),
        endDate: new Date(endDate),
        status: 'active',
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
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/goals error:', error)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}
