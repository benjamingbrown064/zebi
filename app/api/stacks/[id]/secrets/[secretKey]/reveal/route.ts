// Stack #5 — /api/stacks/[id]/secrets/[secretKey]/reveal
// User-facing secret reveal endpoint (session auth, not agent bearer).
//
// POST /api/stacks/:id/secrets/:secretKey/reveal
//
// Auth: Supabase session cookie (requireWorkspace). Validates stack belongs to workspace.
// Audit: vault_resolve_secret() writes an audit row internally (agent = "user:<userId>").
// Secret plaintext is returned once per request and never persisted.

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspace } from '@/lib/workspace'
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
  let workspaceId: string
  try {
    workspaceId = await requireWorkspace()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
        agent: `user`,
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
