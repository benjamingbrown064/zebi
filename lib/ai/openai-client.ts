import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required')
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  content: string
  model: string
  tokens: {
    prompt: number
    completion: number
    total: number
  }
  cost: number
}

/**
 * Call OpenAI Chat Completions API
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: 'gpt-4o-mini' | 'gpt-4o'
    temperature?: number
    maxTokens?: number
  }
): Promise<ChatResponse> {
  const model = options?.model || 'gpt-4o-mini'
  const temperature = options?.temperature ?? 0.7
  const maxTokens = options?.maxTokens || 1000

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  })

  const choice = completion.choices[0]
  if (!choice || !choice.message.content) {
    throw new Error('No response from OpenAI')
  }

  // Calculate cost
  const promptTokens = completion.usage?.prompt_tokens || 0
  const completionTokens = completion.usage?.completion_tokens || 0
  const totalTokens = completion.usage?.total_tokens || 0

  // Pricing (per 1M tokens)
  const pricing = {
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4o': { input: 2.5, output: 10.0 },
  }

  const rates = pricing[model]
  const cost =
    (promptTokens * rates.input) / 1_000_000 +
    (completionTokens * rates.output) / 1_000_000

  return {
    content: choice.message.content,
    model,
    tokens: {
      prompt: promptTokens,
      completion: completionTokens,
      total: totalTokens,
    },
    cost: Math.round(cost * 100000) / 100000, // Round to 5 decimals
  }
}
