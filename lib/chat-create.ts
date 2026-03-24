/**
 * chat-create.ts
 * Pass 1 — Chat object creation execution layer
 *
 * Handles creation of: space, objective, project, task, document, inbox item
 * Called from the chat API route when intent = create_object and all required
 * fields are present. Returns a structured result for confirmation + UI card.
 */

import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import type { ObjectRef } from '@/app/api/assistant/chat/route'

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000'
const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreatableObjectType =
  | 'space'
  | 'objective'
  | 'project'
  | 'task'
  | 'document'
  | 'inbox'

export interface CreationPayload {
  objectType: CreatableObjectType
  fields: Record<string, any>
  missingRequired?: string     // field name that is missing (triggers follow-up question)
  clarificationQuestion?: string
  inferredFields?: Record<string, string> // fields the LLM inferred (for transparency)
}

export interface CreationResult {
  success: boolean
  objectType: CreatableObjectType
  object: ObjectRef
  confirmationText: string
  suggestedNextStep?: string
  error?: string
}

// ─── Required-field specs ──────────────────────────────────────────────────────

const REQUIRED_FIELDS: Record<CreatableObjectType, string[]> = {
  space:   ['name'],
  objective: ['title', 'companyId'],
  project:   ['name'],
  task:      ['title'],
  document:  ['title'],
  inbox:     ['content'],
}

// Human-readable field names for missing-field questions
const FIELD_QUESTIONS: Record<string, string> = {
  name:      'What do you want to call it?',
  title:     'What should the title be?',
  companyId: 'Which space should I attach this to?',
  content:   'What do you want to capture?',
}

// ─── Utility: resolve space name → ID ───────────────────────────────────────

export async function resolveSpaceId(
  nameOrId: string,
  workspaceId: string
): Promise<string | null> {
  // If it looks like a UUID, use directly
  if (/^[0-9a-f-]{36}$/i.test(nameOrId)) return nameOrId

  const spaces = await prisma.space.findMany({
    where: { workspaceId, archivedAt: null },
    select: { id: true, name: true },
  })

  const lower = nameOrId.toLowerCase()
  const match = spaces.find(
    c =>
      c.name.toLowerCase() === lower ||
      c.name.toLowerCase().includes(lower) ||
      lower.includes(c.name.toLowerCase())
  )
  return match?.id ?? null
}

// ─── Utility: resolve project name → ID ──────────────────────────────────────

export async function resolveProjectId(
  nameOrId: string,
  workspaceId: string
): Promise<string | null> {
  if (/^[0-9a-f-]{36}$/i.test(nameOrId)) return nameOrId

  const projects = await prisma.project.findMany({
    where: { workspaceId, archivedAt: null },
    select: { id: true, name: true },
  })

  const lower = nameOrId.toLowerCase()
  const match = projects.find(
    p =>
      p.name.toLowerCase() === lower ||
      p.name.toLowerCase().includes(lower) ||
      lower.includes(p.name.toLowerCase())
  )
  return match?.id ?? null
}

// ─── Validate payload — returns first missing required field ──────────────────

export function validateCreationPayload(payload: CreationPayload): string | null {
  const required = REQUIRED_FIELDS[payload.objectType]
  for (const field of required) {
    const val = payload.fields[field]
    if (!val || (typeof val === 'string' && val.trim() === '')) {
      return field
    }
  }
  return null
}

// ─── Generate document content via OpenAI ─────────────────────────────────────

async function generateDocumentContent(
  title: string,
  context: string,
  parentObject?: string
): Promise<string> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a business document writer. Write clear, practical first-draft documents for founders.
Keep them concise, structured, and actionable. Use markdown formatting.
Do not pad content. Do not add meta-commentary. Just write the document.`,
        },
        {
          role: 'user',
          content: `Write a first draft of a document titled "${title}"${parentObject ? ` for ${parentObject}` : ''}.
${context ? `Context: ${context}` : ''}
Keep it practical and specific. Use markdown headers and bullet points where appropriate.`,
        },
      ],
      temperature: 0.6,
      max_tokens: 600,
    })
    return completion.choices[0].message.content || `# ${title}\n\n*No content generated.*`
  } catch {
    return `# ${title}\n\n*Document created. Add content here.*`
  }
}

// ─── Markdown → TipTap (inline, no import to avoid circular deps) ──────────────

function markdownToTiptap(markdown: string): any {
  const lines = markdown.split('\n')
  const nodes: any[] = []

  for (const line of lines) {
    if (!line.trim()) continue
    if (line.startsWith('# ')) {
      nodes.push({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: line.slice(2) }] })
    } else if (line.startsWith('## ')) {
      nodes.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: line.slice(3) }] })
    } else if (line.startsWith('### ')) {
      nodes.push({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: line.slice(4) }] })
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      nodes.push({ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: line.slice(2) }] }] }] })
    } else {
      nodes.push({ type: 'paragraph', content: [{ type: 'text', text: line }] })
    }
  }

  return { type: 'doc', content: nodes.length > 0 ? nodes : [{ type: 'paragraph' }] }
}

