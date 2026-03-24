import { analyzeSpace, getActiveSpaces, SpaceAnalysis } from './insight-analyzers/space-analyzer';
import { detectPatterns, prioritizePatterns, DetectedPattern } from './insight-analyzers/pattern-detector';
import { generateJSONCompletion } from './anthropic';
import { prisma } from './prisma';

export interface GeneratedInsight {
  type: 'opportunity' | 'risk' | 'strategy' | 'optimization';
  title: string;
  summary: string;
  detailedAnalysis: {
    context: string;
    findings: string[];
    implications: string[];
    dataPoints: Record<string, any>;
  };
  suggestedActions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
  }>;
  priority: number; // 1-5, 5 being highest
}

interface AIInsightResponse {
  insights: GeneratedInsight[];
}

/**
 * Generate AI insights for a single space
 */
export async function generateSpaceInsights(
  workspaceId: string,
  companyId: string
): Promise<GeneratedInsight[]> {
  // Step 1: Analyze space
  const analysis = await analyzeSpace(workspaceId, companyId);
  
  // Step 2: Detect patterns
  const patterns = detectPatterns(analysis);
  const prioritizedPatterns = prioritizePatterns(patterns);

  // Step 3: Use Claude to generate insights
  const insights = await generateInsightsWithAI(analysis, prioritizedPatterns);

  // Step 4: Store insights in database
  await storeInsights(workspaceId, companyId, insights);

  return insights;
}

/**
 * Generate insights for all active spaces in a workspace
 */
export async function generateWorkspaceInsights(workspaceId: string): Promise<{
  companyId: string;
  spaceName: string;
  insightCount: number;
  insights: GeneratedInsight[];
}[]> {
  const companyIds = await getActiveSpaces(workspaceId);
  const results = [];

  for (const companyId of companyIds) {
    try {
      const insights = await generateSpaceInsights(workspaceId, companyId);
      const space = await prisma.space.findUnique({
        where: { id: companyId },
        select: { name: true },
      });

      results.push({
        companyId,
        spaceName: space?.name || 'Unknown',
        insightCount: insights.length,
        insights,
      });
    } catch (error) {
      console.error(`Failed to generate insights for space ${companyId}:`, error);
      // Continue with other spaces
    }
  }

  return results;
}

/**
 * Use Claude to generate strategic insights based on space analysis and patterns
 */
async function generateInsightsWithAI(
  analysis: SpaceAnalysis,
  patterns: DetectedPattern[]
): Promise<GeneratedInsight[]> {
  const prompt = buildInsightPrompt(analysis, patterns);

  try {
    const response = await generateJSONCompletion<AIInsightResponse>(
      [
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        model: 'claude-sonnet-4-20250514',
        maxTokens: 8000,
        temperature: 0.7,
      }
    );

    return response.insights || [];
  } catch (error) {
    console.error('Failed to generate insights with AI:', error);
    // Return fallback insights based on patterns
    return generateFallbackInsights(patterns);
  }
}

/**
 * Build the prompt for Claude to generate insights
 */
