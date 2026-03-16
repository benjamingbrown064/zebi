import { generateJSONCompletion } from './anthropic';
import { detectStalledProjects, StalledProjectPattern } from './question-detectors/stalled-projects';
import { detectRevenueDrops, RevenueDropPattern } from './question-detectors/revenue-drops';
import { detectVelocityIssues, VelocityIssuePattern } from './question-detectors/velocity-issues';
import { detectOpportunities, OpportunityPattern } from './question-detectors/opportunity-detection';
import { prisma } from './prisma';

export interface ProactiveQuestion {
  id: string;
  type: 'stalled_project' | 'revenue_drop' | 'velocity_issue' | 'opportunity';
  priority: 'low' | 'medium' | 'high';
  question: string;
  options: QuestionOption[];
  context: Record<string, any>;
  timestamp: string;
}

export interface QuestionOption {
  id: string;
  label: string;
  action: string;
}

export interface QuestionGenerationResult {
  success: boolean;
  questions: ProactiveQuestion[];
  count: number;
  detectedPatterns: {
    stalledProjects: number;
    revenueDrops: number;
    velocityIssues: number;
    opportunities: number;
  };
}

/**
 * Check if we've asked a similar question recently (within 7 days)
 */
async function hasAskedRecently(
  workspaceId: string,
  type: string,
  contextKey: string
): Promise<boolean> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Look for similar questions in activity logs
  const recentQuestion = await prisma.activityLog.findFirst({
    where: {
      workspaceId,
      eventType: 'ai.proactive_question.asked',
      createdAt: {
        gte: sevenDaysAgo,
      },
      eventPayload: {
        path: ['type'],
        equals: type,
      },
    },
  });

  if (!recentQuestion) return false;

  // Check if context matches (same project/company/etc)
  const payload = recentQuestion.eventPayload as any;
  return payload.context?.contextKey === contextKey;
}

/**
 * Generate a proactive question from a stalled project pattern
 */
