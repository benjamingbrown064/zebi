/**
 * POST /api/build
 * First-value flow: parse a prompt → create company + project + tasks + note in one pass
 * Returns per-step results for UI rendering and partial-failure handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000'
const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

// ─── Types ──────────────────────────────────────────────────────────────────

interface AIPackage {
  company: { name: string; industry?: string }
  project: { title: string; description?: string }
  tasks: Array<{ title: string; description?: string; priority?: 1 | 2 | 3 }>
  note: { title: string; body: string }
}

export interface StepResult {
  success: boolean
  id?: string
  title?: string
  reused?: boolean
  error?: string
}

export interface BuildResult {
  workspaceId: string
  aiPackage: AIPackage
  created: {
    company: StepResult
    project: StepResult
    tasks: StepResult[]
    note: StepResult
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalise(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function resolveWorkspace(request: NextRequest): Promise<string> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => request.cookies.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return DEFAULT_WORKSPACE_ID

    const userId = session.user.id

    // Find existing workspace membership
    const member = await prisma.workspaceMember.findFirst({
      where: { userId },
      select: { workspaceId: true },
    })
    if (member) return member.workspaceId

    // Auto-create workspace for this user
    const ws = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: 'My Workspace', ownerId: userId as any, plan: 'free' },
      })
      await tx.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: userId as any, role: 'owner' },
      })
      const defaultStatuses = [
        { type: 'inbox', name: 'Inbox', sortOrder: 0 },
        { type: 'active', name: 'Active', sortOrder: 1 },
        { type: 'blocked', name: 'Blocked', sortOrder: 2 },
        { type: 'review', name: 'Review', sortOrder: 3 },
        { type: 'done', name: 'Done', sortOrder: 4 },
        { type: 'archived', name: 'Archived', sortOrder: 5 },
      ]
      await Promise.all(
        defaultStatuses.map((s) =>
          tx.status.create({ data: { workspaceId: workspace.id, ...s, isSystem: true } })
        )
      )
      return workspace
    })
    return ws.id
  } catch (e) {
    console.error('[build] workspace resolution error:', e)
    return DEFAULT_WORKSPACE_ID
  }
}

const AI_SYSTEM_PROMPT = `You are a business structure parser. Given a description of what someone wants to build, extract a structured package.

Return ONLY valid JSON matching this exact schema:
{
  "company": { "name": string, "industry"?: string },
  "project": { "title": string, "description"?: string },
  "tasks": [{ "title": string, "description"?: string, "priority"?: 1|2|3 }],
  "note": { "title": string, "body": string }
}

Rules:
- company.name: extract the company, product, or brand name. If unclear, infer a sensible name from context.
- project.title: a specific project name, not a generic label like "Main Project".
- tasks: exactly 4-5 tasks. Each title must be a concrete next action (verb-first), not a category. Good: "Draft onboarding email sequence". Bad: "Marketing".
- tasks priority: 1=high, 2=medium, 3=low. Default to 2.
- note.title: a clear kickoff note title like "[Project Name] — Kickoff".
- note.body: 2-3 sentences summarising what was created and the recommended next step.
- Do NOT include IDs, dates, or metadata. Names and text only.
- Be specific. Generic output is not acceptable.`

// ─── Route ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    // 1. Resolve workspace
    const workspaceId = await resolveWorkspace(request)

    // 2. AI: parse prompt into structured package
    let aiPackage: AIPackage
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: prompt.trim() },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 900,
      })

      const raw = completion.choices[0].message.content || '{}'
      const parsed = JSON.parse(raw)

      // Schema validation
      if (
        !parsed.company?.name ||
        !parsed.project?.title ||
        !Array.isArray(parsed.tasks) ||
        parsed.tasks.length === 0 ||
        !parsed.note?.title ||
        !parsed.note?.body
      ) {
        throw new Error('AI response missing required fields')
      }

      // Clamp tasks
      parsed.tasks = parsed.tasks.slice(0, 5)
      aiPackage = parsed as AIPackage
    } catch (e) {
      console.error('[build] AI parsing failed:', e)
      return NextResponse.json(
        { error: 'Could not understand that prompt. Try being a bit more specific.' },
        { status: 422 }
      )
    }

    // 3. Execute creation pipeline — sequential, track each step
    const created: BuildResult['created'] = {
      company: { success: false },
      project: { success: false },
      tasks: [],
      note: { success: false },
    }

    // Step 1: Company (with dedup)
    let companyId: string | null = null
    try {
      const normalisedTarget = normalise(aiPackage.company.name)
      const existing = await prisma.space.findMany({
        where: { workspaceId, archivedAt: null },
        select: { id: true, name: true },
      })
      const match = existing.find((s) => normalise(s.name) === normalisedTarget)

      if (match) {
        companyId = match.id
        created.company = { success: true, id: match.id, title: match.name, reused: true }
      } else {
        const space = await prisma.space.create({
          data: {
            workspaceId,
            name: aiPackage.company.name,
            industry: aiPackage.company.industry || null,
            createdBy: PLACEHOLDER_USER_ID,
          },
        })
        companyId = space.id
        created.company = { success: true, id: space.id, title: space.name, reused: false }
      }
    } catch (e) {
      console.error('[build] space step failed:', e)
      created.company = { success: false, error: 'Failed to create company' }
    }

    // Step 2: Project (with dedup — same company + normalised name)
    let projectId: string | null = null
    try {
      const normalisedProjectTarget = normalise(aiPackage.project.title)
      const existingProjects = await prisma.project.findMany({
        where: { workspaceId, archivedAt: null, ...(companyId ? { companyId } : {}) },
        select: { id: true, name: true },
      })
      const matchedProject = existingProjects.find(
        (p) => normalise(p.name) === normalisedProjectTarget
      )

      if (matchedProject) {
        projectId = matchedProject.id
        created.project = { success: true, id: matchedProject.id, title: matchedProject.name, reused: true }
      } else {
        const project = await prisma.project.create({
          data: {
            workspaceId,
            name: aiPackage.project.title,
            description: aiPackage.project.description || null,
            companyId,
            priority: 2,
          },
        })
        projectId = project.id
        created.project = { success: true, id: project.id, title: project.name, reused: false }
      }
    } catch (e) {
      console.error('[build] project step failed:', e)
      created.project = { success: false, error: 'Failed to create project' }
    }

    // Step 3: Tasks
    const defaultStatus = await prisma.status.findFirst({
      where: { workspaceId },
      orderBy: { sortOrder: 'asc' },
    })

    for (const taskDef of aiPackage.tasks) {
      try {
        if (!defaultStatus) throw new Error('No status found in workspace')
        const task = await prisma.task.create({
          data: {
            workspaceId,
            title: taskDef.title,
            description: taskDef.description || null,
            priority: taskDef.priority ?? 2,
            statusId: defaultStatus.id,
            companyId,
            projectId,
            createdBy: DEFAULT_USER_ID,
          },
        })
        created.tasks.push({ success: true, id: task.id, title: task.title })
      } catch (e) {
        console.error('[build] task step failed:', taskDef.title, e)
        created.tasks.push({ success: false, title: taskDef.title, error: 'Failed to create task' })
      }
    }

    // Step 4: Note
    try {
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO "Note" ("workspaceId", title, body, "noteType", "companyId", "projectId", "createdBy")
        VALUES (
          ${workspaceId},
          ${aiPackage.note.title},
          ${aiPackage.note.body},
          'plan',
          ${companyId},
          ${projectId},
          ${DEFAULT_USER_ID}::uuid
        )
        RETURNING id
      `
      created.note = { success: true, id: rows[0].id, title: aiPackage.note.title }
    } catch (e) {
      console.error('[build] note step failed:', e)
      created.note = { success: false, error: 'Failed to create note' }
    }

    const result: BuildResult = { workspaceId, aiPackage, created }
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('[build] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
