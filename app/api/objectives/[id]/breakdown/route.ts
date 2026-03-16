import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateObjectiveBreakdown } from '@/lib/objective-breakdown';
import { queueProgressRecalculation } from '@/lib/progress-queue';

/**
 * POST /api/objectives/[id]/breakdown
 * Regenerate AI breakdown for objective
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { createEntities = true } = body;

    // Get objective with company context
    const objective = await prisma.objective.findUnique({
      where: { id: params.id },
      include: {
        company: {
          include: {
            memories: {
              where: { confidenceScore: { gte: 7 } },
              select: { description: true },
              take: 5,
            },
          },
        },
      },
    });

    if (!objective) {
      return NextResponse.json(
        { success: false, error: 'Objective not found' },
        { status: 404 }
      );
    }

    // Generate breakdown
    let companyContext;
    if (objective.company) {
      companyContext = {
        name: objective.company.name,
        industry: objective.company.industry || undefined,
        stage: objective.company.stage || undefined,
        revenue: objective.company.revenue ? Number(objective.company.revenue) : undefined,
        positioning: objective.company.positioning || undefined,
        relevantMemories: objective.company.memories.map(m => m.description),
      };
    }

    const breakdown = await generateObjectiveBreakdown(
      objective.title,
      Number(objective.targetValue),
      objective.unit || 'units',
      objective.startDate,
      objective.deadline,
      companyContext
    );

    // Optionally create entities
    let createdProjects = [];
    let createdTasks = [];
    let createdMilestones = [];

    if (createEntities) {
      // Create milestones
      for (const milestone of breakdown.milestones) {
        const created = await prisma.objectiveMilestone.create({
          data: {
            objectiveId: objective.id,
            title: milestone.title,
            targetValue: milestone.targetValue,
            targetDate: new Date(milestone.targetDate),
            status: 'pending',
          },
        });
        createdMilestones.push(created);
      }

      // Get default status
      const defaultStatus = await prisma.status.findFirst({
        where: { workspaceId: objective.workspaceId, type: 'todo' },
      });

      if (!defaultStatus) {
        throw new Error('No default status found');
      }

      // Create projects
      for (const project of breakdown.projects) {
        const created = await prisma.project.create({
          data: {
            workspaceId: objective.workspaceId,
            companyId: objective.companyId,
            objectiveId: objective.id,
            name: project.name,
            description: project.description,
            priority: project.priority,
          },
        });
        createdProjects.push(created);
      }

      // Create tasks
      for (const task of breakdown.tasks) {
        const projectId = createdProjects[task.projectIndex]?.id || null;

        const created = await prisma.task.create({
          data: {
            workspaceId: objective.workspaceId,
            companyId: objective.companyId,
            objectiveId: objective.id,
            projectId,
            title: task.title,
            description: task.description,
            statusId: defaultStatus.id,
            priority: task.priority,
            aiGenerated: true,
            aiAgent: task.assignee === 'AI' ? 'Doug' : undefined,
            createdBy: objective.createdBy,
          },
        });
        createdTasks.push(created);
      }

      // Update objective with breakdown
      await prisma.objective.update({
        where: { id: objective.id },
        data: {
          aiActionPlan: {
            breakdown: breakdown as any,
            risks: breakdown.risks as any,
            regeneratedAt: new Date().toISOString(),
          } as any,
        },
      });

      // Trigger async progress recalculation (V2)
      if (createdTasks.length > 0) {
        queueProgressRecalculation(objective.id).catch(err => {
          console.error('[API:objectives:breakdown] Failed to queue progress recalc:', err);
          // Don't fail the request
        });
      }
    }

    return NextResponse.json({
      success: true,
      breakdown,
      created: createEntities
        ? {
            milestones: createdMilestones,
            projects: createdProjects,
            tasks: createdTasks,
          }
        : null,
    });
  } catch (err) {
    console.error('[API:objectives:breakdown] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
