'use server'

import OpenAI from 'openai'

export type TidyMode = 'development' | 'marketing' | 'business-dev' | 'overview' | 'clarity'

interface TidyResult {
  original: string
  rewritten: string
  mode: TidyMode
}

const TIDY_PROMPTS: Record<TidyMode, string> = {
  development:
    'Rewrite this task description for a developer. Focus on technical clarity, acceptance criteria, and implementation details. Keep it concise and actionable. Preserve all important information.',
  marketing:
    'Rewrite this task description for a marketing context. Focus on user value, business impact, and key messaging. Make it compelling but clear. Preserve all important information.',
  'business-dev':
    'Rewrite this task description for business development. Focus on outcomes, stakeholder value, and strategic importance. Keep it professional and impact-focused. Preserve all important information.',
  overview:
    'Rewrite this task description as a clear task overview. Structure it with: Purpose, Key Points, and Success Criteria. Make it scannable and clear.',
  clarity:
    'Rewrite this task description for maximum clarity. Use simple language, short sentences, and clear structure. Remove jargon and ambiguity. Preserve all important information.',
}

export async function tidyDescription(
  originalText: string,
  mode: TidyMode
): Promise<TidyResult> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured. Add it to Vercel environment variables.')
  }

  if (!originalText || originalText.trim().length === 0) {
    throw new Error('Description cannot be empty')
  }

  const client = new OpenAI({ apiKey })

  const prompt = `${TIDY_PROMPTS[mode]}

Original text:
${originalText}

Rewrite only the description. Do not add meta-commentary or explanations. Return only the rewritten text.`

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const rewrittenText =
    response.choices[0]?.message?.content || ''

  if (!rewrittenText) {
    throw new Error('Failed to rewrite description')
  }

  return {
    original: originalText,
    rewritten: rewrittenText.trim(),
    mode,
  }
}
