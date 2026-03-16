/**
 * AI Assistant Workspace - Workspace resolution for AI API routes
 * 
 * Doug & Harvey API routes use token authentication, not user sessions.
 * This helper resolves the workspace from the API context.
 */

import { prisma } from '@/lib/prisma'
import { getUserWorkspace } from '@/lib/workspace'
import { AIAssistant } from '@/lib/doug-auth'

/**
 * Default user IDs for AI assistants
 * Both operate as Ben's primary user in the system
 */
const AI_USER_IDS: Record<AIAssistant, string> = {
  doug: 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74',
  harvey: 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74', // Same workspace as Doug (One Beyond)
}

/**
 * Get workspace ID for AI assistant operations
 * 
 * Resolution priority:
 * 1. If userId provided in request body, use that user's workspace
 * 2. Otherwise, use the AI assistant's default user ID
 * 
 * @param assistant - Which AI assistant is calling
 * @param userId - Optional override user ID from request body
 * @returns Workspace ID
 * @throws Error if workspace cannot be determined
 */
export async function getAIWorkspaceId(
  assistant: AIAssistant = 'doug',
  userId?: string
): Promise<string> {
  const targetUserId = userId || AI_USER_IDS[assistant]
  
  const workspace = await getUserWorkspace(targetUserId)
  
  if (!workspace) {
    throw new Error(`No workspace found for ${assistant} (user ${targetUserId})`)
  }
  
  return workspace.id
}

/**
 * Legacy: Get workspace for Doug (backward compatibility)
 */
export async function getDougWorkspaceId(userId?: string): Promise<string> {
  return getAIWorkspaceId('doug', userId)
}

/**
 * Get workspace ID from request body (if userId provided) or default for assistant
 * 
 * @param assistant - Which AI assistant is calling
 * @param body - Request body that may contain userId
 * @returns Workspace ID
 */
export async function getWorkspaceFromAIRequest(
  assistant: AIAssistant = 'doug',
  body: any
): Promise<string> {
  return getAIWorkspaceId(assistant, body?.userId)
}