function buildInsightPrompt(
  analysis: SpaceAnalysis,
  patterns: DetectedPattern[]
): string {
  const { metrics, recentActivity, strategicContext } = analysis;

  return `You are a strategic business analyst for Zebi. Analyze the following space data and generate 2-4 strategic insights.

**Space:** ${metrics.spaceName}
**Industry:** ${metrics.industry || 'Not specified'}
**Stage:** ${metrics.stage || 'Not specified'}
**Revenue:** ${metrics.revenue ? `$${metrics.revenue.toLocaleString()}` : 'Not specified'}

**METRICS:**
- Tasks: ${metrics.totalTasks} total, ${metrics.completedTasks} completed (${metrics.completionRate}% completion rate)
- Last 7 days: ${metrics.tasksCompleted7Days} tasks completed
- Overdue: ${metrics.overdueTasks} tasks
- Projects: ${metrics.activeProjects} active
- Objectives: ${metrics.activeObjectives} active, ${metrics.onTrackObjectives} on track, ${metrics.atRiskObjectives} at risk
- Average objective progress: ${metrics.avgProgress}%
- Documents: ${metrics.totalDocuments} total, ${metrics.recentDocuments} in last 30 days

**STRATEGIC CONTEXT:**
${strategicContext.missionStatement ? `Mission: ${strategicContext.missionStatement}` : ''}
${strategicContext.targetCustomers ? `Target Customers: ${strategicContext.targetCustomers}` : ''}
${strategicContext.competitors ? `Competitors: ${JSON.stringify(strategicContext.competitors)}` : ''}
${strategicContext.differentiators ? `Differentiators: ${JSON.stringify(strategicContext.differentiators)}` : ''}

**DETECTED PATTERNS:**
${patterns.map(p => `- [${p.type.toUpperCase()} | ${p.severity}] ${p.title}: ${p.description}`).join('\n')}

**ACTIVE OBJECTIVES:**
${recentActivity.objectives.map(obj => `- ${obj.title} (${obj.progressPercent}% complete, deadline: ${obj.deadline})`).join('\n')}

**YOUR TASK:**
Generate 2-4 strategic insights. Each insight should be one of these types:
1. **opportunity**: Growth opportunities, new markets, partnerships, product expansions
2. **risk**: Potential threats, bottlenecks, resource constraints, timeline risks
3. **strategy**: Positioning, competitive advantages, market timing, product strategy
4. **optimization**: Process improvements, efficiency gains, automation opportunities

For each insight:
- Be specific and actionable
- Reference actual data points from the metrics
- Provide 2-4 concrete suggested actions
- Prioritize based on impact and urgency

Return ONLY valid JSON in this exact format:
{
  "insights": [
    {
      "type": "opportunity" | "risk" | "strategy" | "optimization",
      "title": "Short, punchy title (5-8 words)",
      "summary": "One sentence summary of the insight",
      "detailedAnalysis": {
        "context": "Background and why this matters",
        "findings": ["Key finding 1", "Key finding 2", "Key finding 3"],
        "implications": ["Implication 1", "Implication 2"],
        "dataPoints": {
          "metric1": value1,
          "metric2": value2
        }
      },
      "suggestedActions": [
        {
          "action": "Specific action to take",
          "priority": "high" | "medium" | "low",
          "effort": "low" | "medium" | "high",
          "impact": "low" | "medium" | "high"
        }
      ],
      "priority": 1-5 (5 being highest)
    }
  ]
}

Focus on insights that are:
- Actionable (not just observations)
- Specific to this space's situation
- Based on the actual data provided
- Strategic (not tactical minutiae)`;
}

/**
 * Generate fallback insights based on patterns (when AI fails)
 */
function generateFallbackInsights(patterns: DetectedPattern[]): GeneratedInsight[] {
  const insights: GeneratedInsight[] = [];

  // Group patterns by category
  const riskPatterns = patterns.filter(p => p.type === 'negative');
  const opportunityPatterns = patterns.filter(p => p.type === 'positive');

  // Generate risk insight if there are negative patterns
  if (riskPatterns.length > 0) {
    const topRisk = riskPatterns[0];
    insights.push({
      type: 'risk',
      title: topRisk.title,
      summary: topRisk.description,
      detailedAnalysis: {
        context: `Detected ${riskPatterns.length} risk factor(s) in current operations.`,
        findings: riskPatterns.map(p => p.description),
        implications: ['May impact timeline and delivery', 'Requires immediate attention'],
        dataPoints: topRisk.metrics || {},
      },
      suggestedActions: [
        {
          action: 'Review and address the identified issues',
          priority: topRisk.severity === 'high' ? 'high' : 'medium',
          effort: 'medium',
          impact: 'high',
        },
      ],
      priority: topRisk.severity === 'high' ? 5 : 3,
    });
  }

  // Generate opportunity insight if there are positive patterns
  if (opportunityPatterns.length > 0) {
    const topOpportunity = opportunityPatterns[0];
    insights.push({
      type: 'opportunity',
      title: topOpportunity.title,
      summary: topOpportunity.description,
      detailedAnalysis: {
        context: `Identified ${opportunityPatterns.length} positive trend(s) in current operations.`,
        findings: opportunityPatterns.map(p => p.description),
        implications: ['Potential to accelerate growth', 'Build on existing momentum'],
        dataPoints: topOpportunity.metrics || {},
      },
      suggestedActions: [
        {
          action: 'Capitalize on this momentum with new initiatives',
          priority: 'medium',
          effort: 'medium',
          impact: 'high',
        },
      ],
      priority: 3,
    });
  }

  return insights;
}

/**
 * Store insights in the database
 */
async function storeInsights(
  workspaceId: string,
  companyId: string,
  insights: GeneratedInsight[]
): Promise<void> {
  for (const insight of insights) {
    await prisma.aIInsight.create({
      data: {
        workspaceId,
        companyId,
        insightType: insight.type,
        title: insight.title,
        summary: insight.summary,
        detailedAnalysis: insight.detailedAnalysis,
        suggestedActions: insight.suggestedActions,
        priority: insight.priority,
        status: 'new',
        reviewedBy: null,
        reviewedAt: null,
      },
    });
  }
}