// ─── Executors ────────────────────────────────────────────────────────────────

async function createSpace(
  fields: Record<string, any>,
  workspaceId: string
): Promise<CreationResult> {
  const space = await prisma.space.create({
    data: {
      workspaceId,
      name: fields.name,
      industry: fields.industry || null,
      stage: fields.stage || null,
      businessModel: fields.businessModel || null,
      revenue: fields.revenue ? parseFloat(fields.revenue) : null,
      createdBy: PLACEHOLDER_USER_ID,
    },
  })

  return {
    success: true,
    objectType: 'space',
    object: { type: 'task', id: space.id, title: space.name, meta: { objectType: 'space' } },
    confirmationText: `Done. I created a space called \`${space.name}\`.`,
    suggestedNextStep: `Want me to add its first objective as well?`,
  }
}

async function createObjective(
  fields: Record<string, any>,
  workspaceId: string
): Promise<CreationResult> {
  // Resolve companyId if given as name
  let companyId: string | null = fields.companyId || null
  let spaceName: string | null = null

  if (companyId) {
    const resolved = await resolveSpaceId(companyId, workspaceId)
    if (resolved) {
      companyId = resolved
      const co = await prisma.space.findUnique({ where: { id: companyId }, select: { name: true } })
      spaceName = co?.name ?? null
    }
  }

  // Sensible defaults for required non-nullable fields
  const today = new Date()
  const ninetyDaysOut = new Date(today)
  ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90)

  const objective = await prisma.objective.create({
    data: {
      workspaceId,
      companyId,
      title: fields.title,
      description: fields.description || null,
      objectiveType: fields.objectiveType || 'general',
      metricType: fields.metricType || 'custom',
      targetValue: fields.targetValue ?? 1,
      currentValue: 0,
      unit: fields.unit || null,
      startDate: fields.startDate ? new Date(fields.startDate) : today,
      deadline: fields.deadline ? new Date(fields.deadline) : ninetyDaysOut,
      status: 'active',
      progressPercent: 0,
      priority: fields.priority || 3,
      createdBy: DEFAULT_USER_ID,
    },
  })

  const spacePart = spaceName ? ` under \`${spaceName}\`` : ''
  return {
    success: true,
    objectType: 'objective',
    object: { type: 'objective', id: objective.id, title: objective.title, meta: { companyId, spaceName, objectType: 'objective' } },
    confirmationText: `Done. I created an **objective**${spacePart}: \`${objective.title}\`.`,
    suggestedNextStep: `Want me to create a project under it to get started?`,
  }
}

async function createProject(
  fields: Record<string, any>,
  workspaceId: string
): Promise<CreationResult> {
  let companyId: string | null = fields.companyId || null
  let spaceName: string | null = null
  let objectiveId: string | null = fields.objectiveId || null

  if (companyId) {
    const resolved = await resolveSpaceId(companyId, workspaceId)
    if (resolved) {
      companyId = resolved
      const co = await prisma.space.findUnique({ where: { id: companyId }, select: { name: true } })
      spaceName = co?.name ?? null
    }
  }

  const project = await prisma.project.create({
    data: {
      workspaceId,
      name: fields.name,
      description: fields.description || null,
      companyId,
      objectiveId,
      priority: fields.priority || 3,
    },
  })

  const parentPart = spaceName ? ` under \`${spaceName}\`` : ''
  return {
    success: true,
    objectType: 'project',
    object: { type: 'project', id: project.id, title: project.name, meta: { companyId, spaceName, objectType: 'project' } },
    confirmationText: `Done. I created a **project** called \`${project.name}\`${parentPart}.`,
    suggestedNextStep: `Want me to add a starter task to it?`,
  }
}

async function createTask(
  fields: Record<string, any>,
  workspaceId: string
): Promise<CreationResult> {
  let companyId: string | null = fields.companyId || null
  let projectId: string | null = fields.projectId || null
  let spaceName: string | null = null
  let projectName: string | null = null

  if (companyId && !/^[0-9a-f-]{36}$/i.test(companyId)) {
    const resolved = await resolveSpaceId(companyId, workspaceId)
    if (resolved) {
      companyId = resolved
      const co = await prisma.space.findUnique({ where: { id: companyId }, select: { name: true } })
      spaceName = co?.name ?? null
    }
  }

  if (projectId && !/^[0-9a-f-]{36}$/i.test(projectId)) {
    const resolved = await resolveProjectId(projectId, workspaceId)
    if (resolved) {
      projectId = resolved
      const pr = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })
      projectName = pr?.name ?? null
    }
  }

  const defaultStatus = await prisma.status.findFirst({
    where: { workspaceId },
    orderBy: { sortOrder: 'asc' },
  })

  if (!defaultStatus) throw new Error('No default status found in workspace')

  const task = await prisma.task.create({
    data: {
      workspaceId,
      title: fields.title,
      description: fields.description || null,
      statusId: defaultStatus.id,
      priority: fields.priority || 2,
      dueAt: fields.dueAt ? new Date(fields.dueAt) : null,
      companyId,
      projectId,
      objectiveId: fields.objectiveId || null,
      createdBy: DEFAULT_USER_ID,
    },
  })

  const parentParts = [projectName, spaceName].filter(Boolean)
  const parentStr = parentParts.length > 0 ? ` under \`${parentParts.join(' / ')}\`` : ''
  return {
    success: true,
    objectType: 'task',
    object: { type: 'task', id: task.id, title: task.title, meta: { priority: task.priority, companyId, projectId, objectType: 'task' } },
    confirmationText: `Done. I created a **task** called \`${task.title}\`${parentStr}.`,
    suggestedNextStep: `Want me to add notes or a due date to it?`,
  }
}

