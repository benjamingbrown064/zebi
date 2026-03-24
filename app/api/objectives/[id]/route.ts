import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/objectives/[id]
 * Get single objective with optimized context
 * 
 * OPTIMIZATIONS:
 * - Uses select statements to limit fields
 * - Limits related data (tasks, projects, etc.)
 * - Only fetches necessary information
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const objective = await prisma.objective.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        workspaceId: true,
        companyId: true,
        goalId: true,
        title: true,
        description: true,
        objectiveType: true,
        metricType: true,
        targetValue: true,
        currentValue: true,
        unit: true,
        startDate: true,
        deadline: true,
        status: true,
        progressPercent: true,
        lastChecked: true,
        progressMode: true,
        completedTaskCount: true,
        totalTaskCount: true,
        lastProgressRecalc: true,
        scopeChangeNote: true,
        priority: true,
        dependsOn: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        
        // Related data with selective fields
        company: {
          select: {
            id: true,
            name: true,
            industry: true,
            stage: true,
            revenue: true,
          },
        },
        goal: {
          select: {
            id: true,
            name: true,
          },
        },
        milestones: {
          select: {
            id: true,
            title: true,
            targetValue: true,
            targetDate: true,
            completedAt: true,
            status: true,
          },
          orderBy: { targetDate: 'asc' },
          take: 20, // Limit milestones
        },
        progressEntries: {
          select: {
            id: true,
            value: true,
            entryDate: true,
            note: true,
            source: true,
            createdAt: true,
          },
          orderBy: { entryDate: 'desc' },
          take: 30, // Last 30 entries
        },
        blockers: {
          where: { resolvedAt: null }, // Only active blockers
          select: {
            id: true,
            blockerType: true,
            title: true,
            description: true,
            severity: true,
            detectedAt: true,
          },
          orderBy: { detectedAt: 'desc' },
        },
        projects: {
          where: { archivedAt: null },
          select: {
            id: true,
            name: true,
            description: true,
            priority: true,
            archivedAt: true,
            _count: {
              select: {
                tasks: { where: { archivedAt: null } },
              },
            },
          },
          take: 50, // Limit projects
        },
        tasks: {
          where: { archivedAt: null },
          select: {
            id: true,
            title: true,
            statusId: true,
            completedAt: true,
            priority: true,
            aiGenerated: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100, // Limit tasks
        },
      },
    });

    if (!objective) {
      return NextResponse.json(
        { success: false, error: 'Objective not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      objective: {
        ...objective,
        currentValue: Number(objective.currentValue),
        targetValue: Number(objective.targetValue),
        progressPercent: Number(objective.progressPercent),
        space: objective.company
          ? {
              ...objective.company,
              revenue: objective.company.revenue ? Number(objective.company.revenue) : null,
            }
          : null,
        progressEntries: objective.progressEntries.map(p => ({
          ...p,
          value: Number(p.value),
        })),
        milestones: objective.milestones.map(m => ({
          ...m,
          targetValue: Number(m.targetValue),
        })),
        projects: objective.projects.map(p => ({
          ...p,
          taskCount: p._count.tasks,
        })),
      },
    });
  } catch (err) {
    console.error('[API:objectives:GET] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/objectives/[id]
 * Update objective
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      objectiveType,
      targetValue,
      currentValue,
      unit,
      startDate,
      deadline,
      status,
      priority,
      dependsOn,
      companyId,
      goalId,
    } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (objectiveType !== undefined) updateData.objectiveType = objectiveType;
    if (targetValue !== undefined) updateData.targetValue = targetValue;
    if (currentValue !== undefined) {
      updateData.currentValue = currentValue;
      // Recalculate progress percent
      const objective = await prisma.objective.findUnique({
        where: { id: params.id },
        select: { targetValue: true },
      });
      if (objective) {
        updateData.progressPercent =
          (currentValue / Number(objective.targetValue)) * 100;
      }
    }
    if (unit !== undefined) updateData.unit = unit;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (deadline !== undefined) updateData.deadline = new Date(deadline);
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (dependsOn !== undefined) updateData.dependsOn = dependsOn;
    if (companyId !== undefined) updateData.companyId = companyId;
    if (goalId !== undefined) updateData.goalId = goalId;

    // Mark as completed if status is completed
    if (status === 'completed' && !updateData.completedAt) {
      updateData.completedAt = new Date();
    }

    const objective = await prisma.objective.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      objective: {
        ...objective,
        currentValue: Number(objective.currentValue),
        targetValue: Number(objective.targetValue),
        progressPercent: Number(objective.progressPercent),
      },
    });
  } catch (err) {
    console.error('[API:objectives:PUT] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/objectives/[id]
 * Delete objective (cascades to milestones, blockers)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.objective.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Objective deleted',
    });
  } catch (err) {
    console.error('[API:objectives:DELETE] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
