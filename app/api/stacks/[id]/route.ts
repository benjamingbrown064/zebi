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
import { validateAIAuth } from '@/lib/doug-auth'
import { getServerSupabaseClient } from '@/lib/supabase'
import { Pool } from 'pg'

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function getPool(): Pool {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')
  return new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 5,
  })
}

const VALID_PROVIDERS = ['supabase', 'vercel', 'railway', 'github', 'other'] as const
const VALID_KINDS     = ['url', 'id', 'env_name', 'identifier', 'other'] as const

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

async function fetchStackWithDetails(client: import('pg').PoolClient, stackId: string, workspaceId: string) {
  const stackResult = await client.query(
    `SELECT id, workspace_id, company_id, project_id, name, provider, description,
            created_by, created_at, updated_at, archived_at
       FROM stack
      WHERE id = $1 AND workspace_id = $2`,
    [stackId, workspaceId]
  )
  if (stackResult.rows.length === 0) return null

  const stack = stackResult.rows[0]

  const resourcesResult = await client.query(
    `SELECT id, stack_id, key, value, kind, description, created_at, updated_at
       FROM stack_resource
      WHERE stack_id = $1
      ORDER BY created_at ASC`,
    [stackId]
  )

  const secretsResult = await client.query(
    `SELECT id, stack_id, key, vault_secret_id, description,
            last_rotated_at, rotation_interval_days, created_at, updated_at
       FROM stack_secret
      WHERE stack_id = $1
      ORDER BY created_at ASC`,
    [stackId]
  )

  return {
    ...stack,
    resources: resourcesResult.rows,
    secrets:   secretsResult.rows.map(secretMetadata),
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
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.disabled ? 'Agent work is disabled' : 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id: stackId } = await params
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 422 })
  }

  const pool = getPool()
  const client = await pool.connect()
  try {
    const stack = await fetchStackWithDetails(client, stackId, workspaceId)
    if (!stack) {
      return NextResponse.json({ error: 'Stack not found' }, { status: 404 })
    }
    return NextResponse.json({ stack })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/stacks/:id]', message)
    return NextResponse.json({ error: 'Failed to fetch stack' }, { status: 500 })
  } finally {
    client.release()
    await pool.end()
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
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.disabled ? 'Agent work is disabled' : 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id: stackId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 422 })
  }

  const {
    workspaceId,
    name,
    provider,
    companyId,
    projectId,
    description,
    resources = [],  // upsert: existing key → update, new key → insert
    removeResourceIds = [],
    secrets = [],    // add or rotate: existing key → new vault entry, new key → insert
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
  if (provider && !VALID_PROVIDERS.includes(provider as typeof VALID_PROVIDERS[number])) {
    return NextResponse.json({ error: `provider must be one of: ${VALID_PROVIDERS.join(', ')}` }, { status: 422 })
  }
  for (const r of resources) {
    if (!r.key || !r.value || !r.kind) {
      return NextResponse.json({ error: 'Each resource must have key, value, and kind' }, { status: 422 })
    }
    if (!VALID_KINDS.includes(r.kind as typeof VALID_KINDS[number])) {
      return NextResponse.json({ error: `Resource kind must be one of: ${VALID_KINDS.join(', ')}` }, { status: 422 })
    }
  }
  for (const s of secrets) {
    if (!s.key || !s.plaintext) {
      return NextResponse.json({ error: 'Each secret must have key and plaintext' }, { status: 422 })
    }
  }

  const supabase = getServerSupabaseClient()
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Verify stack ownership
    const ownerCheck = await client.query(
      `SELECT id FROM stack WHERE id = $1 AND workspace_id = $2 AND archived_at IS NULL`,
      [stackId, workspaceId]
    )
    if (ownerCheck.rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Stack not found' }, { status: 404 })
    }

    // Update stack fields (only what was provided)
    const updates: string[] = ['updated_at = NOW()']
    const updateParams: unknown[] = []

    if (name !== undefined) {
      updateParams.push(name)
      updates.push(`name = $${updateParams.length}`)
    }
    if (provider !== undefined) {
      updateParams.push(provider)
      updates.push(`provider = $${updateParams.length}`)
    }
    if ('companyId' in body) {
      updateParams.push(companyId ?? null)
      updates.push(`company_id = $${updateParams.length}`)
    }
    if ('projectId' in body) {
      updateParams.push(projectId ?? null)
      updates.push(`project_id = $${updateParams.length}`)
    }
    if ('description' in body) {
      updateParams.push(description ?? null)
      updates.push(`description = $${updateParams.length}`)
    }

    if (updates.length > 1) {
      updateParams.push(stackId)
      await client.query(
        `UPDATE stack SET ${updates.join(', ')} WHERE id = $${updateParams.length}`,
        updateParams
      )
    }

    // Remove resources
    if (removeResourceIds.length > 0) {
      const placeholders = removeResourceIds.map((_: unknown, i: number) => `$${i + 2}`).join(', ')
      await client.query(
        `DELETE FROM stack_resource WHERE stack_id = $1 AND id IN (${placeholders})`,
        [stackId, ...removeResourceIds]
      )
    }

    // Upsert resources (insert or update by key)
    for (const r of resources) {
      await client.query(
        `INSERT INTO stack_resource (stack_id, key, value, kind, description)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (stack_id, key) DO UPDATE
           SET value = EXCLUDED.value,
               kind = EXCLUDED.kind,
               description = EXCLUDED.description,
               updated_at = NOW()`,
        [stackId, r.key, r.value, r.kind, r.description || null]
      )
    }

    // Remove secrets (soft: just delete the metadata row; Vault entry remains for audit)
    if (removeSecretIds.length > 0) {
      const placeholders = removeSecretIds.map((_: unknown, i: number) => `$${i + 2}`).join(', ')
      await client.query(
        `DELETE FROM stack_secret WHERE stack_id = $1 AND id IN (${placeholders})`,
        [stackId, ...removeSecretIds]
      )
    }

    // Upsert secrets — new plaintext → new Vault entry (rotation)
    for (const s of secrets) {
      const { data: vaultId, error: vaultErr } = await supabase.rpc('vault_store_secret', {
        p_name: `${workspaceId}/${stackId}/${s.key}`,
        p_secret: s.plaintext,
      })
      if (vaultErr || !vaultId) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: `Failed to store secret "${s.key}" in Vault` }, { status: 500 })
      }
      // plaintext dropped here
      await client.query(
        `INSERT INTO stack_secret (stack_id, key, vault_secret_id, description, rotation_interval_days, last_rotated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (stack_id, key) DO UPDATE
           SET vault_secret_id = EXCLUDED.vault_secret_id,
               description = COALESCE(EXCLUDED.description, stack_secret.description),
               rotation_interval_days = COALESCE(EXCLUDED.rotation_interval_days, stack_secret.rotation_interval_days),
               last_rotated_at = NOW(),
               updated_at = NOW()`,
        [stackId, s.key, vaultId, s.description || null, s.rotation_interval_days || null]
      )
    }

    await client.query('COMMIT')

    // Return updated stack
    const clientForRead = await pool.connect()
    try {
      const updated = await fetchStackWithDetails(clientForRead, stackId, workspaceId)
      return NextResponse.json({ success: true, stack: updated })
    } finally {
      clientForRead.release()
    }
  } catch (err: unknown) {
    await client.query('ROLLBACK')
    const message = err instanceof Error ? err.message : String(err)
    console.error('[PATCH /api/stacks/:id]', message)
    return NextResponse.json({ error: 'Failed to update stack' }, { status: 500 })
  } finally {
    client.release()
    await pool.end()
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
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.disabled ? 'Agent work is disabled' : 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id: stackId } = await params
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 422 })
  }

  const pool = getPool()
  const client = await pool.connect()
  try {
    const result = await client.query(
      `UPDATE stack
          SET archived_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND workspace_id = $2 AND archived_at IS NULL
        RETURNING id, name, archived_at`,
      [stackId, workspaceId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Stack not found' }, { status: 404 })
    }

    // Secrets remain in Vault for audit/recovery. Metadata rows stay too.
    return NextResponse.json({ success: true, archived: result.rows[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[DELETE /api/stacks/:id]', message)
    return NextResponse.json({ error: 'Failed to archive stack' }, { status: 500 })
  } finally {
    client.release()
    await pool.end()
  }
}
