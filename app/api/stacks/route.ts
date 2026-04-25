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
import { validateAIAuth } from '@/lib/doug-auth'
import { getServerSupabaseClient } from '@/lib/supabase'
import { Pool } from 'pg'

// ---------------------------------------------------------------------------
// DB connection (direct — Supabase service role via pg, same pattern as migrations)
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_PROVIDERS = ['supabase', 'vercel', 'railway', 'github', 'other'] as const
const VALID_KINDS = ['url', 'id', 'env_name', 'identifier', 'other'] as const

function secretMetadata(row: Record<string, unknown>) {
  // Never expose plaintext. Return only opaque metadata.
  return {
    id: row.id,
    stack_id: row.stack_id,
    key: row.key,
    vault_secret_id: row.vault_secret_id,   // opaque UUID — useless without service_role
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
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.disabled ? 'Agent work is disabled' : 'Unauthorized' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')
  const companyId   = searchParams.get('companyId')
  const projectId   = searchParams.get('projectId')
  const provider    = searchParams.get('provider')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 422 })
  }

  const pool = getPool()
  const client = await pool.connect()
  try {
    // Build dynamic WHERE clause
    const conditions: string[] = ['s.workspace_id = $1', 's.archived_at IS NULL']
    const params: unknown[]    = [workspaceId]

    if (companyId) {
      conditions.push(`s.company_id = $${params.length + 1}`)
      params.push(companyId)
    }
    if (projectId) {
      conditions.push(`s.project_id = $${params.length + 1}`)
      params.push(projectId)
    }
    if (provider) {
      if (!VALID_PROVIDERS.includes(provider as typeof VALID_PROVIDERS[number])) {
        return NextResponse.json({ error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` }, { status: 422 })
      }
      conditions.push(`s.provider = $${params.length + 1}`)
      params.push(provider)
    }

    const where = conditions.join(' AND ')

    const stacksResult = await client.query(
      `SELECT s.id, s.workspace_id, s.company_id, s.project_id,
              s.name, s.provider, s.description, s.created_by,
              s.created_at, s.updated_at
         FROM stack s
        WHERE ${where}
        ORDER BY s.created_at DESC`,
      params
    )

    const stacks = stacksResult.rows

    if (stacks.length === 0) {
      return NextResponse.json({ stacks: [] })
    }

    const stackIds = stacks.map(s => s.id)
    const placeholders = stackIds.map((_: unknown, i: number) => `$${i + 1}`).join(', ')

    // Fetch resources (plain values)
    const resourcesResult = await client.query(
      `SELECT id, stack_id, key, value, kind, description, created_at, updated_at
         FROM stack_resource
        WHERE stack_id IN (${placeholders})
        ORDER BY created_at ASC`,
      stackIds
    )

    // Fetch secret metadata (NO plaintext — vault_secret_id is opaque)
    const secretsResult = await client.query(
      `SELECT id, stack_id, key, vault_secret_id, description,
              last_rotated_at, rotation_interval_days, created_at, updated_at
         FROM stack_secret
        WHERE stack_id IN (${placeholders})
        ORDER BY created_at ASC`,
      stackIds
    )

    // Group by stack_id
    const resourcesByStack: Record<string, unknown[]> = {}
    const secretsByStack: Record<string, unknown[]>   = {}

    for (const r of resourcesResult.rows) {
      const sid = r.stack_id as string
      if (!resourcesByStack[sid]) resourcesByStack[sid] = []
      resourcesByStack[sid].push(r)
    }
    for (const s of secretsResult.rows) {
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
  } finally {
    client.release()
    await pool.end()
  }
}

// ---------------------------------------------------------------------------
// POST /api/stacks
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = validateAIAuth(request)
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.disabled ? 'Agent work is disabled' : 'Unauthorized' },
      { status: 401 }
    )
  }

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
    resources = [],
    secrets   = [],
  } = body as {
    workspaceId: string
    name: string
    provider: string
    companyId?: string
    projectId?: string
    description?: string
    resources?: Array<{ key: string; value: string; kind: string; description?: string }>
    secrets?: Array<{ key: string; plaintext: string; description?: string; rotation_interval_days?: number }>
  }

  // Validation
  if (!workspaceId || typeof workspaceId !== 'string') {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 422 })
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 422 })
  }
  if (!provider || !VALID_PROVIDERS.includes(provider as typeof VALID_PROVIDERS[number])) {
    return NextResponse.json({ error: `provider must be one of: ${VALID_PROVIDERS.join(', ')}` }, { status: 422 })
  }
  if (!Array.isArray(resources)) {
    return NextResponse.json({ error: 'resources must be an array' }, { status: 422 })
  }
  if (!Array.isArray(secrets)) {
    return NextResponse.json({ error: 'secrets must be an array' }, { status: 422 })
  }

  // Validate resources
  for (const r of resources) {
    if (!r.key || !r.value || !r.kind) {
      return NextResponse.json({ error: 'Each resource must have key, value, and kind' }, { status: 422 })
    }
    if (!VALID_KINDS.includes(r.kind as typeof VALID_KINDS[number])) {
      return NextResponse.json({ error: `Resource kind must be one of: ${VALID_KINDS.join(', ')}` }, { status: 422 })
    }
  }

  // Validate secrets
  for (const s of secrets) {
    if (!s.key || !s.plaintext) {
      return NextResponse.json({ error: 'Each secret must have key and plaintext' }, { status: 422 })
    }
    if (typeof s.plaintext !== 'string' || !s.plaintext.trim()) {
      return NextResponse.json({ error: `Secret "${s.key}" plaintext must be a non-empty string` }, { status: 422 })
    }
  }

  const supabase = getServerSupabaseClient()
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Insert stack
    const stackResult = await client.query(
      `INSERT INTO stack (workspace_id, company_id, project_id, name, provider, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, workspace_id, company_id, project_id, name, provider, description, created_by, created_at, updated_at`,
      [workspaceId, companyId || null, projectId || null, name.trim(), provider, description || null, auth.assistant || 'doug']
    )
    const stack = stackResult.rows[0]

    // Insert resources
    const insertedResources: unknown[] = []
    for (const r of resources) {
      const res = await client.query(
        `INSERT INTO stack_resource (stack_id, key, value, kind, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, stack_id, key, value, kind, description, created_at, updated_at`,
        [stack.id, r.key, r.value, r.kind, r.description || null]
      )
      insertedResources.push(res.rows[0])
    }

    // Insert secrets — call vault_store_secret RPC for each, store vault_secret_id
    const insertedSecretsMeta: unknown[] = []
    for (const s of secrets) {
      // Call vault RPC via Supabase service-role client
      const { data: vaultId, error: vaultErr } = await supabase.rpc('vault_store_secret', {
        p_name: `${workspaceId}/${stack.id}/${s.key}`,
        p_secret: s.plaintext,
      })
      if (vaultErr || !vaultId) {
        await client.query('ROLLBACK')
        console.error('[POST /api/stacks] vault_store_secret error:', vaultErr)
        return NextResponse.json({ error: `Failed to store secret "${s.key}" in Vault` }, { status: 500 })
      }
      // Plaintext is now in Vault. Store only the opaque vault_secret_id.
      const secRes = await client.query(
        `INSERT INTO stack_secret (stack_id, key, vault_secret_id, description, rotation_interval_days)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, stack_id, key, vault_secret_id, description, last_rotated_at, rotation_interval_days, created_at, updated_at`,
        [stack.id, s.key, vaultId, s.description || null, s.rotation_interval_days || null]
      )
      insertedSecretsMeta.push(secretMetadata(secRes.rows[0]))
      // plaintext is dropped here — never included in response
    }

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      stack: {
        ...stack,
        resources: insertedResources,
        secrets: insertedSecretsMeta,  // metadata only, NO plaintext
      },
    }, { status: 201 })
  } catch (err: unknown) {
    await client.query('ROLLBACK')
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/stacks]', message)
    return NextResponse.json({ error: 'Failed to create stack' }, { status: 500 })
  } finally {
    client.release()
    await pool.end()
  }
}
