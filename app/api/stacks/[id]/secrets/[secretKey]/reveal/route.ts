// Stack #5 — /api/stacks/[id]/secrets/[secretKey]/reveal
// Secret reveal endpoint.
//
// POST /api/stacks/:id/secrets/:secretKey/reveal
//
// Auth: Supabase session cookie (requireWorkspace) OR agent bearer token (validateAIAuth).
// Audit: vault_resolve_secret() writes an audit row internally.
// Secret plaintext is returned once per request and never persisted.

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/workspace'
import { validateAIAuth, isInfraBlocked } from '@/lib/doug-auth'
import { getServerSupabaseClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; secretKey: string }> }
) {
  const agentAuth = validateAIAuth(request)
  if (agentAuth.valid && isInfraBlocked(agentAuth.assistant)) {
    return NextResponse.json({ error: 'Forbidden — infrastructure access not permitted for this agent' }, { status: 403 })
  }
  let workspaceId: string
  let callerLabel: string

  if (agentAuth.valid && agentAuth.assistant) {
    // Agent bearer token path — get workspaceId from body
    let body: Record<string, unknown> = {}
    try { body = await request.json() } catch { /* ignore */ }
    const wid = body.workspaceId as string | undefined
    if (!wid) return NextResponse.json({ error: 'workspaceId is required' }, { status: 422 })
    workspaceId = wid
    callerLabel = agentAuth.assistant
  } else {
    // User session path
    try {
      workspaceId = await requireWorkspace()
      callerLabel = 'user'
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { id: stackId, secretKey } = await params

  try {
    // Verify stack belongs to workspace
    const secrets = await prisma.$queryRaw<Array<{ vault_secret_id: string; key: string }>>`
      SELECT ss.key, ss.vault_secret_id
        FROM stack_secret ss
        JOIN stack s ON s.id = ss.stack_id
       WHERE s.id = ${stackId}::uuid
         AND s.workspace_id = ${workspaceId}
         AND ss.key = ${secretKey}
         AND s.archived_at IS NULL`

    if (secrets.length === 0) {
      return NextResponse.json({ error: 'Secret not found' }, { status: 404 })
    }

    const { vault_secret_id } = secrets[0]
    const ip = clientIp(request)

    const supabase = getServerSupabaseClient()
    const { data: plaintext, error: vaultErr } = await supabase.rpc('vault_resolve_secret', {
      p_vault_secret_id: vault_secret_id,
      p_audit_context: {
        agent: callerLabel,
        task_id: null,
        ip,
      },
    })

    if (vaultErr || plaintext === null) {
      console.error('[POST /api/stacks/:id/secrets/:key/reveal]', vaultErr)
      return NextResponse.json({ error: 'Failed to resolve secret' }, { status: 500 })
    }

    return NextResponse.json({ plaintext })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/stacks/:id/secrets/:key/reveal]', message)
    return NextResponse.json({ error: 'Failed to reveal secret' }, { status: 500 })
  }
}