async function generateStalledProjectQuestion(
  workspaceId: string,
  pattern: StalledProjectPattern
): Promise<ProactiveQuestion | null> {
  const contextKey = `stalled_project:${pattern.projectId}`;
  
  if (await hasAskedRecently(workspaceId, 'stalled_project', contextKey)) {
    return null;
  }

  const prompt = `You are an AI assistant helping manage projects. A project has stalled.

Project: ${pattern.projectName}
${pattern.companyName ? `Company: ${pattern.companyName}` : ''}
Last Activity: ${pattern.lastActivity.toLocaleDateString()}
Days Stalled: ${pattern.daysStalled}
Active Tasks: ${pattern.taskCount}

Generate a concise question (one sentence) and 3-4 actionable options the user can choose from. The options should be practical next steps.

Respond in JSON format:
{
  "question": "Your question here",
  "options": [
    { "id": "pause", "label": "Pause it", "action": "pause_project" },
    { "id": "checkin", "label": "Create check-in task", "action": "create_task" }
  ]
}`;

  try {
    const response = await generateJSONCompletion<{
      question: string;
      options: QuestionOption[];
    }>(
      [{ role: 'user', content: prompt }],
      { temperature: 0.7, maxTokens: 500 }
    );

    return {
      id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'stalled_project',
      priority: pattern.daysStalled > 30 ? 'high' : 'medium',
      question: response.question,
      options: response.options,
      context: {
        projectId: pattern.projectId,
        projectName: pattern.projectName,
        companyId: pattern.companyId,
        companyName: pattern.companyName,
        lastActivity: pattern.lastActivity.toISOString(),
        daysStalled: pattern.daysStalled,
        taskCount: pattern.taskCount,
        contextKey,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to generate stalled project question:', error);
    return null;
  }
}

/**
 * Generate a proactive question from a revenue drop pattern
 */
async function generateRevenueDropQuestion(
  workspaceId: string,
  pattern: RevenueDropPattern
): Promise<ProactiveQuestion | null> {
  const contextKey = `revenue_drop:${pattern.companyId}`;
  
  if (await hasAskedRecently(workspaceId, 'revenue_drop', contextKey)) {
    return null;
  }

  const prompt = `You are an AI assistant helping manage company performance. A company's revenue has dropped significantly.

Company: ${pattern.companyName}
Current Revenue: $${pattern.currentRevenue.toFixed(2)}
Previous Revenue: $${pattern.previousRevenue.toFixed(2)}
Drop: ${pattern.dropPercent.toFixed(1)}%
Period: ${pattern.weekRange}

Generate a concise question (one sentence) and 3-4 actionable options to investigate or address this drop.

Respond in JSON format:
{
  "question": "Your question here",
  "options": [
    { "id": "investigate", "label": "Investigate cause", "action": "create_investigation_task" },
    { "id": "review", "label": "Review metrics", "action": "review_metrics" }
  ]
}`;

  try {
    const response = await generateJSONCompletion<{
      question: string;
      options: QuestionOption[];
    }>(
      [{ role: 'user', content: prompt }],
      { temperature: 0.7, maxTokens: 500 }
    );

    return {
      id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'revenue_drop',
      priority: pattern.dropPercent > 25 ? 'high' : 'medium',
      question: response.question,
      options: response.options,
      context: {
        companyId: pattern.companyId,
        companyName: pattern.companyName,
        currentRevenue: pattern.currentRevenue,
        previousRevenue: pattern.previousRevenue,
        dropPercent: pattern.dropPercent,
        weekRange: pattern.weekRange,
        contextKey,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to generate revenue drop question:', error);
    return null;
  }
}

/**
 * Generate a proactive question from a velocity issue pattern
 */
async function generateVelocityIssueQuestion(
  workspaceId: string,
  pattern: VelocityIssuePattern
): Promise<ProactiveQuestion | null> {
  const contextKey = `velocity_issue:${pattern.scope}:${pattern.companyId || pattern.projectId || 'workspace'}`;
  
  if (await hasAskedRecently(workspaceId, 'velocity_issue', contextKey)) {
    return null;
  }

  const scopeLabel = 
    pattern.scope === 'workspace' ? 'Workspace' :
    pattern.scope === 'company' ? `Company: ${pattern.companyName}` :
    `Project: ${pattern.projectName}`;

  const prompt = `You are an AI assistant helping manage team velocity. Task completion has dropped significantly.

Scope: ${scopeLabel}
Previous Velocity: ${pattern.previousVelocity} tasks/week
Current Velocity: ${pattern.currentVelocity} tasks/week
Drop: ${pattern.dropPercent.toFixed(1)}%
Period: ${pattern.weekRange}

Generate a concise question (one sentence) and 3-4 actionable options to investigate or address this velocity drop.

Respond in JSON format:
{
  "question": "Your question here",
  "options": [
    { "id": "blockers", "label": "Check for blockers", "action": "identify_blockers" },
    { "id": "reprioritize", "label": "Reprioritize tasks", "action": "reprioritize" }
  ]
}`;

  try {
    const response = await generateJSONCompletion<{
      question: string;
      options: QuestionOption[];
    }>(
      [{ role: 'user', content: prompt }],
      { temperature: 0.7, maxTokens: 500 }
    );

    return {
      id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'velocity_issue',
      priority: pattern.dropPercent > 50 ? 'high' : 'medium',
      question: response.question,
      options: response.options,
      context: {
        scope: pattern.scope,
        companyId: pattern.companyId,
        companyName: pattern.companyName,
        projectId: pattern.projectId,
        projectName: pattern.projectName,
        currentVelocity: pattern.currentVelocity,
        previousVelocity: pattern.previousVelocity,
        dropPercent: pattern.dropPercent,
        weekRange: pattern.weekRange,
        contextKey,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to generate velocity issue question:', error);
    return null;
  }
}

/**
 * Generate a proactive question from an opportunity pattern
 */
async function generateOpportunityQuestion(
  workspaceId: string,
  pattern: OpportunityPattern
): Promise<ProactiveQuestion | null> {
  const contextKey = `opportunity:${pattern.opportunityType}:${pattern.suggestedAction}`;
  
  if (await hasAskedRecently(workspaceId, 'opportunity', contextKey)) {
    return null;
  }

  const prompt = `You are an AI assistant helping identify opportunities. Multiple signals suggest a potential action.

Opportunity: ${pattern.title}
Type: ${pattern.opportunityType}
Description: ${pattern.description}
Suggested Action: ${pattern.suggestedAction}
Confidence: ${pattern.confidence}%
Related Insights: ${pattern.relatedInsightIds.length}

Generate a concise question (one sentence) and 3-4 actionable options to capitalize on this opportunity.

Respond in JSON format:
{
  "question": "Your question here",
  "options": [
    { "id": "proceed", "label": "Take action now", "action": "proceed" },
    { "id": "review", "label": "Review insights", "action": "review_insights" }
  ]
}`;

  try {
    const response = await generateJSONCompletion<{
      question: string;
      options: QuestionOption[];
    }>(
      [{ role: 'user', content: prompt }],
      { temperature: 0.7, maxTokens: 500 }
    );

    return {
      id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'opportunity',
      priority: pattern.confidence > 80 ? 'high' : pattern.confidence > 60 ? 'medium' : 'low',
      question: response.question,
      options: response.options,
      context: {
        opportunityType: pattern.opportunityType,
        title: pattern.title,
        description: pattern.description,
        suggestedAction: pattern.suggestedAction,
        confidence: pattern.confidence,
        relatedInsightIds: pattern.relatedInsightIds,
        contextData: pattern.context,
        contextKey,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to generate opportunity question:', error);
    return null;
  }
}

/**
 * Main function: Generate proactive questions for a workspace
 * Returns 1-2 questions max to avoid overwhelming the user
 */
export async function generateProactiveQuestions(
  workspaceId: string
): Promise<QuestionGenerationResult> {
  console.log(`Generating proactive questions for workspace ${workspaceId}...`);

  // Detect all patterns
  const [stalledProjects, revenueDrops, velocityIssues, opportunities] = await Promise.all([
    detectStalledProjects(workspaceId),
    detectRevenueDrops(workspaceId),
    detectVelocityIssues(workspaceId),
    detectOpportunities(workspaceId),
  ]);

  console.log('Detected patterns:', {
    stalledProjects: stalledProjects.length,
    revenueDrops: revenueDrops.length,
    velocityIssues: velocityIssues.length,
    opportunities: opportunities.length,
  });

  // Collect candidate questions
  const candidateQuestions: ProactiveQuestion[] = [];

  // Priority order: revenue drops > velocity issues > stalled projects > opportunities
  
  // Revenue drops (take top 1)
  if (revenueDrops.length > 0) {
    const question = await generateRevenueDropQuestion(workspaceId, revenueDrops[0]);
    if (question) candidateQuestions.push(question);
  }

  // Velocity issues (take top 1)
  if (velocityIssues.length > 0 && candidateQuestions.length < 2) {
    const question = await generateVelocityIssueQuestion(workspaceId, velocityIssues[0]);
    if (question) candidateQuestions.push(question);
  }

  // Stalled projects (take top 1)
  if (stalledProjects.length > 0 && candidateQuestions.length < 2) {
    const question = await generateStalledProjectQuestion(workspaceId, stalledProjects[0]);
    if (question) candidateQuestions.push(question);
  }

  // Opportunities (take top 1)
  if (opportunities.length > 0 && candidateQuestions.length < 2) {
    const question = await generateOpportunityQuestion(workspaceId, opportunities[0]);
    if (question) candidateQuestions.push(question);
  }

  // Limit to 2 questions max
  const selectedQuestions = candidateQuestions.slice(0, 2);

  // Log asked questions
  for (const question of selectedQuestions) {
    try {
      await prisma.activityLog.create({
        data: {
          workspaceId,
          eventType: 'ai.proactive_question.asked',
          eventPayload: {
            questionId: question.id,
            type: question.type,
            priority: question.priority,
            question: question.question,
            context: question.context,
          },
          createdBy: '00000000-0000-0000-0000-000000000000', // System user
          aiAgent: 'proactive-questions',
        },
      });
    } catch (error) {
      console.error('Failed to log question:', error);
    }
  }

  return {
    success: true,
    questions: selectedQuestions,
    count: selectedQuestions.length,
    detectedPatterns: {
      stalledProjects: stalledProjects.length,
      revenueDrops: revenueDrops.length,
      velocityIssues: velocityIssues.length,
      opportunities: opportunities.length,
    },
  };
}
