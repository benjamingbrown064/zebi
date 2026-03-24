import { NextRequest, NextResponse } from 'next/server'
import { requireDougAuth } from '@/lib/doug-auth'
import { getDougWorkspaceId } from '@/lib/doug-workspace'
import { prisma } from '@/lib/prisma'
import { generateObjectiveBreakdown } from '@/lib/objective-breakdown'

const DEFAULT_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

/**
 * POST /api/doug/objective
 * 
 * Create a new objective with AI breakdown
 * 
 * Body:
 * {
 *   "title": "Reach £50k MRR by June",
 *   "companyId": "uuid" (optional),
 *   "goalId": "uuid" (optional),
 *   "targetValue": 50000,
 *   "unit": "GBP",
 *   "metricType": "currency",
 *   "deadline": "2026-06-30",
 *   "priority": 1-4 (default 3),
 *   "autoBreakdown": true (default true)
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
      title,
      description,
      companyId,
      goalId,
      objectiveType = 'general',
      metricType = 'count',
      targetValue,
      unit,
      startDate = new Date().toISOString().split('T')[0],
      deadline,
      priority = 3,
      autoBreakdown = true,
      userId,
    } = body

    // Resolve workspace from Doug API context
    const workspaceId = await getDougWorkspaceId(userId)

    // Validation
    if (!title || !targetValue || !deadline) {
      return NextResponse.json(
        { error: 'Missing required fields: title, targetValue, deadline' },
        { status: 400 }
      )
    }

    // Create objective
    const objective = await prisma.objective.create({
      data: {
        workspaceId,
        title,
        description,
        companyId: companyId || null,
        goalId: goalId || null,
        objectiveType,
        metricType,
        currentValue: 0,
        targetValue,
        unit: unit || null,
        startDate: new Date(startDate),
        deadline: new Date(deadline),
        status: 'active',
        progressPercent: 0,
        priority,
        createdBy: userId || DEFAULT_USER_ID,
      },
      include: {
        company: { select: { id: true, name: true } },
        goal: { select: { id: true, name: true } },
      },
    })

    // Generate AI breakdown if requested
    let breakdown = null
    if (autoBreakdown) {
      try {
        breakdown = await generateObjectiveBreakdown(
          objective.title,
          Number(objective.targetValue),
          objective.unit || '',
          objective.startDate,
          objective.deadline,
          objective.company ? { name: objective.company.name, revenue: 0 } : undefined
        )
      } catch (err) {
        console.error('[Doug API] AI breakdown failed:', err)
        // Don't fail the whole request if AI fails
      }
    }

    return NextResponse.json({
      objective: {
        id: objective.id,
        title: objective.title,
        space: objective.company?.name,
        goal: objective.goal?.name,
        status: objective.status,
        progress: `${objective.currentValue}/${objective.targetValue} ${objective.unit || ''}`,
        deadline: objective.deadline.toISOString(),
      },
      breakdown: breakdown
        ? {
            projects: breakdown.projects.length,
            tasks: breakdown.tasks.length,
            milestones: breakdown.milestones.length,
          }
        : null,
    }, { status: 201 })
  } catch (error) {
    console.error('[Doug API] Failed to create objective:', error)
    return NextResponse.json(
      { error: 'Failed to create objective' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/doug/objective
 * 
 * Update objective progress or status
 * 
 * Body:
 * {
 *   "objectiveId": "uuid",
 *   "currentValue": 5000 (optional),
 *   "status": "on_track|at_risk|blocked|completed" (optional),
 *   "note": "Progress update note" (optional)
 * }
 */
export async function PATCH(request: NextRequest) {
  const authError = requireDougAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const body = await request.json()
    const { objectiveId, currentValue, status, note, userId } = body

    // Resolve workspace from Doug API context
    const workspaceId = await getDougWorkspaceId(userId)

    if (!objectiveId) {
      return NextResponse.json(
        { error: 'Missing required field: objectiveId' },
        { status: 400 }
      )
    }

    // Get objective to calculate progress
    const objective = await prisma.objective.findUnique({
      where: { id: objectiveId },
      select: { targetValue: true, currentValue: true },
    })

    if (!objective) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 })
    }

    // Calculate new progress percentage
    const newValue = currentValue !== undefined ? currentValue : Number(objective.currentValue)
    const progressPercent = Math.min(
      100,
      Math.round((newValue / Number(objective.targetValue)) * 100)
    )

    // Update objective
    const updateData: any = {
      ...(currentValue !== undefined && { currentValue: newValue }),
      ...(status && { status }),
      progressPercent,
    }

    const updated = await prisma.objective.update({
      where: { id: objectiveId },
      data: updateData,
      include: {
        company: { select: { name: true } },
      },
    })

    // Record progress entry if we have a note or value change
    if (note || currentValue !== undefined) {
      await prisma.objectiveProgress.create({
        data: {
          objectiveId,
          value: newValue,
          entryDate: new Date(),
          note: note || null,
          source: 'doug_api',
          createdBy: userId || DEFAULT_USER_ID,
        },
      })
    }

    return NextResponse.json({
      objective: {
        id: updated.id,
        title: updated.title,
        space: updated.company?.name,
        status: updated.status,
        progress: `${updated.currentValue}/${updated.targetValue} ${updated.unit || ''}`,
        progressPercent: Number(updated.progressPercent),
      },
    })
  } catch (error) {
    console.error('[Doug API] Failed to update objective:', error)
    return NextResponse.json(
      { error: 'Failed to update objective' },
      { status: 500 }
    )
  }
}
