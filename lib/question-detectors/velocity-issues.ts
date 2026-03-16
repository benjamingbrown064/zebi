import { prisma } from '@/lib/prisma';

export interface VelocityIssuePattern {
  companyId?: string;
  companyName?: string;
  projectId?: string;
  projectName?: string;
  scope: 'workspace' | 'company' | 'project';
  currentVelocity: number; // tasks/week
  previousVelocity: number; // tasks/week
  dropPercent: number;
  weekRange: string;
}

/**
 * Detect velocity drops >30% in task completion rate
 */
export async function detectVelocityIssues(
  workspaceId: string
): Promise<VelocityIssuePattern[]> {
  const issues: VelocityIssuePattern[] = [];

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(today.getDate() - 14);

  // ==================== WORKSPACE LEVEL ====================
  
  const thisWeekCompletedWorkspace = await prisma.task.count({
    where: {
      workspaceId,
      completedAt: {
        gte: sevenDaysAgo,
        lte: today,
      },
    },
  });

  const lastWeekCompletedWorkspace = await prisma.task.count({
    where: {
      workspaceId,
      completedAt: {
        gte: fourteenDaysAgo,
        lt: sevenDaysAgo,
      },
    },
  });

  if (lastWeekCompletedWorkspace > 0) {
    const dropPercent =
      ((lastWeekCompletedWorkspace - thisWeekCompletedWorkspace) / lastWeekCompletedWorkspace) *
      100;

    if (dropPercent > 30) {
      issues.push({
        scope: 'workspace',
        currentVelocity: thisWeekCompletedWorkspace,
        previousVelocity: lastWeekCompletedWorkspace,
        dropPercent,
        weekRange: `${sevenDaysAgo.toLocaleDateString()} - ${today.toLocaleDateString()}`,
      });
    }
  }

  // ==================== COMPANY LEVEL ====================
  
  const companies = await prisma.company.findMany({
    where: {
      workspaceId,
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  for (const company of companies) {
    const thisWeekCompletedCompany = await prisma.task.count({
      where: {
        companyId: company.id,
        completedAt: {
          gte: sevenDaysAgo,
          lte: today,
        },
      },
    });

    const lastWeekCompletedCompany = await prisma.task.count({
      where: {
        companyId: company.id,
        completedAt: {
          gte: fourteenDaysAgo,
          lt: sevenDaysAgo,
        },
      },
    });

    if (lastWeekCompletedCompany > 0) {
      const dropPercent =
        ((lastWeekCompletedCompany - thisWeekCompletedCompany) / lastWeekCompletedCompany) *
        100;

      if (dropPercent > 30) {
        issues.push({
          scope: 'company',
          companyId: company.id,
          companyName: company.name,
          currentVelocity: thisWeekCompletedCompany,
          previousVelocity: lastWeekCompletedCompany,
          dropPercent,
          weekRange: `${sevenDaysAgo.toLocaleDateString()} - ${today.toLocaleDateString()}`,
        });
      }
    }
  }

  // ==================== PROJECT LEVEL ====================
  
  const projects = await prisma.project.findMany({
    where: {
      workspaceId,
      archivedAt: null,
    },
    include: {
      company: {
        select: {
          name: true,
        },
      },
    },
  });

  for (const project of projects) {
    const thisWeekCompletedProject = await prisma.task.count({
      where: {
        projectId: project.id,
        completedAt: {
          gte: sevenDaysAgo,
          lte: today,
        },
      },
    });

    const lastWeekCompletedProject = await prisma.task.count({
      where: {
        projectId: project.id,
        completedAt: {
          gte: fourteenDaysAgo,
          lt: sevenDaysAgo,
        },
      },
    });

    if (lastWeekCompletedProject > 0) {
      const dropPercent =
        ((lastWeekCompletedProject - thisWeekCompletedProject) / lastWeekCompletedProject) *
        100;

      if (dropPercent > 30 && lastWeekCompletedProject >= 2) {
        issues.push({
          scope: 'project',
          projectId: project.id,
          projectName: project.name,
          companyName: project.company?.name,
          currentVelocity: thisWeekCompletedProject,
          previousVelocity: lastWeekCompletedProject,
          dropPercent,
          weekRange: `${sevenDaysAgo.toLocaleDateString()} - ${today.toLocaleDateString()}`,
        });
      }
    }
  }

  // Sort by drop percentage (biggest drops first)
  return issues.sort((a, b) => b.dropPercent - a.dropPercent);
}
