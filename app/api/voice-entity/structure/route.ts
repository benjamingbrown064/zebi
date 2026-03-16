import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

type EntityType = 'company' | 'objective' | 'project';

interface CompanyProposal {
  company: {
    name: string;
    industry: string;
    stage?: string;
    businessModel?: string;
    description: string;
  };
  objectives?: Array<{
    title: string;
    description?: string;
    priority: 'high' | 'medium' | 'low';
    deadline?: string | null;
  }>;
}

interface ObjectiveProposal {
  objective: {
    title: string;
    description: string;
    objectiveType: 'milestone' | 'outcome' | 'metric' | 'kpi';
    priority: 'high' | 'medium' | 'low';
    deadline: string | null;
    targetValue?: number;
    unit?: string;
  };
  projects?: Array<{
    name: string;
    description?: string;
  }>;
  tasks?: Array<{
    title: string;
    projectIndex?: number | null;
  }>;
}

interface ProjectProposal {
  project: {
    name: string;
    description: string;
    stage?: string;
    priority: 'high' | 'medium' | 'low';
    deadline?: string | null;
  };
  tasks?: Array<{
    title: string;
    description?: string;
    priority?: 'high' | 'medium' | 'low';
  }>;
}

const ENTITY_PROMPTS: Record<EntityType, string> = {
  company: `You are extracting company information from a voice conversation.

Extract:

Company:
- name: Company name (clear and concise)
- industry: Industry sector (e.g., "SaaS", "E-commerce", "Healthcare")
- stage: Business stage (e.g., "startup", "growth", "enterprise")
- businessModel: Business model (e.g., "B2B", "B2C", "Marketplace")
- description: 2-3 sentences about the company

Objectives (0-3):
- title: Strategic objective
- description: Details if provided
- priority: "high" | "medium" | "low"
- deadline: YYYY-MM-DD or null

Rules:
- Be specific and clear
- Convert relative dates to absolute (use current date: ${new Date().toISOString().split('T')[0]})
- Extract only information explicitly mentioned
- Default stage to "startup" if unclear

Return ONLY valid JSON:
{
  "company": { "name": "...", "industry": "...", "stage": "...", "businessModel": "...", "description": "..." },
  "objectives": [{ "title": "...", "description": "...", "priority": "medium", "deadline": null }]
}`,

  objective: `You are extracting objective information from a voice conversation.

Extract:

Objective:
- title: Clear, concise objective title (max 80 chars)
- description: 2-3 sentences explaining the objective
- objectiveType: "milestone" | "outcome" | "metric" | "kpi"
  * milestone: One-time achievement or completion
  * outcome: Desired end state or result
  * metric: Ongoing measurement to improve
  * kpi: Key business metric to track
- priority: "high" | "medium" | "low"
- deadline: YYYY-MM-DD format (or null if not specified)
- targetValue: Numeric target if this is a metric (optional)
- unit: Unit of measurement if applicable (e.g., "%", "$", "users")

Projects (0-3):
- name: Project name to achieve this objective
- description: Brief description

Tasks (0-10):
- title: Specific, actionable task
- projectIndex: Which project does this belong to? (0-based index or null)

Rules:
- Be specific and actionable
- Convert relative dates to absolute (use current date: ${new Date().toISOString().split('T')[0]})
- Choose objectiveType based on context
- Extract concrete next steps as tasks

Return ONLY valid JSON:
{
  "objective": { "title": "...", "description": "...", "objectiveType": "milestone", "priority": "medium", "deadline": null, "targetValue": 100, "unit": "%" },
  "projects": [{ "name": "...", "description": "..." }],
  "tasks": [{ "title": "...", "projectIndex": 0 }]
}`,

  project: `You are extracting project information from a voice conversation.

Extract:

Project:
- name: Clear project name (max 60 chars)
- description: 2-3 sentences about the project scope
- stage: Project stage (e.g., "planning", "in-progress", "blocked", "completed")
- priority: "high" | "medium" | "low"
- deadline: YYYY-MM-DD format (or null if not specified)

Tasks (0-15):
- title: Specific, actionable task
- description: Additional details if provided
- priority: "high" | "medium" | "low"

Rules:
- Be specific and actionable
- Convert relative dates to absolute (use current date: ${new Date().toISOString().split('T')[0]})
- Break down work into clear, actionable tasks
- Default stage to "planning" if not specified

Return ONLY valid JSON:
{
  "project": { "name": "...", "description": "...", "stage": "planning", "priority": "medium", "deadline": null },
  "tasks": [{ "title": "...", "description": "...", "priority": "medium" }]
}`
};

/**
 * Structure voice conversation into entity-specific proposal
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, entityType, fullConversation, parentContext } = await req.json();

    if (!sessionId || !entityType || !fullConversation) {
      return NextResponse.json(
        { error: 'sessionId, entityType, and fullConversation required' },
        { status: 400 }
      );
    }

    if (!['company', 'objective', 'project'].includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entityType. Must be: company, objective, or project' },
        { status: 400 }
      );
    }

    console.log(`[Voice Entity ${sessionId}] Structuring ${entityType} proposal`);

    const systemPrompt = ENTITY_PROMPTS[entityType as EntityType];
    
    let userPrompt = `Voice conversation:\n\n${fullConversation}\n\nExtract structured ${entityType} as JSON:`;
    
    if (parentContext) {
      userPrompt = `Context: ${JSON.stringify(parentContext)}\n\n${userPrompt}`;
    }

    // Use GPT-4 to extract structured data
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.5,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '{}';
    const proposal = JSON.parse(responseText);

    // Validate structure based on entity type
    if (entityType === 'company' && !proposal.company?.name) {
      throw new Error('Invalid company proposal: missing company.name');
    } else if (entityType === 'objective' && !proposal.objective?.title) {
      throw new Error('Invalid objective proposal: missing objective.title');
    } else if (entityType === 'project' && !proposal.project?.name) {
      throw new Error('Invalid project proposal: missing project.name');
    }

    // Ensure optional arrays exist
    if (entityType === 'company') {
      proposal.objectives = proposal.objectives || [];
    } else if (entityType === 'objective') {
      proposal.projects = proposal.projects || [];
      proposal.tasks = proposal.tasks || [];
    } else if (entityType === 'project') {
      proposal.tasks = proposal.tasks || [];
    }

    console.log(`[Voice Entity ${sessionId}] Generated ${entityType} proposal successfully`);

    return NextResponse.json({
      success: true,
      entityType,
      proposal
    });
  } catch (error) {
    console.error('Voice entity structuring error:', error);
    return NextResponse.json(
      { error: 'Failed to structure proposal' },
      { status: 500 }
    );
  }
}
