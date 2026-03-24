import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'
import OpenAI from 'openai'

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'
const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type IntentType = 'daily_priority' | 'goal_progress' | 'planning' | 'task_creation' | 'summary' | 'chat'

interface PlanResponse {
  intent?: string
  mode: 'chat' | 'plan'
  response: string
  plan?: {
    noteTitle: string
    noteBody: string
    tasks: Array<{
      title: string
      description: string
      priority: number
    }>
    companyId?: string
    projectId?: string
    objectiveId?: string
    needsConfirmation?: boolean
    confirmationQuestion?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Use default workspace — chat runs inside the authenticated app, no separate auth needed
    let workspaceId = DEFAULT_WORKSPACE_ID
    try {
      const resolved = await requireWorkspace()
      if (resolved) workspaceId = resolved
    } catch {
      // Fall back to default workspace ID
    }
    const { message, conversationId, context } = body

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get current operating mode
    let activeMode: 'pressure' | 'plateau' | 'momentum' | 'drift' | undefined
    try {
      const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { operatingMode: true, modeSetBy: true, modeExpiresAt: true },
      })
      if (ws?.operatingMode) {
        const validModes = ['pressure', 'plateau', 'momentum', 'drift']
        if (validModes.includes(ws.operatingMode)) {
          // Check manual override hasn't expired
          if (ws.modeSetBy === 'manual' && ws.modeExpiresAt && new Date() > ws.modeExpiresAt) {
            activeMode = 'momentum'
          } else {
            activeMode = ws.operatingMode as typeof activeMode
          }
        }
      }
    } catch (e) {
      // Mode detection failure should not break chat
    }

    // Get or create conversation
    let conversation
    let conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []

    if (conversationId) {
      conversation = await prisma.aIConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      if (conversation) {
        conversationHistory = conversation.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      }
    }

    if (!conversation) {
      conversation = await prisma.aIConversation.create({
        data: {
          workspaceId,
          userId: PLACEHOLDER_USER_ID,
          context: context || {},
        },
        include: { messages: true },
      })
    }

    // Save user message
    await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    })

    // Load workspace context
    const [companies, objectives, tasks, notes] = await Promise.all([
      prisma.company.findMany({
        where: { workspaceId, archivedAt: null },
        select: { id: true, name: true, industry: true, stage: true, revenue: true },
      }),
      prisma.objective.findMany({
        where: { workspaceId, status: { in: ['active', 'on_track', 'at_risk', 'blocked'] } },
        orderBy: { deadline: 'asc' },
        take: 10,
        select: { id: true, title: true, status: true, deadline: true, companyId: true, description: true },
      }),
      prisma.task.findMany({
        where: { workspaceId, archivedAt: null, completedAt: null },
        take: 20,
        orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }],
        select: { id: true, title: true, priority: true, dueAt: true, companyId: true, objectiveId: true, description: true },
      }),
      prisma.$queryRaw<{id: string, title: string, body: string, noteType: string, companyId: string | null, updatedAt: Date}[]>`
        SELECT id, title, body, "noteType", "companyId", "updatedAt"
        FROM "Note"
        WHERE "workspaceId" = ${workspaceId}
        ORDER BY "updatedAt" DESC
        LIMIT 5
      `,
    ])

    // Build system prompt with workspace context
    const systemPrompt = buildSystemPrompt(companies, objectives, tasks, notes, activeMode, conversation.context as any)

    // Call OpenAI with conversation history
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
      { role: 'user', content: message },
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const responseText = completion.choices[0].message.content || '{}'
    let aiResponse: PlanResponse

    try {
      aiResponse = JSON.parse(responseText)
    } catch (e) {
      // Fallback if JSON parsing fails
      aiResponse = {
        mode: 'chat',
        response: responseText,
      }
    }

    // Parse intent from response
    const intent = aiResponse.intent || 'chat'

    // Handle plan mode
    let planResult: any = null
    if (aiResponse.mode === 'plan' && aiResponse.plan) {
      planResult = await handlePlanMode(
        workspaceId,
        conversation.id,
        aiResponse.plan,
        conversation.context as any
      )
    }

    // Save assistant message
    const assistantMessage = await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.response,
        metadata: {
          model: 'gpt-4o-mini',
          tokens: completion.usage?.total_tokens || 0,
          cost: calculateCost(completion.usage?.total_tokens || 0),
          mode: aiResponse.mode,
          intent,
          ...(planResult && { plan: planResult }),
        } as any,
      },
    })

    return NextResponse.json({
      conversationId: conversation.id,
      message: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        metadata: assistantMessage.metadata,
        createdAt: assistantMessage.createdAt,
      },
      ...(planResult && { plan: planResult }),
    })
  } catch (error) {
    console.error('[AI Chat] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function buildSystemPrompt(
  companies: any[],
  objectives: any[],
  tasks: any[],
  notes: any[],
  operatingMode?: string,
  conversationContext?: any
): string {

  const companyCtx = companies.length > 0
    ? companies.map(c => `- ${c.name} (ID: ${c.id}, industry: ${c.industry || 'unknown'}, stage: ${c.stage || 'unknown'}${c.revenue ? `, MRR: £${Number(c.revenue)/1000}k` : ''})`).join('\n')
    : 'No companies yet.'

  const objectiveCtx = objectives.length > 0
    ? objectives.map(o => {
        const co = companies.find(c => c.id === o.companyId)
        const deadline = o.deadline ? ` — deadline ${new Date(o.deadline).toLocaleDateString('en-GB')}` : ''
        return `- [${o.status.toUpperCase()}] ${o.title}${deadline}${co ? ` (${co.name})` : ''}${o.description ? `\n  Context: ${o.description.slice(0, 120)}` : ''}`
      }).join('\n')
    : 'No active objectives.'

  const taskCtx = tasks.length > 0
    ? tasks.map(t => {
        const co = companies.find(c => c.id === t.companyId)
        const due = t.dueAt ? ` due ${new Date(t.dueAt).toLocaleDateString('en-GB')}` : ''
        const pri = t.priority === 1 ? '🔴' : t.priority === 2 ? '🟡' : '⚪'
        return `${pri} ${t.title}${due}${co ? ` [${co.name}]` : ''}${t.description ? ` — ${t.description.slice(0, 80)}` : ''}`
      }).join('\n')
    : 'No open tasks.'

  const noteCtx = notes.length > 0
    ? notes.map(n => `- [${n.noteType}] ${n.title}: ${n.body.slice(0, 150)}...`).join('\n')
    : 'No recent notes.'

  const modeCtx = operatingMode ? `\nOperating mode: ${operatingMode}` : ''

  return `You are Zebi Chat — an operating partner for a founder.

You are not a task manager assistant.
You are not a polite backlog printer.
You are a sharp, calm operator who helps the founder decide what matters and what to do next.

## Your workspace context

### Companies
${companyCtx}

### Active objectives (ordered by deadline)
${objectiveCtx}

### Open tasks (ordered by priority then due date)
${taskCtx}

### Recent notes and plans
${noteCtx}
${modeCtx}

---

## How to respond

You must ALWAYS return valid JSON in this exact shape:
{
  "intent": "daily_priority" | "goal_progress" | "planning" | "task_creation" | "summary" | "chat",
  "mode": "chat" | "plan",
  "response": "your response text here",
  "plan": { ... } // only when mode is "plan"
}

---

## Intent classification rules

Classify the user's intent before forming your answer:

- **daily_priority**: "what should I work on today?", "what matters most today?", "what do I need to do today?", "plan my day"
- **goal_progress**: "what gets me closer to my goals?", "how do I move faster?", "what would have the biggest impact?", "what's the best use of my time?"
- **planning**: "make a plan for X", "plan out X", "help me organise X", "create tasks for X", "turn this into a plan"
- **task_creation**: "create a task", "add a task", "turn that into tasks"
- **summary**: "what have I been working on?", "what's the status of X?"
- **chat**: everything else

---

## Response rules by intent

### daily_priority
Answer with:
- The single most important focus for today
- 2–3 concrete, specific supporting actions
- A short "why this matters now" explanation tied to an objective, deadline, or business pressure
- Optionally: what to ignore today

Format your response like this (plain text, no extra markdown headers beyond these):

**Today's priority**
[one clear focus — specific, not a category label]

**Why this matters now**
[tied to real objective / deadline / bottleneck — not a generic reason]

**Do these next**
1. [specific action]
2. [specific action]
3. [specific action]

**Ignore for now** (optional)
[useful de-prioritisation if there's noise]

### goal_progress
Answer with:
- The highest-leverage move today relative to active objectives
- Why it beats alternatives
- 3 specific actions

Format:

**Best move today**
[highest-leverage action]

**Why this gets you closer**
[tied to revenue / launch / traction / validation — brief]

**3 moves that matter**
1. [specific action]
2. [specific action]
3. [specific action]

### planning
Switch mode to "plan". Generate a note + tasks. Set mode: "plan" in response.

### task_creation
Only create tasks if all of these pass:
1. The task is specific (not a category label)
2. It's single-action or tightly scoped
3. It's connected to a known goal/objective/project
4. It's clearly useful within the next few days

If criteria don't pass, suggest the task in the response text and ask: "Want me to create that as a task?"

### summary / chat
Answer naturally and concisely.

---

## Ranking logic — apply this before answering daily_priority or goal_progress

When deciding what matters most, rank by:

**High weight:**
- Direct revenue impact
- Direct path to launch or validation
- Unblocks other work
- Close deadline
- Linked to active objective
- Founder-stated priority

**Medium weight:**
- Recent momentum in same area
- Dependency for upcoming meeting
- External commitment (partner, customer, pilot)

**Negative weight (deprioritise):**
- Generic hygiene or admin tasks
- Broad tasks with no measurable outcome
- Low-context orphan tasks
- Tasks that sound good but don't change the scoreboard

**Key rule:** A task called "Launch Marketing Campaign" should NEVER be surfaced raw.
Always translate it into the actual next move:
- BAD: "Launch marketing campaign"
- GOOD: "Finalise landing page CTA and send the link to 10 target users"

---

## Quality rules

MUST:
- Be concise and specific
- Have a point of view
- Explain why
- Ground answers in the live workspace context above
- Reduce noise — don't list everything, pick what matters

MUST NOT:
- Dump a list of recent tasks as an answer
- Answer daily_priority and goal_progress the same way
- Use vague management language
- Auto-create multiple generic tasks
- Sound like a generic chatbot

## Tone
Sharp. Calm. Useful. Plain English. A little personality is fine. No fluff. No fake enthusiasm. No motivational filler.

---

## Auto-task creation rules

Default: do NOT auto-create tasks from a priority answer.

Only auto-create tasks (set mode: "plan") when:
- User explicitly asked for a plan or task creation, AND
- The tasks you'd create are specific, scoped, and non-generic

If you're recommending actions but aren't sure they meet the bar for task creation, include them in the response text and end with:
"Want me to turn these into tasks?"

---

## Context inference for plan mode

When mode is "plan":
- Infer companyId from conversation context first, then from task/objective data
- Only set needsConfirmation: true when genuinely ambiguous (multiple equal candidates)
- Limit tasks to 3–5 maximum — specific and actionable only

${conversationContext?.linkedNoteId ? `\nThis conversation has an existing linked note ID: ${conversationContext.linkedNoteId}. Update that note rather than creating a new one.` : ''}
`
}

async function handlePlanMode(
  workspaceId: string,
  conversationId: string,
  plan: PlanResponse['plan'],
  conversationContext: any
): Promise<any> {
  if (!plan) return null

  const existingNoteId = conversationContext?.linkedNoteId
  let noteId: string
  let noteTitle = plan.noteTitle
  let tasksCreated: Array<{ id: string; title: string }> = []

  // Create or update note via raw SQL (Note model added after Prisma client was last generated)
  if (existingNoteId) {
    try {
      await prisma.$executeRaw`
        UPDATE "Note" SET title = ${plan.noteTitle}, body = ${plan.noteBody}, "updatedAt" = now()
        WHERE id = ${existingNoteId}
      `
      noteId = existingNoteId
    } catch {
      // Fall through to create new
      const rows = await prisma.$queryRaw<{id: string}[]>`
        INSERT INTO "Note" (id, "workspaceId", title, body, "noteType", "companyId", "projectId", "objectiveId", "createdBy", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${workspaceId}, ${plan.noteTitle}, ${plan.noteBody}, 'plan',
          ${plan.companyId || null}, ${plan.projectId || null}, ${plan.objectiveId || null},
          ${DEFAULT_USER_ID}::uuid, now(), now())
        RETURNING id
      `
      noteId = rows[0].id
    }
  } else {
    const rows = await prisma.$queryRaw<{id: string}[]>`
      INSERT INTO "Note" (id, "workspaceId", title, body, "noteType", "companyId", "projectId", "objectiveId", "createdBy", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${workspaceId}, ${plan.noteTitle}, ${plan.noteBody}, 'plan',
        ${plan.companyId || null}, ${plan.projectId || null}, ${plan.objectiveId || null},
        ${DEFAULT_USER_ID}::uuid, now(), now())
      RETURNING id
    `
    noteId = rows[0].id
    await prisma.aIConversation.update({
      where: { id: conversationId },
      data: { context: { ...conversationContext, linkedNoteId: noteId, inferredCompanyId: plan.companyId } },
    })
  }

  // Create tasks if no confirmation needed
  if (!plan.needsConfirmation && plan.tasks && plan.tasks.length > 0) {
    // Get default status
    const defaultStatus = await prisma.status.findFirst({
      where: { workspaceId },
      orderBy: { sortOrder: 'asc' },
    })

    if (defaultStatus) {
      for (const task of plan.tasks.slice(0, 5)) {
        const createdTask = await prisma.task.create({
          data: {
            workspaceId,
            title: task.title,
            description: task.description,
            priority: task.priority || 2,
            statusId: defaultStatus.id,
            companyId: plan.companyId || null,
            projectId: plan.projectId || null,
            createdBy: DEFAULT_USER_ID,
          },
        })
        tasksCreated.push({
          id: createdTask.id,
          title: createdTask.title,
        })
      }
    }
  }

  return {
    noteId,
    noteTitle,
    tasksCreated,
    needsConfirmation: plan.needsConfirmation || false,
    confirmationQuestion: plan.confirmationQuestion,
  }
}

function calculateCost(tokens: number): number {
  // GPT-4o-mini pricing: $0.150 / 1M input tokens, $0.600 / 1M output tokens
  // Rough estimate: assume 50/50 split
  return (tokens / 1_000_000) * 0.375
}
