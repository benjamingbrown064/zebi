import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for GPT-4 response

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Structure the conversation into a goal proposal
 */
export async function POST(req: NextRequest) {
  try {
    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return NextResponse.json(
        { error: 'OpenAI API not configured' },
        { status: 500 }
      );
    }

    const { sessionId, fullConversation } = await req.json();

    if (!sessionId || !fullConversation) {
      return NextResponse.json(
        { error: 'sessionId and fullConversation required' },
        { status: 400 }
      );
    }

    console.log(`[Voice Coach ${sessionId}] Structuring proposal from conversation`);

    // Use GPT-4 to extract structured data
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are structuring a user's goal planning session into actionable work items.

Extract:

Goal:
- name: Clear, concise title (max 60 chars)
- description: 2-3 sentences, actionable
- successCriteria: Measurable outcome (or empty string if not specified)
- targetDate: YYYY-MM-DD format (or null if not specified)

Objectives (3-5):
- title: Clear milestone/deliverable
- priority: "high" | "medium" | "low"
- targetDate: YYYY-MM-DD (or null)

Projects (2-4):
- name: Clear project name
- objectiveIndex: Which objective does this support? (0-based index or null)

Tasks (5-10):
- title: Small, actionable task
- projectIndex: Which project does this belong to? (0-based index or null)

Blockers (0-5):
- Extract mentioned risks, dependencies, or unknowns
- Each as a short string

Uncertainties (0-5):
- Things you're not confident about
- Vague dates ("soon", "next week")
- Missing critical information
- Each as a question string

Rules:
- Be specific and actionable
- Convert relative dates to absolute (use current date: ${new Date().toISOString().split('T')[0]})
- Break down vague goals into clear objectives
- Extract concrete tasks from the conversation
- Flag anything uncertain as a question

Return ONLY valid JSON matching this structure:
{
  "goal": { "name": "...", "description": "...", "successCriteria": "...", "targetDate": "YYYY-MM-DD or null" },
  "objectives": [{ "title": "...", "priority": "high|medium|low", "targetDate": "YYYY-MM-DD or null" }],
  "projects": [{ "name": "...", "objectiveIndex": 0 }],
  "tasks": [{ "title": "...", "projectIndex": 0 }],
  "blockers": ["..."],
  "uncertainties": ["..."]
}`
        },
        {
          role: 'user',
          content: `User planning session:\n\n${fullConversation}\n\nExtract structured plan as JSON:`
        }
      ],
      temperature: 0.5,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '{}';
    const proposal = JSON.parse(responseText);

    // Validate structure
    if (!proposal.goal || !proposal.goal.name) {
      throw new Error('Invalid proposal structure: missing goal.name');
    }

    // Ensure arrays exist
    proposal.objectives = proposal.objectives || [];
    proposal.projects = proposal.projects || [];
    proposal.tasks = proposal.tasks || [];
    proposal.blockers = proposal.blockers || [];
    proposal.uncertainties = proposal.uncertainties || [];

    console.log(`[Voice Coach ${sessionId}] Generated proposal with ${proposal.objectives.length} objectives, ${proposal.projects.length} projects, ${proposal.tasks.length} tasks`);

    return NextResponse.json({
      success: true,
      proposal
    });
  } catch (error) {
    console.error('Voice coach structuring error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to structure proposal',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
