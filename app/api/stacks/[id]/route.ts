// Stack #3 — /api/stacks/[id] (get, update, delete)
// Task: 79d39c6a — Build /api/stacks CRUD endpoints
//
// GET    /api/stacks/:id  — single stack with all resources + secret metadata
// PATCH  /api/stacks/:id  — update stack fields, add/update resources, add/rotate secrets
// DELETE /api/stacks/:id  — soft delete (archived_at = NOW())
//
// Auth: validateAIAuth (agent bearer token)
// Secret rule: NEVER return or log plaintext. Only vault_secret_id (opaque) in responses.

import { NextRequest, NextResponse } from 'next/server'
import { validateAIAuth, isInfraBlocked } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'
import { getServerSupabaseClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

const VALID_PROVIDERS = ['supabase', 'vercel', 'railway', 'github', 'other'] as const
const VALID_KINDS     = ['url', 'id', 'env_name', 'identifier', 'other'] as const

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

async function fetchStackWithDetails(stackId: string, workspaceId: string) {
  const stacks = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT id, workspace_id, company_id, project_id, name, provider, description,
           created_by, created_at, updated_at, archived_at
      FROM stack
     WHERE id = ${stackId}::uuid AND workspace_id = ${workspaceId}`

  if (stacks.length === 0) return null
  const stack = stacks[0]

  const resources = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT id, stack_id, key, value, kind, description, created_at, updated_at
      FROM stack_resource WHERE stack_id = ${stackId}::uuid ORDER BY created_at ASC`

  const secrets = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT id, stack_id, key, vault_secret_id, description,
           last_rotated_at, rotation_interval_days, created_at, updated_at
      FROM stack_secret WHERE stack_id = ${stackId}::uuid ORDER BY created_at ASC`

  return {
    ...stack,
    resources,
    secrets: secrets.map(secretMetadata),
  }
}

// ---------------------------------------------------------------------------
// GET /api/stacks/:id
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateAIAuth(request)
  if (auth.valid && isInfraBlocked(auth.assistant)) {
    return NextResponse.json({ error: 'Forbidden — infrastructure access not permitted for this agent' }, { status: 403 })
  }
  const { id: stackId } = await params
  const { searchParams } = new URL(request.url)

  let workspaceId: string
  if (auth.valid) {
    const wid = searchParams.get('workspaceId')
    if (!wid) return NextResponse.json({ error: 'workspaceId is required' }, { status: 422 })
    workspaceId = wid
  } else {
    try { workspaceId = await requireWorkspace() } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const stack = await fetchStackWithDetails(stackId, workspaceId)
    if (!stack) return NextResponse.json({ error: 'Stack not found' }, { status: 404 })
    return NextResponse.json({ stack })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/stacks/:id]', message)
    return NextResponse.json({ error: 'Failed to fetch stack' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/stacks/:id
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateAIAuth(request)
  if (auth.valid && isInfraBlocked(auth.assistant)) {
    return NextResponse.json({ error: 'Forbidden — infrastructure access not permitted for this agent' }, { status: 403 })
  }
  const { id: stackId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 422 })
  }

  let resolvedWorkspaceId: string
  if (auth.valid) {
    if (!body.workspaceId) return NextResponse.json({ error: 'workspaceId is required' }, { status: 422 })
    resolvedWorkspaceId = body.workspaceId as string
  } else {
    try { resolvedWorkspaceId = await requireWorkspace() } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const {
    workspaceId = resolvedWorkspaceId,
    name,
    provider,
    companyId,
    projectId,
    description,
    resources = [],
    removeResourceIds = [],
    secrets = [],
    removeSecretIds = [],
  } = body as {
    workspaceId: string
    name?: string
    provider?: string
    companyId?: string | null
    projectId?: string | null
    description?: string | null
    resources?: Array<{ key: string; value: string; kind: string; description?: string }>
    removeResourceIds?: string[]
    secrets?: Array<{ key: string; plaintext: string; description?: string; rotation_interval_days?: number }>
    removeSecretIds?: string[]
  }

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 422 })
  }
  if (provider && !VALID_PROVIDERS.includes(provider as ProviderType)) {
    return NextResponse.json({ error: `provider must be one of: ${VALID_PROVIDERS.join(', ')}` }, { status: 422 })
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
  }

  const supabase = getServerSupabaseClient()

  try {
    // Verify ownership
    const ownerCheck = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM stack WHERE id = ${stackId}::uuid AND workspace_id = ${workspaceId} AND archived_at IS NULL`
    if (ownerCheck.length === 0) {
      return NextResponse.json({ error: 'Stack not found' }, { status: 404 })
    }

    // Update stack scalar fields
    const updates: string[] = ['updated_at = NOW()']
    if (name !== undefined)         updates.push(`name = '${name.replace(/'/g, "''")}'`)
    if (provider !== undefined)     updates.push(`provider = '${provider}'`)
    if ('companyId' in body)        updates.push(`company_id = ${companyId ? `'${companyId}'` : 'NULL'}`)
    if ('projectId' in body)        updates.push(`project_id = ${projectId ? `'${projectId}'` : 'NULL'}`)
    if ('description' in body)      updates.push(`description = ${description ? `'${description.replace(/'/g, "''")}'` : 'NULL'}`)

    if (updates.length > 1) {
      await prisma.$queryRawUnsafe(
        `UPDATE stack SET ${updates.join(', ')} WHERE id = '${stackId}'`
      )
    }

    // Remove resources
    if (removeResourceIds.length > 0) {
      const ids = removeResourceIds.map(id => `'${id}'`).join(', ')
      await prisma.$queryRawUnsafe(
        `DELETE FROM stack_resource WHERE stack_id = '${stackId}' AND id IN (${ids})`
      )
    }

    // Upsert resources
    for (const r of resources) {
      await prisma.$queryRaw`
        INSERT INTO stack_resource (stack_id, key, value, kind, description)
        VALUES (${stackId}::uuid, ${r.key}, ${r.value}, ${r.kind}, ${r.description ?? null})
        ON CONFLICT (stack_id, key) DO UPDATE
          SET value = EXCLUDED.value,
              kind = EXCLUDED.kind,
              description = EXCLUDED.description,
              updated_at = NOW()`
    }

    // Remove secrets
    if (removeSecretIds.length > 0) {
      const ids = removeSecretIds.map(id => `'${id}'`).join(', ')
      await prisma.$queryRawUnsafe(
        `DELETE FROM stack_secret WHERE stack_id = '${stackId}' AND id IN (${ids})`
      )
    }

    // Upsert secrets (rotation: new plaintext → new Vault entry)
    for (const s of secrets) {
      const { data: vaultId, error: vaultErr } = await supabase.rpc('vault_upsert_secret', {
        p_name: `${workspaceId}/${stackId}/${s.key}`,
        p_secret: s.plaintext,
      })
      if (vaultErr || !vaultId) {
        return NextResponse.json({ error: `Failed to store secret "${s.key}" in Vault` }, { status: 500 })
      }
      // plaintext dropped here
      await prisma.$queryRaw`
        INSERT INTO stack_secret (stack_id, key, vault_secret_id, description, rotation_interval_days, last_rotated_at)
        VALUES (${stackId}::uuid, ${s.key}, ${vaultId}::uuid, ${s.description ?? null}, ${s.rotation_interval_days ?? null}, NOW())
        ON CONFLICT (stack_id, key) DO UPDATE
          SET vault_secret_id = EXCLUDED.vault_secret_id,
              description = COALESCE(EXCLUDED.description, stack_secret.description),
              rotation_interval_days = COALESCE(EXCLUDED.rotation_interval_days, stack_secret.rotation_interval_days),
              last_rotated_at = NOW(),
              updated_at = NOW()`
    }

    const updated = await fetchStackWithDetails(stackId, workspaceId)
    return NextResponse.json({ success: true, stack: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[PATCH /api/stacks/:id]', message)
    return NextResponse.json({ error: 'Failed to update stack' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/stacks/:id  (soft delete)
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateAIAuth(request)
  if (auth.valid && isInfraBlocked(auth.assistant)) {
    return NextResponse.json({ error: 'Forbidden — infrastructure access not permitted for this agent' }, { status: 403 })
  }
  const { id: stackId } = await params
  const { searchParams } = new URL(request.url)

  let workspaceId: string
  if (auth.valid) {
    const wid = searchParams.get('workspaceId')
    if (!wid) return NextResponse.json({ error: 'workspaceId is required' }, { status: 422 })
    workspaceId = wid
  } else {
    try { workspaceId = await requireWorkspace() } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      UPDATE stack
         SET archived_at = NOW(), updated_at = NOW()
       WHERE id = ${stackId}::uuid AND workspace_id = ${workspaceId} AND archived_at IS NULL
       RETURNING id, name, archived_at`

    if (result.length === 0) {
      return NextResponse.json({ error: 'Stack not found' }, { status: 404 })
    }

    // Secrets remain in Vault for audit/recovery. Metadata rows stay too.
    return NextResponse.json({ success: true, archived: result[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[DELETE /api/stacks/:id]', message)
    return NextResponse.json({ error: 'Failed to archive stack' }, { status: 500 })
  }
}
