import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Allow up to 30 seconds for GPT response

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const QUESTION_BANK = [
  "What's your target date?",
  "How will you know you've succeeded?",
  "What's the most important part?",
  "What could slow you down?",
  "Which of these is highest priority?",
  "Who's working on this with you?"
];

/**
 * Determine what follow-up questions to ask (if any)
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, transcript } = await req.json();

    if (!sessionId || !transcript) {
      return NextResponse.json(
        { error: 'sessionId and transcript required' },
        { status: 400 }
      );
    }

    console.log(`[Voice Coach ${sessionId}] Analyzing transcript for follow-ups`);

    // Use GPT-4 to determine what questions to ask
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are analyzing a user's spoken goal planning session.

Your job: Identify the most important missing information.

Available questions:
${QUESTION_BANK.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Rules:
- Ask MAX 2 questions total (user already answered goal + context questions)
- Only ask if CRITICAL info is missing
- Prioritize: timeline > success criteria only
- If key info is present, return empty array

Return ONLY a JSON array of question numbers (e.g., [1, 2])
If no questions needed, return []`
        },
        {
          role: 'user',
          content: `User said: "${transcript}"\n\nWhat questions should I ask? Return JSON array of numbers only.`
        }
      ],
      temperature: 0.3,
      max_tokens: 50
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '[]';
    
    // Parse question indices
    let questionIndices: number[];
    try {
      questionIndices = JSON.parse(responseText);
    } catch {
      // If parsing fails, extract numbers from text
      const matches = responseText.match(/\d+/g);
      questionIndices = matches ? matches.map(Number) : [];
    }

    // Limit to 2 questions max
    questionIndices = questionIndices.slice(0, 2);

    // Convert indices to actual questions
    const questions = questionIndices
      .filter(i => i >= 1 && i <= QUESTION_BANK.length)
      .map(i => QUESTION_BANK[i - 1]);

    console.log(`[Voice Coach ${sessionId}] Generated ${questions.length} follow-up questions`);

    return NextResponse.json({
      success: true,
      questions,
      skipToSynthesis: questions.length === 0
    });
  } catch (error) {
    console.error('Voice coach follow-up error:', error);
    return NextResponse.json(
      { error: 'Failed to generate follow-up questions' },
      { status: 500 }
    );
  }
}
