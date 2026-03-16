import { prisma } from '@/lib/prisma';

export interface CompanyMetrics {
  companyId: string;
  companyName: string;
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

export interface CompanyAnalysis {
  metrics: CompanyMetrics;
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
 * Analyze a company's current state across all dimensions
 */
export async function analyzeCompany(
  workspaceId: string,
  companyId: string
): Promise<CompanyAnalysis> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // Fetch company data
  const company = await prisma.company.findUnique({
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

  if (!company) {
    throw new Error(`Company ${companyId} not found`);
  }

  // Calculate task metrics
  const completedTasks = company.tasks.filter(t => t.completedAt);
  const overdueTasks = company.tasks.filter(
    t => !t.completedAt && t.dueAt && new Date(t.dueAt) < new Date()
  );
  const tasksLast7Days = company.tasks.filter(
    t => new Date(t.createdAt) > sevenDaysAgo
  );
  const tasksCompleted7Days = completedTasks.filter(
    t => t.completedAt && new Date(t.completedAt) > sevenDaysAgo
  );
  
  const completionRate = company.tasks.length > 0
    ? (completedTasks.length / company.tasks.length) * 100
    : 0;

  // Calculate objective metrics
  const activeObjectives = company.objectives.filter(
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
  const recentDocuments = company.documents.filter(
    doc => new Date(doc.createdAt) > thirtyDaysAgo
  );

  const metrics: CompanyMetrics = {
    companyId: company.id,
    companyName: company.name,
    industry: company.industry,
    stage: company.stage,
    revenue: company.revenue ? company.revenue.toNumber() : null,
    
    totalTasks: company.tasks.length,
    completedTasks: completedTasks.length,
    overdueTasks: overdueTasks.length,
    completionRate: Math.round(completionRate * 100) / 100,
    tasksLast7Days: tasksLast7Days.length,
    tasksCompleted7Days: tasksCompleted7Days.length,
    
    totalProjects: company.projects.length,
    activeProjects: company.projects.length,
    
    totalObjectives: company.objectives.length,
    activeObjectives: activeObjectives.length,
    onTrackObjectives: onTrackObjectives.length,
    atRiskObjectives: atRiskObjectives.length,
    avgProgress: Math.round(avgProgress * 100) / 100,
    
    totalDocuments: company.documents.length,
    recentDocuments: recentDocuments.length,
    
    totalMemories: company.memories.length,
    totalInsights: company.insights.length,
    unreviewedInsights: company.insights.filter(i => i.status === 'new').length,
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
    activeProjects: company.projects
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
    missionStatement: company.missionStatement,
    targetCustomers: company.targetCustomers,
    competitors: company.competitors,
    differentiators: company.differentiators,
    roadmap: company.roadmap,
  };

  return {
    metrics,
    recentActivity,
    strategicContext,
  };
}

/**
 * Get all active companies for a workspace
 */
export async function getActiveCompanies(workspaceId: string): Promise<string[]> {
  const companies = await prisma.company.findMany({
    where: {
      workspaceId,
      archivedAt: null,
    },
    select: {
      id: true,
    },
  });

  return companies.map(c => c.id);
}
