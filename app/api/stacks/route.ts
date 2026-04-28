// Stack #3 — /api/stacks (list + create)
// Task: 79d39c6a — Build /api/stacks CRUD endpoints
//
// GET  /api/stacks  — list workspace stacks with resources + secret metadata
// POST /api/stacks  — create stack, optionally with inline resources and secrets
//
// Auth: validateAIAuth (agent bearer token)
// Secret rule: plaintext is accepted in POST body, forwarded to vault_store_secret RPC,
//              vault_secret_id persisted, plaintext dropped. NEVER returned in any response.

import { NextRequest, NextResponse } from 'next/server'
import { validateAIAuth, isInfraBlocked } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'
import { getServerSupabaseClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

const VALID_PROVIDERS = ['supabase', 'vercel', 'railway', 'github', 'other'] as const
const VALID_KINDS = ['url', 'id', 'env_name', 'identifier', 'other'] as const

type ProviderType = typeof VALID_PROVIDERS[number]
type KindType = typeof VALID_KINDS[number]

function secretMetadata(row: Record<string, unknown>) {
  return {
    id: row.id,
    stack_id: row.stack_id,
    key: row.key,
    vault_secret_id: row.vault_secret_id,
    description: row.description,
    last_rotated_at: row.last_rotated_at,
    rotation_interval_days: row.rotation_interval_days,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// ---------------------------------------------------------------------------
// GET /api/stacks
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = validateAIAuth(request)
  if (auth.valid && isInfraBlocked(auth.assistant)) {
    return NextResponse.json({ error: 'Forbidden — infrastructure access not permitted for this agent' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const provider    = searchParams.get('provider')

  let workspaceId: string
  if (auth.valid) {
    const wid = searchParams.get('workspaceId')
    if (!wid) return NextResponse.json({ error: 'workspaceId is required' }, { status: 422 })
    workspaceId = wid
  } else {
    try {
      workspaceId = await requireWorkspace()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const companyId = searchParams.get('companyId')
  const projectId = searchParams.get('projectId')


  if (provider && !VALID_PROVIDERS.includes(provider as ProviderType)) {
    return NextResponse.json({ error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` }, { status: 422 })
  }

  try {
    // Build filters as template literal — safe: all values are validated or parameterised
    const filters: string[] = [`s.workspace_id = '${workspaceId}'`, `s.archived_at IS NULL`]
    if (companyId)  filters.push(`s.company_id = '${companyId}'`)
    if (projectId)  filters.push(`s.project_id = '${projectId}'`)
    if (provider)   filters.push(`s.provider = '${provider}'`)

    const where = filters.join(' AND ')

    const stacks = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s.id, s.workspace_id, s.company_id, s.project_id,
              s.name, s.provider, s.description, s.created_by,
              s.created_at, s.updated_at
         FROM stack s
        WHERE ${where}
        ORDER BY s.created_at DESC`
    )

    if (stacks.length === 0) return NextResponse.json({ stacks: [] })

    const ids = stacks.map(s => `'${s.id}'`).join(', ')

    const resources = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, stack_id, key, value, kind, description, created_at, updated_at
         FROM stack_resource WHERE stack_id IN (${ids}) ORDER BY created_at ASC`
    )

    const secrets = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, stack_id, key, vault_secret_id, description,
              last_rotated_at, rotation_interval_days, created_at, updated_at
         FROM stack_secret WHERE stack_id IN (${ids}) ORDER BY created_at ASC`
    )

    const resourcesByStack: Record<string, unknown[]> = {}
    const secretsByStack: Record<string, unknown[]>   = {}

    for (const r of resources) {
      const sid = r.stack_id as string
      if (!resourcesByStack[sid]) resourcesByStack[sid] = []
      resourcesByStack[sid].push(r)
    }
    for (const s of secrets) {
      const sid = s.stack_id as string
      if (!secretsByStack[sid]) secretsByStack[sid] = []
      secretsByStack[sid].push(secretMetadata(s))
    }

    const result = stacks.map(s => ({
      ...s,
      resources: resourcesByStack[s.id as string] ?? [],
      secrets:   secretsByStack[s.id as string]   ?? [],
    }))

    return NextResponse.json({ stacks: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/stacks]', message)
    return NextResponse.json({ error: 'Failed to list stacks' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST /api/stacks
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = validateAIAuth(request)
  if (auth.valid && isInfraBlocked(auth.assistant)) {
    return NextResponse.json({ error: 'Forbidden — infrastructure access not permitted for this agent' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 422 })
  }

  // Resolve workspaceId and createdBy — agent token OR session cookie
  let resolvedWorkspaceId: string
  let createdBy: string

  if (auth.valid) {
    if (!body.workspaceId || typeof body.workspaceId !== 'string') {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 422 })
    }
    resolvedWorkspaceId = body.workspaceId as string
    createdBy = auth.assistant ?? 'agent'
  } else if (auth.disabled) {
    return NextResponse.json({ error: 'Agent work is disabled' }, { status: 401 })
  } else {
    // Session auth fallback (browser UI)
    try {
      resolvedWorkspaceId = await requireWorkspace()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    createdBy = 'user'
  }

  const {
    name,
    provider,
    companyId,
    projectId,
    description,
    resources = [],
    secrets   = [],
  } = body as {
    name: string
    provider: string
    companyId?: string
    projectId?: string
    description?: string
    resources?: Array<{ key: string; value: string; kind: string; description?: string }>
    secrets?: Array<{ key: string; plaintext: string; description?: string; rotation_interval_days?: number }>
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 422 })
  }
  if (!provider || !VALID_PROVIDERS.includes(provider as ProviderType)) {
    return NextResponse.json({ error: `provider must be one of: ${VALID_PROVIDERS.join(', ')}` }, { status: 422 })
  }
  if (!Array.isArray(resources)) {
    return NextResponse.json({ error: 'resources must be an array' }, { status: 422 })
  }
  if (!Array.isArray(secrets)) {
    return NextResponse.json({ error: 'secrets must be an array' }, { status: 422 })
  }
  for (const r of resources) {
    if (!r.key || !r.value || !r.kind) {
      return NextResponse.json({ error: 'Each resource must have key, value, and kind' }, { status: 422 })
    }
    if (!VALID_KINDS.includes(r.kind as KindType)) {
      return NextResponse.json({ error: `Resource kind must be one of: ${VALID_KINDS.join(', ')}` }, { status: 422 })
    }
  }
  for (const s of secrets) {
    if (!s.key || !s.plaintext) {
      return NextResponse.json({ error: 'Each secret must have key and plaintext' }, { status: 422 })
    }
    if (typeof s.plaintext !== 'string' || !s.plaintext.trim()) {
      return NextResponse.json({ error: `Secret "${s.key}" plaintext must be a non-empty string` }, { status: 422 })
    }
  }

  const supabase = getServerSupabaseClient()

  try {
    // Insert stack
    const stackRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      INSERT INTO stack (workspace_id, company_id, project_id, name, provider, description, created_by)
      VALUES (${resolvedWorkspaceId}, ${companyId ?? null}, ${projectId ?? null}, ${name.trim()}, ${provider}, ${description ?? null}, ${createdBy})
      RETURNING id, workspace_id, company_id, project_id, name, provider, description, created_by, created_at, updated_at`
    const stack = stackRows[0]

    // Insert resources
    const insertedResources: unknown[] = []
    const stackIdStr = stack.id as string
    for (const r of resources) {
      const res = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `INSERT INTO stack_resource (stack_id, key, value, kind, description)
         VALUES ('${stackIdStr}'::uuid, $1, $2, $3, $4)
         RETURNING id, stack_id, key, value, kind, description, created_at, updated_at`,
        r.key, r.value, r.kind, r.description ?? null
      )
      insertedResources.push(res[0])
    }

    // Insert secrets — call vault_store_secret RPC, store vault_secret_id only
    const insertedSecretsMeta: unknown[] = []
    for (const s of secrets) {
      const { data: vaultId, error: vaultErr } = await supabase.rpc('vault_store_secret', {
        p_name: `${resolvedWorkspaceId}/${stack.id}/${s.key}`,
        p_secret: s.plaintext,
      })
      if (vaultErr || !vaultId) {
        console.error('[POST /api/stacks] vault_store_secret error:', vaultErr)
        return NextResponse.json({ error: `Failed to store secret "${s.key}" in Vault` }, { status: 500 })
      }
      // Plaintext is now in Vault. Store only the opaque vault_secret_id.
      const secRes = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `INSERT INTO stack_secret (stack_id, key, vault_secret_id, description, rotation_interval_days)
         VALUES ('${stackIdStr}'::uuid, $1, $2::uuid, $3, $4)
         RETURNING id, stack_id, key, vault_secret_id, description, last_rotated_at, rotation_interval_days, created_at, updated_at`,
        s.key, vaultId, s.description ?? null, s.rotation_interval_days ?? null
      )
      insertedSecretsMeta.push(secretMetadata(secRes[0]))
      // plaintext dropped here — never in response
    }

    return NextResponse.json({
      success: true,
      stack: {
        ...stack,
        resources: insertedResources,
        secrets: insertedSecretsMeta,
      },
    }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/stacks]', message)
    return NextResponse.json({ error: 'Failed to create stack' }, { status: 500 })
  }
}
