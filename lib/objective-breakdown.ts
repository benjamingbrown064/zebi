import { generateJSONCompletion } from './anthropic';

export interface ObjectiveBreakdown {
  milestones: {
    title: string;
    targetValue: number;
    targetDate: string; // ISO date
    description: string;
  }[];
  projects: {
    name: string;
    description: string;
    priority: number;
    estimatedDuration: string;
    owner: 'AI' | 'Human';
  }[];
  tasks: {
    title: string;
    description: string;
    projectIndex: number;
    priority: number;
    estimatedHours: number;
    assignee: 'AI' | 'Human';
  }[];
  risks: {
    risk: string;
    likelihood: 'high' | 'medium' | 'low';
    impact: 'high' | 'medium' | 'low';
    mitigation: string;
  }[];
}

export interface SpaceContext {
  name: string;
  industry?: string;
  stage?: string;
  revenue?: number;
  positioning?: string;
  teamSize?: string;
  relevantMemories?: string[];
}

export async function generateObjectiveBreakdown(
  objectiveTitle: string,
  targetValue: number,
  unit: string,
  startDate: Date,
  deadline: Date,
  spaceContext?: SpaceContext
): Promise<ObjectiveBreakdown> {
  const daysAvailable = Math.ceil(
    (deadline.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const contextSection = spaceContext
    ? `
Space Context:
- Name: ${spaceContext.name}
- Industry: ${spaceContext.industry || 'Unknown'}
- Stage: ${spaceContext.stage || 'Unknown'}
- Current Revenue: ${spaceContext.revenue ? `£${spaceContext.revenue.toLocaleString()}` : 'Unknown'}
- Resources: ${spaceContext.teamSize || 'Small team (1-3 people)'}
- Competitive Position: ${spaceContext.positioning || 'Unknown'}

${spaceContext.relevantMemories && spaceContext.relevantMemories.length > 0 ? `
Space Memories (relevant context):
${spaceContext.relevantMemories.map(m => `- ${m}`).join('\n')}
` : ''}
`
    : '';

  const prompt = `You are helping break down a business objective into actionable work.

Objective: ${objectiveTitle}
${contextSection}
Timeline: ${startDate.toISOString().split('T')[0]} to ${deadline.toISOString().split('T')[0]} (${daysAvailable} days)
Target: ${targetValue} ${unit}

Generate a comprehensive breakdown with:

1. MILESTONES (3-6 intermediate targets)
   - Each milestone should be ~15-25% of total progress
   - Evenly distributed across timeline
   - Specific, measurable values

2. PROJECTS (2-5 major workstreams)
   - High-level initiatives needed to reach objective
   - Each project should contribute to multiple milestones
   - Clear ownership (AI or Human)
   - Realistic duration estimates

3. TASKS (10-20 initial tasks)
   - Specific, actionable items
   - Distributed across projects
   - Include both execution and analysis tasks
   - Realistic time estimates
   - Mark who should do each task (AI for research/analysis, Human for decisions/implementation)

4. RISK ASSESSMENT
   - What could prevent success?
   - Which dependencies are critical?
   - What assumptions are we making?

Return ONLY valid JSON (no markdown formatting) in this exact structure:
{
  "milestones": [
    {
      "title": "Milestone 1",
      "targetValue": 10000,
      "targetDate": "2026-04-15",
      "description": "Description of what this milestone represents"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Detailed description",
      "priority": 1,
      "estimatedDuration": "4 weeks",
      "owner": "AI"
    }
  ],
  "tasks": [
    {
      "title": "Task Title",
      "description": "Detailed description",
      "projectIndex": 0,
      "priority": 1,
      "estimatedHours": 4,
      "assignee": "AI"
    }
  ],
  "risks": [
    {
      "risk": "Risk description",
      "likelihood": "high",
      "impact": "medium",
      "mitigation": "How to mitigate"
    }
  ]
}`;

  try {
    const breakdown = await generateJSONCompletion<ObjectiveBreakdown>(
      [{ role: 'user', content: prompt }],
      {
        maxTokens: 4096,
        temperature: 0.7,
      }
    );

    // Validate the structure
    if (!breakdown.milestones || !Array.isArray(breakdown.milestones)) {
      throw new Error('Invalid breakdown: missing milestones array');
    }
    if (!breakdown.projects || !Array.isArray(breakdown.projects)) {
      throw new Error('Invalid breakdown: missing projects array');
    }
    if (!breakdown.tasks || !Array.isArray(breakdown.tasks)) {
      throw new Error('Invalid breakdown: missing tasks array');
    }
    if (!breakdown.risks || !Array.isArray(breakdown.risks)) {
      throw new Error('Invalid breakdown: missing risks array');
    }

    return breakdown;
  } catch (err) {
    console.error('Failed to generate objective breakdown:', err);
    throw new Error(
      'Failed to generate objective breakdown: ' +
        (err instanceof Error ? err.message : String(err))
    );
  }
}
