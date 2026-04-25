// Stack #4 — GET /api/tasks/:id/context
// Task: d7931a62 — Build the agent context-bundle endpoint
//
// Returns the full execution bundle an agent needs to pick up and run a task:
//   { task, skill, stacks: [{ ...stack, resources, secrets: [{ key, plaintext }] }] }
//
// AUTH GATE:
//   1. Bearer token must resolve to a known agent (doug | harvey | theo | casper).
//   2. task.ownerAgent must equal the authenticated agent.
//   3. task.status must be "To-Do" or "Doing" — not Inbox, Review, Done, or Blocked.
//   Any failure → 403.
//
// STACKS INCLUDED:
//   All stacks where:
//     workspace_id = task.workspaceId
//     AND (company_id = task.companyId OR company_id IS NULL)
//     AND (project_id = task.projectId OR project_id IS NULL)
//   Workspace-level (both null) are always included.
//
// SECRETS:
//   Each secret is resolved via vault_resolve_secret() RPC (service_role, SECURITY DEFINER).
//   The RPC writes one audit row per call to audit_log_secret_access.
//   Plaintext is returned only in this endpoint and only to the owning agent.
//
// AUDIT:
//   vault_resolve_secret() writes the audit row internally — no separate insert needed.

import { NextRequest, NextResponse } from 'next/server'
import { validateAIAuth } from '@/lib/doug-auth'
import { getServerSupabaseClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

// Status names that allow context resolution
const ALLOWED_STATUS_NAMES = ['to-do', 'todo', 'doing', 'in progress', 'in-progress']

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const auth = validateAIAuth(request)
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.disabled ? 'Agent work is disabled' : 'Unauthorized' },
      { status: 401 }
    )
  }

  const agent = auth.assistant!

  const { taskId } = await params
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 422 })
  }

  try {
    // ── 2. Fetch task (with status + skill) ──────────────────────────────
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId },
      include: {
        status: true,
        skill: true,
        company: true,
        project: true,
        goal: true,
        objective: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // ── 3. Auth gate — ownership + status ────────────────────────────────
    const ownerAgent = (task as unknown as { ownerAgent?: string }).ownerAgent
    if (ownerAgent !== agent) {
      return NextResponse.json(
        { error: `Task is owned by "${ownerAgent || 'nobody'}", not "${agent}". Access denied.` },
        { status: 403 }
      )
    }

    const statusName = task.status?.name?.toLowerCase().replace(/[\s_-]+/g, '-') ?? ''
    const statusNorm = statusName.replace(/-/g, '')
    const isAllowed = ALLOWED_STATUS_NAMES.some(allowed => allowed.replace(/-/g, '') === statusNorm)

    if (!isAllowed) {
      return NextResponse.json(
        { error: `Task status "${task.status?.name}" is not eligible for context resolution. Only To-Do and Doing tasks can be fetched.` },
        { status: 403 }
      )
    }

    // ── 4. Resolve stacks ─────────────────────────────────────────────────
    // Include workspace-level stacks + company/project-scoped if the task has those IDs.
    const companyId = (task as unknown as { companyId?: string }).companyId ?? null
    const projectId = (task as unknown as { projectId?: string }).projectId ?? null

    // Build the stack WHERE clause:
    //   workspace match
    //   AND company_id matches task companyId OR is null
    //   AND project_id matches task projectId OR is null
    const companyFilter = companyId
      ? `(s.company_id = '${companyId}' OR s.company_id IS NULL)`
      : `s.company_id IS NULL`
    const projectFilter = projectId
      ? `(s.project_id = '${projectId}' OR s.project_id IS NULL)`
      : `s.project_id IS NULL`

    const rawStacks = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s.id, s.name, s.provider, s.description, s.company_id, s.project_id
         FROM stack s
        WHERE s.workspace_id = '${workspaceId}'
          AND ${companyFilter}
          AND ${projectFilter}
          AND s.archived_at IS NULL
        ORDER BY s.created_at ASC`
    )

    const supabase = getServerSupabaseClient()
    const ip = clientIp(request)

    // For each stack, fetch resources + resolve secrets
    const stacks = await Promise.all(
      rawStacks.map(async (s) => {
        const stackId = s.id as string

        const resources = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT key, value, kind, description
             FROM stack_resource
            WHERE stack_id = '${stackId}'::uuid
            ORDER BY created_at ASC`
        )

        const secretMeta = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
          `SELECT key, vault_secret_id, description
             FROM stack_secret
            WHERE stack_id = '${stackId}'::uuid
            ORDER BY created_at ASC`
        )

        // Resolve each secret's plaintext via vault_resolve_secret RPC
        // The RPC writes the audit row automatically (SECURITY DEFINER, service_role only)
        const secrets: Array<{ key: string; plaintext: string; description: string | null }> = []
        for (const sm of secretMeta) {
          const { data: plaintext, error: vaultErr } = await supabase.rpc('vault_resolve_secret', {
            p_vault_secret_id: sm.vault_secret_id as string,
            p_audit_context: {
              agent,
              task_id: taskId,
              ip,
            },
          })

          if (vaultErr || plaintext === null) {
            console.error('[GET /api/tasks/:id/context] vault_resolve_secret error:', vaultErr)
            return NextResponse.json(
              { error: `Failed to resolve secret "${sm.key}" for stack "${s.name}"` },
              { status: 500 }
            )
          }

          secrets.push({
            key: sm.key as string,
            plaintext: plaintext as string,
            description: (sm.description as string) ?? null,
          })
        }

        return {
          id: stackId,
          name: s.name,
          provider: s.provider,
          description: s.description ?? null,
          company_id: s.company_id ?? null,
          project_id: s.project_id ?? null,
          resources: resources.map(r => ({
            key: r.key,
            value: r.value,
            kind: r.kind,
            description: r.description ?? null,
          })),
          secrets,
        }
      })
    )

    // Handle the case where one of the stacks returned a NextResponse error
    // (vault_resolve_secret failed for a secret)
    for (const s of stacks) {
      if (s instanceof NextResponse) return s
    }

    // ── 5. Build response ─────────────────────────────────────────────────
    const skill = (task as unknown as { skill?: Record<string, unknown> }).skill ?? null

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status?.name,
        statusId: task.statusId,
        priority: task.priority,
        ownerAgent,
        companyId,
        projectId,
        dependencyIds: task.dependencyIds,
        definitionOfDone: (task as unknown as { definitionOfDone?: string }).definitionOfDone ?? null,
        expectedOutcome: (task as unknown as { expectedOutcome?: string }).expectedOutcome ?? null,
        workspaceId: task.workspaceId,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      },
      skill: skill
        ? {
            id: (skill as { id: string }).id,
            title: (skill as { title: string }).title,
            description: (skill as { description?: string }).description ?? null,
            category: (skill as { category: string }).category,
            skillType: (skill as { skillType: string }).skillType,
            steps: (skill as { steps: unknown }).steps,
            qualityCriteria: (skill as { qualityCriteria: unknown }).qualityCriteria,
            examples: (skill as { examples?: unknown }).examples ?? null,
            version: (skill as { version: number }).version,
          }
        : null,
      stacks: stacks as Array<{
        id: string
        name: unknown
        provider: unknown
        description: unknown
        company_id: unknown
        project_id: unknown
        resources: Array<{ key: unknown; value: unknown; kind: unknown; description: unknown }>
        secrets: Array<{ key: string; plaintext: string; description: string | null }>
      }>,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/tasks/:id/context]', message)
    return NextResponse.json({ error: 'Failed to build context bundle' }, { status: 500 })
  }
}
