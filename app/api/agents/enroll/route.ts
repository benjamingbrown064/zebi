// POST /api/agents/enroll
//
// Bootstrap endpoint — lets an agent exchange the workspace bootstrap token
// for their own API token, stored in Zebi Vault.
//
// This is the ONLY endpoint that doesn't require a per-agent bearer token.
// It is protected by the workspace-scoped AGENT_BOOTSTRAP_TOKEN instead.
//
// Usage:
//   POST /api/agents/enroll
//   X-Bootstrap-Token: <AGENT_BOOTSTRAP_TOKEN>
//   Content-Type: application/json
//
//   { "agentId": "casper", "workspaceId": "..." }
//
// Returns:
//   { "agentId": "casper", "token": "<plaintext>" }
//
// Every call is audit-logged. The bootstrap token should be treated as
// a workspace secret — it can enroll any agent, not just one.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

const AGENT_BOOTSTRAP_TOKEN = process.env.AGENT_BOOTSTRAP_TOKEN
const VALID_AGENTS = ['doug', 'harvey', 'theo', 'casper', 'zebby', 'claude'] as const
type AgentId = typeof VALID_AGENTS[number]

// Agent token key names in the Zebi — Agent Tokens stack
const AGENT_TOKEN_KEYS: Record<AgentId, string> = {
  doug:   'DOUG_API_TOKEN',
  harvey: 'HARVEY_API_TOKEN',
  theo:   'THEO_API_TOKEN',
  casper: 'CASPER_API_TOKEN',
  zebby:  'ZEBBY_API_TOKEN',
  claude: 'CLAUDE_API_TOKEN',
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(request: NextRequest) {
  // 1. Validate bootstrap token
  if (!AGENT_BOOTSTRAP_TOKEN) {
    return NextResponse.json({ error: 'Enrollment not configured' }, { status: 503 })
  }

  const bootstrapHeader = request.headers.get('x-bootstrap-token')
  if (!bootstrapHeader || bootstrapHeader !== AGENT_BOOTSTRAP_TOKEN) {
    return NextResponse.json({ error: 'Invalid bootstrap token' }, { status: 401 })
  }

  // 2. Parse body
  let body: Record<string, unknown> = {}
  try { body = await request.json() } catch { /* ignore */ }

  const agentId = body.agentId as string | undefined
  const workspaceId = body.workspaceId as string | undefined

  if (!agentId || !workspaceId) {
    return NextResponse.json({ error: 'agentId and workspaceId are required' }, { status: 422 })
  }

  if (!VALID_AGENTS.includes(agentId as AgentId)) {
    return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 422 })
  }

  const tokenKey = AGENT_TOKEN_KEYS[agentId as AgentId]

  try {
    // 3. Find the agent's token in the Zebi — Agent Tokens stack
    const secrets = await prisma.$queryRaw<Array<{ vault_secret_id: string }>>`
      SELECT ss.vault_secret_id
        FROM stack_secret ss
        JOIN stack s ON s.id = ss.stack_id
       WHERE s.workspace_id = ${workspaceId}
         AND s.company_id IS NULL
         AND s.project_id IS NULL
         AND ss.key = ${tokenKey}
         AND s.archived_at IS NULL
       LIMIT 1`

    if (secrets.length === 0) {
      return NextResponse.json({ error: `No token found for agent: ${agentId}` }, { status: 404 })
    }

    const { vault_secret_id } = secrets[0]
    const ip = clientIp(request)

    // 4. Resolve from Vault (audit log written inside RPC)
    const supabase = getServerSupabaseClient()
    const { data: plaintext, error: vaultErr } = await supabase.rpc('vault_resolve_secret', {
      p_vault_secret_id: vault_secret_id,
      p_audit_context: {
        agent: `enroll:${agentId}`,
        task_id: null,
        ip,
      },
    })

    if (vaultErr || plaintext === null) {
      console.error('[POST /api/agents/enroll]', vaultErr)
      return NextResponse.json({ error: 'Failed to resolve token from Vault' }, { status: 500 })
    }

    return NextResponse.json({ agentId, token: plaintext })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/agents/enroll]', message)
    return NextResponse.json({ error: 'Enrollment failed' }, { status: 500 })
  }
}
