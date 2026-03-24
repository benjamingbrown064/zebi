import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Create a new voice coaching session
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionType } = await req.json();

    // Accept all valid session types
    const validTypes = [
      'goal_planning',
      'space_creation',
      'objective_creation',
      'project_creation'
    ];

    if (!sessionType || !validTypes.includes(sessionType)) {
      return NextResponse.json(
        { error: 'Invalid session type' },
        { status: 400 }
      );
    }

    // Create session ID (for tracking/debugging)
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Opening questions by type
    const openingQuestions: Record<string, string> = {
      goal_planning: "What are you trying to achieve? Speak naturally — I'll structure it.",
      space_creation: "Tell me about this space. What's the name, industry, and what do they do?",
      objective_creation: "What objective do you want to achieve? Be specific about the outcome and timeline.",
      project_creation: "Tell me about this project. What's the goal, scope, and key deliverables?"
    };

    return NextResponse.json({
      success: true,
      sessionId,
      openingQuestion: openingQuestions[sessionType] || openingQuestions.goal_planning
    });
  } catch (error) {
    console.error('Voice coach session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
