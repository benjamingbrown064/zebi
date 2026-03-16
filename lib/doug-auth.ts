/**
 * AI Assistant Auth - Token authentication for API access
 * 
 * Doug & Harvey (AI assistants) can call Zebi APIs
 * using token-based authentication.
 */

import { NextRequest } from 'next/server'

const DOUG_API_TOKEN = process.env.DOUG_API_TOKEN
const HARVEY_API_TOKEN = process.env.HARVEY_API_TOKEN

export type AIAssistant = 'doug' | 'harvey'

/**
 * Validate AI assistant token and return which assistant it is
 */
export function validateAIAuth(request: NextRequest): { valid: boolean; assistant?: AIAssistant } {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { valid: false }
  }

  // Support both "Bearer TOKEN" and just "TOKEN"
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader

  if (DOUG_API_TOKEN && token === DOUG_API_TOKEN) {
    return { valid: true, assistant: 'doug' }
  }

  if (HARVEY_API_TOKEN && token === HARVEY_API_TOKEN) {
    return { valid: true, assistant: 'harvey' }
  }

  return { valid: false }
}

/**
 * Legacy: Validate Doug's API token (for backward compatibility)
 */
export function validateDougAuth(request: NextRequest): boolean {
  const auth = validateAIAuth(request)
  return auth.valid && (auth.assistant === 'doug' || !auth.assistant)
}

/**
 * Middleware helper for AI API routes
 */
export function requireDougAuth(request: NextRequest) {
  const auth = validateAIAuth(request)
  
  if (!auth.valid) {
    return {
      error: 'Unauthorized - Invalid or missing API token',
      status: 401,
    }
  }

  return null // No error, auth valid
}
