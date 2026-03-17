import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateObjectiveBreakdown } from '@/lib/objective-breakdown';
import { validateAIAuth } from '@/lib/doug-auth';

/**
 * GET /api/objectives
 * List objectives with filters and pagination
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const goalId = searchParams.get('goalId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    const where: any = { workspaceId };
    if (companyId) where.companyId = companyId;
    if (status) where.status = status;
    if (goalId) where.goalId = goalId;

    const objectives = await prisma.objective.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true },
        },
        goal: {
          select: { id: true, name: true },
        },
        milestones: {
          orderBy: { targetDate: 'asc' },
          where: { completedAt: null },
        },
        blockers: {
          where: { resolvedAt: null },
        },
        tasks: {
          where: { archivedAt: null },
          select: {
            id: true,
            title: true,
            completedAt: true,
            aiGenerated: true,
            aiAgent: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            projects: true,
          },
        },
      },
      orderBy: { deadline: 'asc' },
      take: limit,
      skip: offset,
    });

    // Map objectives with computed fields (same as page.tsx)
    const mappedObjectives = objectives.map((obj) => {
      const nextMilestone = obj.milestones.find(
        (m) => !m.completedAt && Number(m.targetValue) > Number(obj.currentValue)
      );

      const daysUntilMilestone = nextMilestone
        ? Math.ceil((new Date(nextMilestone.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      const aiTask = obj.tasks.find((t) => t.aiGenerated && !t.completedAt);
      const humanTask = obj.tasks.find((t) => !t.aiGenerated && !t.completedAt);

      return {
        id: obj.id,
        title: obj.title,
        description: obj.description,
        companyId: obj.company?.id,
        companyName: obj.company?.name,
        goalId: obj.goal?.id,
        goalName: obj.goal?.name,
        objectiveType: obj.objectiveType,
        metricType: obj.metricType,
        currentValue: Number(obj.currentValue),
        targetValue: Number(obj.targetValue),
        unit: obj.unit,
        startDate: obj.startDate.toISOString(),
        deadline: obj.deadline.toISOString(),
        status: obj.status,
        progressPercent: Number(obj.progressPercent),
        priority: obj.priority,
        activeBlockers: obj.blockers.length,
        nextMilestone: nextMilestone
          ? {
              title: nextMilestone.title,
              targetValue: Number(nextMilestone.targetValue),
              targetDate: nextMilestone.targetDate.toISOString(),
              daysUntil: daysUntilMilestone!,
            }
          : undefined,
        aiWork: aiTask?.title,
        humanWork: humanTask?.title,
        taskCount: obj._count.tasks,
        projectCount: obj._count.projects,
      };
    });

    return NextResponse.json({
      success: true,
      objectives: mappedObjectives,
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
 * POST /api/objectives
 * Create objective with AI breakdown
 */
export async function POST(request: NextRequest) {
  try {
    // Validate Bearer token (for API access from Doug/Harvey)
    const auth = validateAIAuth(request)
    if (!auth.valid) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid API token' },
        { status: 401 }
      )
    }

    const body = await request.json();
    const {
      workspaceId,
      companyId,
      goalId,
      title,
      description,
      objectiveType,
      metricType,
      targetValue,
      unit,
      startDate,
      deadline,
      priority,
      createdBy,
      autoBreakdown = true, // Generate breakdown by default
    } = body;

    // Validate required fields
    if (!workspaceId || !title || !metricType || !targetValue || !startDate || !deadline || !createdBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create objective
    const objective = await prisma.objective.create({
      data: {
        workspaceId,
        companyId: companyId || null,
        goalId: goalId || null,
        title,
        description: description || null,
        objectiveType: objectiveType || 'general',
        metricType,
        targetValue,
        currentValue: 0,
        unit: unit || null,
        startDate: new Date(startDate),
        deadline: new Date(deadline),
        status: 'active',
        progressPercent: 0,
        priority: priority || 3,
        createdBy,
      },
    });

    // If autoBreakdown, generate AI breakdown
    let breakdown = null;
    let createdProjects = [];
    let createdTasks = [];
    let createdMilestones = [];

    if (autoBreakdown) {
      try {
        // Get company context if available
        let companyContext;
        if (companyId) {
          const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
              memories: {
                where: { confidenceScore: { gte: 7 } },
                select: { description: true },
                take: 5,
              },
            },
          });

          if (company) {
            companyContext = {
              name: company.name,
              industry: company.industry || undefined,
              stage: company.stage || undefined,
              revenue: company.revenue ? Number(company.revenue) : undefined,
              positioning: company.positioning || undefined,
              relevantMemories: company.memories.map(m => m.description),
            };
          }
        }

        breakdown = await generateObjectiveBreakdown(
          title,
          targetValue,
          unit || 'units',
          new Date(startDate),
          new Date(deadline),
          companyContext
        );

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

        // Get default status for tasks
        const defaultStatus = await prisma.status.findFirst({
          where: { workspaceId, type: 'todo' },
        });

        if (!defaultStatus) {
          throw new Error('No default status found');
        }

        // Create projects
        for (const project of breakdown.projects) {
          const created = await prisma.project.create({
            data: {
              workspaceId,
              companyId: companyId || null,
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
              workspaceId,
              companyId: companyId || null,
              objectiveId: objective.id,
              projectId,
              title: task.title,
              description: task.description,
              statusId: defaultStatus.id,
              priority: task.priority,
              aiGenerated: true,
              aiAgent: task.assignee === 'AI' ? 'Doug' : undefined,
              createdBy,
            },
          });
          createdTasks.push(created);
        }

        // Store breakdown and risks in aiActionPlan
        await prisma.objective.update({
          where: { id: objective.id },
          data: {
            aiActionPlan: {
              breakdown,
              risks: breakdown.risks,
            } as any,
          },
        });
      } catch (breakdownErr) {
        console.error('[API:objectives:POST] Breakdown error:', breakdownErr);
        // Continue without breakdown - objective is still created
      }
    }

    return NextResponse.json({
      success: true,
      objective: {
        ...objective,
        currentValue: Number(objective.currentValue),
        targetValue: Number(objective.targetValue),
        progressPercent: Number(objective.progressPercent),
      },
      breakdown: breakdown
        ? {
            milestones: createdMilestones,
            projects: createdProjects,
            tasks: createdTasks,
            risks: breakdown.risks,
          }
        : null,
    });
  } catch (err) {
    console.error('[API:objectives:POST] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
