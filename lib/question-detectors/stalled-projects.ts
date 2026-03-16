import { prisma } from '@/lib/prisma';

export interface StalledProjectPattern {
  projectId: string;
  projectName: string;
  lastActivity: Date;
  daysStalled: number;
  taskCount: number;
  companyId?: string;
  companyName?: string;
}

/**
 * Detect projects with no activity in 14+ days
 */
export async function detectStalledProjects(
  workspaceId: string
): Promise<StalledProjectPattern[]> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // Get active projects
  const projects = await prisma.project.findMany({
    where: {
      workspaceId,
      archivedAt: null,
    },
    include: {
      tasks: {
        where: {
          archivedAt: null,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 1,
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const stalledProjects: StalledProjectPattern[] = [];

  for (const project of projects) {
    // Get all tasks for this project to count them
    const taskCount = await prisma.task.count({
      where: {
        projectId: project.id,
        archivedAt: null,
      },
    });

    // Skip projects with no tasks
    if (taskCount === 0) continue;

    const lastTask = project.tasks[0];
    const lastActivity = lastTask?.updatedAt || project.updatedAt;

    // Check if stalled
    if (lastActivity < fourteenDaysAgo) {
      const daysStalled = Math.floor(
        (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );

      stalledProjects.push({
        projectId: project.id,
        projectName: project.name,
        lastActivity,
        daysStalled,
        taskCount,
        companyId: project.companyId || undefined,
        companyName: project.company?.name || undefined,
      });
    }
  }

  // Sort by days stalled (most stalled first)
  return stalledProjects.sort((a, b) => b.daysStalled - a.daysStalled);
}
