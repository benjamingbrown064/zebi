import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/workspace'

export const dynamic = 'force-dynamic';

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74';

interface ProposalGoal {
  name: string;
  description: string;
  successCriteria: string;
  targetDate: string | null;
}

interface ProposalObjective {
  title: string;
  priority: 'high' | 'medium' | 'low';
  targetDate: string | null;
}

interface ProposalProject {
  name: string;
  objectiveIndex: number | null;
}

interface ProposalTask {
  title: string;
  projectIndex: number | null;
}

interface Proposal {
  goal: ProposalGoal;
  objectives: ProposalObjective[];
  projects: ProposalProject[];
  tasks: ProposalTask[];
  blockers: string[];
  uncertainties: string[];
}

/**
 * Create goal, objectives, projects, and tasks from proposal
 */
export async function POST(req: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()
    const { sessionId, proposal }: { sessionId: string; proposal: Proposal } = await req.json();

    if (!sessionId || !proposal) {
      return NextResponse.json(
        { error: 'sessionId and proposal required' },
        { status: 400 }
      );
    }

    console.log(`[Voice Coach ${sessionId}] Creating entities for workspace ${workspaceId}`);
    console.log(`[Voice Coach ${sessionId}] Proposal:`, JSON.stringify(proposal, null, 2));

    // Get the default "Inbox" status for tasks
    const inboxStatus = await prisma.status.findFirst({
      where: {
        workspaceId,
        type: 'inbox'
      }
    });

    if (!inboxStatus) {
      throw new Error('Inbox status not found for workspace');
    }

    // Create all entities in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Goal
      // Default to 3 months from now if no target date specified
      const defaultEndDate = new Date();
      defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);
      
      // Build descriptionRich JSON with description and success criteria
      const descriptionRich = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: proposal.goal.description || 'No description provided.' }]
          },
          ...(proposal.goal.successCriteria ? [{
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Success Criteria' }]
          }, {
            type: 'paragraph',
            content: [{ type: 'text', text: proposal.goal.successCriteria }]
          }] : [])
        ]
      };
      
      const goal = await tx.goal.create({
        data: {
          workspaceId,
          name: proposal.goal.name,
          descriptionRich,
          metricType: 'numeric',
          targetValue: 100,
          currentValue: 0,
          unit: '%',
          status: 'active', // CRITICAL: Without this, goals won't show in list
          startDate: new Date(),
          endDate: proposal.goal.targetDate ? new Date(proposal.goal.targetDate) : defaultEndDate,
          createdBy: PLACEHOLDER_USER_ID
        }
      });

      // 2. Create Objectives (linked to goal)
      // Convert priority string to number (high=1, medium=2, low=3)
      const priorityMap = { high: 1, medium: 2, low: 3 };
      
      const objectives = await Promise.all(
        proposal.objectives.map((obj) => {
          const defaultDeadline = new Date();
          defaultDeadline.setMonth(defaultDeadline.getMonth() + 1);
          
          return tx.objective.create({
            data: {
              workspaceId,
              goalId: goal.id,
              title: obj.title,
              description: '',
              objectiveType: 'milestone',
              metricType: 'boolean',
              targetValue: 1,
              currentValue: 0,
              startDate: new Date(),
              deadline: obj.targetDate ? new Date(obj.targetDate) : defaultDeadline,
              priority: priorityMap[obj.priority] || 2,
              createdBy: PLACEHOLDER_USER_ID
            }
          });
        })
      );

      // 3. Create Projects (linked to objectives where specified)
      const projects = await Promise.all(
        proposal.projects.map((proj) => {
          const objectiveId = 
            proj.objectiveIndex !== null && proj.objectiveIndex >= 0 && proj.objectiveIndex < objectives.length
              ? objectives[proj.objectiveIndex].id
              : null;

          return tx.project.create({
            data: {
              workspaceId,
              objectiveId: objectiveId || undefined,
              goalId: goal.id,
              name: proj.name,
              description: ''
            }
          });
        })
      );

      // 4. Create Tasks (linked to projects where specified)
      const tasks = await Promise.all(
        proposal.tasks.map((task) => {
          const projectId =
            task.projectIndex !== null && task.projectIndex >= 0 && task.projectIndex < projects.length
              ? projects[task.projectIndex].id
              : null;

          return tx.task.create({
            data: {
              workspaceId,
              projectId: projectId || undefined,
              title: task.title,
              description: '',
              statusId: inboxStatus.id,
              priority: 2, // Medium priority
              createdBy: PLACEHOLDER_USER_ID
            }
          });
        })
      );

      // 5. Add blockers as notes on the goal (if any)
      if (proposal.blockers.length > 0) {
        // Append blockers to descriptionRich
        const updatedDescriptionRich = {
          ...(goal.descriptionRich as any),
          content: [
            ...((goal.descriptionRich as any)?.content || []),
            {
              type: 'heading',
              attrs: { level: 3 },
              content: [{ type: 'text', text: 'Identified Risks & Blockers' }]
            },
            {
              type: 'bulletList',
              content: proposal.blockers.map(b => ({
                type: 'listItem',
                content: [{
                  type: 'paragraph',
                  content: [{ type: 'text', text: b }]
                }]
              }))
            }
          ]
        };
        
        await tx.goal.update({
          where: { id: goal.id },
          data: {
            descriptionRich: updatedDescriptionRich
          }
        });
      }

      return {
        goal,
        objectives,
        projects,
        tasks
      };
    });

    console.log(`[Voice Coach ${sessionId}] Successfully created: 1 goal, ${result.objectives.length} objectives, ${result.projects.length} projects, ${result.tasks.length} tasks`);
    console.log(`[Voice Coach ${sessionId}] Goal details:`, {
      id: result.goal.id,
      name: result.goal.name,
      status: result.goal.status,
      workspaceId: result.goal.workspaceId
    });

    return NextResponse.json({
      success: true,
      created: {
        goalId: result.goal.id,
        workspaceId: workspaceId,
        objectiveIds: result.objectives.map(o => o.id),
        projectIds: result.projects.map(p => p.id),
        taskIds: result.tasks.map(t => t.id)
      },
      summary: {
        goals: 1,
        objectives: result.objectives.length,
        projects: result.projects.length,
        tasks: result.tasks.length
      }
    });
  } catch (error) {
    console.error('Voice coach creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create entities' },
      { status: 500 }
    );
  }
}
