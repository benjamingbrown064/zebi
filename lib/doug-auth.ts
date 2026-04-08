/**
 * AI Assistant Auth - Token authentication for API access
 * 
 * Doug & Harvey (AI assistants) can call Zebi APIs
 * using token-based authentication.
 * 
 * Kill switch: set AGENT_WORK_ENABLED=false in Vercel env vars to instantly
 * block all agent API access. Set to true (or remove) to re-enable.
 */

import { NextRequest } from 'next/server'

const DOUG_API_TOKEN   = process.env.DOUG_API_TOKEN
const HARVEY_API_TOKEN = process.env.HARVEY_API_TOKEN
const THEO_API_TOKEN   = process.env.THEO_API_TOKEN
const CASPER_API_TOKEN = process.env.CASPER_API_TOKEN

// Kill switch — defaults to enabled if not set
const AGENT_WORK_ENABLED = process.env.AGENT_WORK_ENABLED !== 'false'

export type AIAssistant = 'doug' | 'harvey' | 'theo' | 'casper'

/**
 * Validate AI assistant token and return which assistant it is.
 * Returns { valid: false, disabled: true } when the kill switch is active.
 */
export function validateAIAuth(request: NextRequest): { valid: boolean; assistant?: AIAssistant; disabled?: boolean } {
  // Kill switch — block all agent access immediately
  if (!AGENT_WORK_ENABLED) {
    return { valid: false, disabled: true }
  }

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

  if (THEO_API_TOKEN && token === THEO_API_TOKEN) {
    return { valid: true, assistant: 'theo' }
  }

  if (CASPER_API_TOKEN && token === CASPER_API_TOKEN) {
    return { valid: true, assistant: 'casper' }
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
    if (auth.disabled) {
      return {
        error: 'Agent access is currently disabled. AGENT_WORK_ENABLED=false.',
        status: 503,
      }
    }
    return {
      error: 'Unauthorized - Invalid or missing API token',
      status: 401,
    }
  }

  return null // No error, auth valid
}
// Deployed with API auth enabled