async function createDocument(
  fields: Record<string, any>,
  workspaceId: string
): Promise<CreationResult> {
  let companyId: string | null = fields.companyId || null
  let projectId: string | null = fields.projectId || null
  let spaceName: string | null = null
  let parentLabel: string | null = null

  if (companyId) {
    const resolved = await resolveSpaceId(companyId, workspaceId)
    if (resolved) {
      companyId = resolved
      const co = await prisma.space.findUnique({ where: { id: companyId }, select: { name: true } })
      spaceName = co?.name ?? null
      parentLabel = spaceName
    }
  }

  if (projectId) {
    const resolved = await resolveProjectId(projectId, workspaceId)
    if (resolved) {
      projectId = resolved
      const pr = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })
      if (pr?.name) parentLabel = pr.name
    }
  }

  // Content rules:
  // 1. Use provided content if available
  // 2. Generate first-draft only if user explicitly asked for substantive content
  // 3. Otherwise create an empty shell
  let rawContent: string
  if (fields.content) {
    rawContent = fields.content
  } else if (fields.generateContent) {
    rawContent = await generateDocumentContent(
      fields.title,
      fields.contentContext || '',
      parentLabel || undefined
    )
  } else {
    rawContent = `# ${fields.title}\n\n`
  }

  const contentRich = markdownToTiptap(rawContent)

  const doc = await prisma.document.create({
    data: {
      workspaceId,
      title: fields.title,
      documentType: fields.documentType || 'general',
      contentRich,
      companyId,
      projectId,
      createdBy: DEFAULT_USER_ID,
    },
  })

  const parentPart = parentLabel ? ` under \`${parentLabel}\`` : ''
  return {
    success: true,
    objectType: 'document',
    object: { type: 'document', id: doc.id, title: doc.title, meta: { companyId, projectId, objectType: 'document' } },
    confirmationText: `Done. I ${fields.generateContent ? 'created and drafted' : 'created'} a **document** called \`${doc.title}\`${parentPart}.`,
    suggestedNextStep: fields.generateContent ? `Want me to tighten it into a checklist?` : `Want me to draft the content for it?`,
  }
}

async function createInboxItem(
  fields: Record<string, any>,
  workspaceId: string
): Promise<CreationResult> {
  const item = await prisma.inboxItem.create({
    data: {
      workspaceId,
      rawText: fields.content,
      cleanedText: fields.cleanedText || null,
      sourceType: 'ai_generated',
      status: 'unprocessed',
      projectId: fields.projectId || null,
      createdBy: DEFAULT_USER_ID,
    },
  })

  return {
    success: true,
    objectType: 'inbox',
    object: { type: 'task', id: item.id, title: fields.content.slice(0, 60), meta: { objectType: 'inbox' } },
    confirmationText: `Done. I saved that to your **inbox**.`,
    suggestedNextStep: `Want me to turn it into a task or project?`,
  }
}

// ─── Main execute function ────────────────────────────────────────────────────

export async function executeCreation(
  payload: CreationPayload,
  workspaceId: string = DEFAULT_WORKSPACE_ID
): Promise<CreationResult> {
  const missing = validateCreationPayload(payload)
  if (missing) {
    return {
      success: false,
      objectType: payload.objectType,
      object: { type: 'task', id: '', title: '' },
      confirmationText: '',
      error: `missing_field:${missing}`,
    }
  }

  switch (payload.objectType) {
    case 'space':   return createSpace(payload.fields, workspaceId)
    case 'objective': return createObjective(payload.fields, workspaceId)
    case 'project':   return createProject(payload.fields, workspaceId)
    case 'task':      return createTask(payload.fields, workspaceId)
    case 'document':  return createDocument(payload.fields, workspaceId)
    case 'inbox':     return createInboxItem(payload.fields, workspaceId)
    default:
      throw new Error(`Unknown objectType: ${payload.objectType}`)
  }
}

export { FIELD_QUESTIONS, REQUIRED_FIELDS }
