import { NextRequest, NextResponse } from 'next/server'
import { requireDougAuth } from '@/lib/doug-auth'
import { prisma } from '@/lib/prisma'

const DEFAULT_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

/**
 * POST /api/doug/blocker
 * 
 * Record a blocker for an objective
 * 
 * Body:
 * {
 *   "objectiveId": "uuid",
 *   "title": "Waiting for design approval",
 *   "description": "Can't proceed until client approves mockups",
 *   "blockerType": "external_dependency|resource|technical|decision",
 *   "severity": "low|medium|high|critical" (default "medium")
 * }
 */
export async function POST(request: NextRequest) {
  const authError = requireDougAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const body = await request.json()
    const {
      objectiveId,
      title,
      description,
      blockerType = 'external_dependency',
      severity = 'medium',
    } = body

    if (!objectiveId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: objectiveId, title' },
        { status: 400 }
      )
    }

    // Create blocker
    const blocker = await prisma.objectiveBlocker.create({
      data: {
        objectiveId,
        title,
        description: description || null,
        blockerType,
        severity,
      },
      include: {
        objective: {
          select: {
            id: true,
            title: true,
            company: { select: { name: true } },
          },
        },
      },
    })

    // Update objective status to blocked if severity is high/critical
    if (severity === 'high' || severity === 'critical') {
      await prisma.objective.update({
        where: { id: objectiveId },
        data: { status: 'blocked' },
      })
    } else {
      // For medium/low, set to at_risk if not already worse
      const objective = await prisma.objective.findUnique({
        where: { id: objectiveId },
        select: { status: true },
      })
      
      if (objective?.status === 'active' || objective?.status === 'on_track') {
        await prisma.objective.update({
          where: { id: objectiveId },
          data: { status: 'at_risk' },
        })
      }
    }

    return NextResponse.json({
      blocker: {
        id: blocker.id,
        title: blocker.title,
        severity: blocker.severity,
        objective: {
          id: blocker.objective.id,
          title: blocker.objective.title,
          space: blocker.objective.company?.name,
        },
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[Doug API] Failed to create blocker:', error)
    return NextResponse.json(
      { error: 'Failed to create blocker' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/doug/blocker
 * 
 * Resolve a blocker
 * 
 * Body:
 * {
 *   "blockerId": "uuid",
 *   "resolution": "Client approved design"
 * }
 */
export async function PATCH(request: NextRequest) {
  const authError = requireDougAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const body = await request.json()
    const { blockerId, resolution } = body

    if (!blockerId) {
      return NextResponse.json(
        { error: 'Missing required field: blockerId' },
        { status: 400 }
      )
    }

    // Resolve blocker
    const blocker = await prisma.objectiveBlocker.update({
      where: { id: blockerId },
      data: {
        resolvedAt: new Date(),
      },
      include: {
        objective: {
          select: { id: true },
        },
      },
    })

    // Check if objective has any other unresolved blockers
    const remainingBlockers = await prisma.objectiveBlocker.count({
      where: {
        objectiveId: blocker.objectiveId,
        resolvedAt: null,
      },
    })

    // If no more blockers, set objective back to active
    if (remainingBlockers === 0) {
      await prisma.objective.update({
        where: { id: blocker.objectiveId },
        data: { status: 'active' },
      })
    }

    return NextResponse.json({
      blocker: {
        id: blocker.id,
        resolved: true,
        remainingBlockers,
      },
    })
  } catch (error) {
    console.error('[Doug API] Failed to resolve blocker:', error)
    return NextResponse.json(
      { error: 'Failed to resolve blocker' },
      { status: 500 }
    )
  }
}
