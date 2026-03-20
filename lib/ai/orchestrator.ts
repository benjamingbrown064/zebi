import { buildContext, formatContextForPrompt } from './context-builder'
import { chatCompletion, ChatMessage } from './openai-client'
import { getChatSystemPrompt, getPrioritizationSystemPrompt, isPrioritizationQuery } from './prompts'
import { prioritizeWorkspace } from './prioritization-engine'
import { generatePrioritizationResponse } from './response-templates'
import { prisma } from '@/lib/prisma'

export interface AIResponse {
  content: string
  actions?: AIAction[]
  metadata: {
    model: string
    tokens: number
    cost: number
    mode?: string // 'prioritization' | 'chat'
  }
}

export interface AIAction {
  type: 'create_task' | 'update_priority' | 'flag_blocker'
  label: string
  params: Record<string, any>
}

export type OperatingMode = 'pressure' | 'plateau' | 'momentum' | 'drift'

/**
 * Process user message and generate AI response
 */
export async function processMessage(
  workspaceId: string,
  userId: string,
  userMessage: string,
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[],
  operatingMode?: OperatingMode
): Promise<AIResponse> {
  // Build context from workspace data
  const context = await buildContext(workspaceId, userId)

  // Detect if this is a prioritization query
  const isPrioritization = isPrioritizationQuery(userMessage)

  if (isPrioritization) {
    // Use prioritization engine
    return await handlePrioritizationQuery(context, userMessage, conversationHistory, operatingMode)
  } else {
    // Use general chat
    return await handleGeneralChat(context, userMessage, conversationHistory, operatingMode)
  }
}

/**
 * Handle prioritization queries with the prioritization engine
 */
async function handlePrioritizationQuery(
  context: any,
  userMessage: string,
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[],
  operatingMode?: OperatingMode
): Promise<AIResponse> {
  // Run prioritization engine
  const prioritizationResult = prioritizeWorkspace(context)

  // Generate structured response
  const responseContent = generatePrioritizationResponse(prioritizationResult, context)

  // Build message history for potential follow-up
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: getPrioritizationSystemPrompt(context, operatingMode),
    },
  ]

  // Add conversation history (last 3 messages)
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-3)
    messages.push(
      ...recentHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))
    )
  }

  // Add current user message and our structured response
  messages.push({
    role: 'user',
    content: userMessage,
  })

  messages.push({
    role: 'assistant',
    content: responseContent,
  })

  // Let the LLM refine/enhance the response if needed (but keep it focused)
  const enhancedMessages: ChatMessage[] = [
    {
      role: 'system',
      content: getPrioritizationSystemPrompt(context, operatingMode),
    },
    {
      role: 'user',
      content: userMessage,
    },
    {
      role: 'assistant',
      content: responseContent,
    },
    {
      role: 'user',
      content: 'Based on the above prioritization, provide a final response to the user. Keep it concise and actionable. Do not add generic advice. Use the structured recommendations as-is or enhance them slightly.',
    },
  ]

  const response = await chatCompletion(enhancedMessages, {
    model: 'gpt-4o-mini',
    temperature: 0.5, // Lower temperature for more consistent prioritization
    maxTokens: 600,
  })

  return {
    content: response.content,
    actions: [], // TODO: Parse actions in Phase 2
    metadata: {
      model: response.model,
      tokens: response.tokens.total,
      cost: response.cost,
      mode: 'prioritization',
    },
  }
}

/**
 * Handle general chat queries
 */
async function handleGeneralChat(
  context: any,
  userMessage: string,
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[],
  operatingMode?: OperatingMode
): Promise<AIResponse> {
  // Build message history
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: getChatSystemPrompt(context, operatingMode),
    },
  ]

  // Add conversation history (last 5 messages)
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-5)
    messages.push(
      ...recentHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))
    )
  }

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage,
  })

  // Call OpenAI
  const response = await chatCompletion(messages, {
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 500,
  })

  return {
    content: response.content,
    actions: [],
    metadata: {
      model: response.model,
      tokens: response.tokens.total,
      cost: response.cost,
      mode: 'chat',
    },
  }
}
