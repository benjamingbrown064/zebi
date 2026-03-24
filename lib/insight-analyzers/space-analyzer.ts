import { prisma } from '@/lib/prisma';

export interface SpaceMetrics {
  companyId: string;
  spaceName: string;
  industry: string | null;
  stage: string | null;
  revenue: number | null;
  
  // Task metrics
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  tasksLast7Days: number;
  tasksCompleted7Days: number;
  
  // Project metrics
  totalProjects: number;
  activeProjects: number;
  
  // Objective metrics
  totalObjectives: number;
  activeObjectives: number;
  onTrackObjectives: number;
  atRiskObjectives: number;
  avgProgress: number;
  
  // Document metrics
  totalDocuments: number;
  recentDocuments: number;
  
  // Memory & insights
  totalMemories: number;
  totalInsights: number;
  unreviewedInsights: number;
}

export interface SpaceAnalysis {
  metrics: SpaceMetrics;
  recentActivity: {
    completedTasks: Array<{
      id: string;
      title: string;
      completedAt: Date;
    }>;
    activeProjects: Array<{
      id: string;
      name: string;
      taskCount: number;
    }>;
    objectives: Array<{
      id: string;
      title: string;
      progressPercent: number;
      deadline: Date;
      status: string;
    }>;
  };
  strategicContext: {
    missionStatement: string | null;
    targetCustomers: string | null;
    competitors: any;
    differentiators: any;
    roadmap: any;
  };
}

/**
 * Analyze a space's current state across all dimensions
 */
export async function analyzeSpace(
  workspaceId: string,
  companyId: string
): Promise<SpaceAnalysis> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // Fetch space data
  const space = await prisma.space.findUnique({
    where: { id: companyId },
    include: {
      tasks: {
        select: {
          id: true,
          title: true,
          completedAt: true,
          dueAt: true,
          createdAt: true,
        },
      },
      projects: {
        where: { archivedAt: null },
        select: {
          id: true,
          name: true,
          _count: {
            select: { tasks: true },
          },
        },
      },
      objectives: {
        select: {
          id: true,
          title: true,
          status: true,
          progressPercent: true,
          deadline: true,
          targetValue: true,
          currentValue: true,
        },
      },
      documents: {
        select: {
          id: true,
          title: true,
          documentType: true,
          createdAt: true,
        },
      },
      memories: {
        select: {
          id: true,
        },
      },
      insights: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!space) {
    throw new Error(`Space ${companyId} not found`);
  }

  // Calculate task metrics
  const completedTasks = space.tasks.filter(t => t.completedAt);
  const overdueTasks = space.tasks.filter(
    t => !t.completedAt && t.dueAt && new Date(t.dueAt) < new Date()
  );
  const tasksLast7Days = space.tasks.filter(
    t => new Date(t.createdAt) > sevenDaysAgo
  );
  const tasksCompleted7Days = completedTasks.filter(
    t => t.completedAt && new Date(t.completedAt) > sevenDaysAgo
  );
  
  const completionRate = space.tasks.length > 0
    ? (completedTasks.length / space.tasks.length) * 100
    : 0;

  // Calculate objective metrics
  const activeObjectives = space.objectives.filter(
    obj => obj.status === 'active'
  );
  const onTrackObjectives = activeObjectives.filter(
    obj => obj.progressPercent.toNumber() >= 70
  );
  const atRiskObjectives = activeObjectives.filter(
    obj => obj.progressPercent.toNumber() < 50 && 
           new Date(obj.deadline) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );
  const avgProgress = activeObjectives.length > 0
    ? activeObjectives.reduce((sum, obj) => sum + obj.progressPercent.toNumber(), 0) / activeObjectives.length
    : 0;

  // Recent documents (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentDocuments = space.documents.filter(
    doc => new Date(doc.createdAt) > thirtyDaysAgo
  );

  const metrics: SpaceMetrics = {
    companyId: space.id,
    spaceName: space.name,
    industry: space.industry,
    stage: space.stage,
    revenue: space.revenue ? space.revenue.toNumber() : null,
    
    totalTasks: space.tasks.length,
    completedTasks: completedTasks.length,
    overdueTasks: overdueTasks.length,
    completionRate: Math.round(completionRate * 100) / 100,
    tasksLast7Days: tasksLast7Days.length,
    tasksCompleted7Days: tasksCompleted7Days.length,
    
    totalProjects: space.projects.length,
    activeProjects: space.projects.length,
    
    totalObjectives: space.objectives.length,
    activeObjectives: activeObjectives.length,
    onTrackObjectives: onTrackObjectives.length,
    atRiskObjectives: atRiskObjectives.length,
    avgProgress: Math.round(avgProgress * 100) / 100,
    
    totalDocuments: space.documents.length,
    recentDocuments: recentDocuments.length,
    
    totalMemories: space.memories.length,
    totalInsights: space.insights.length,
    unreviewedInsights: space.insights.filter(i => i.status === 'new').length,
  };

  // Build recent activity summary
  const recentActivity = {
    completedTasks: tasksCompleted7Days
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        title: t.title,
        completedAt: t.completedAt!,
      })),
    activeProjects: space.projects
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        taskCount: p._count.tasks,
      })),
    objectives: activeObjectives
      .slice(0, 5)
      .map(obj => ({
        id: obj.id,
        title: obj.title,
        progressPercent: obj.progressPercent.toNumber(),
        deadline: obj.deadline,
        status: obj.status,
      })),
  };

  // Build strategic context
  const strategicContext = {
    missionStatement: space.missionStatement,
    targetCustomers: space.targetCustomers,
    competitors: space.competitors,
    differentiators: space.differentiators,
    roadmap: space.roadmap,
  };

  return {
    metrics,
    recentActivity,
    strategicContext,
  };
}

/**
 * Get all active spaces for a workspace
 */
export async function getActiveSpaces(workspaceId: string): Promise<string[]> {
  const spaces = await prisma.space.findMany({
    where: {
      workspaceId,
      archivedAt: null,
    },
    select: {
      id: true,
    },
  });

  return spaces.map(c => c.id);
}
