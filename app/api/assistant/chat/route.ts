import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'
import OpenAI from 'openai'

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'
const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type IntentType = 'daily_priority' | 'goal_progress' | 'planning' | 'task_creation' | 'summary' | 'chat' | 'completion_report' | 'task_update_confirm' | 'priority_rejection' | 'task_list' | 'object_reference'

export interface ObjectRef {
  type: 'task' | 'note' | 'document' | 'project' | 'objective'
  id: string
  title: string
  meta?: Record<string, any>
}

interface PlanResponse {
  intent?: string
  mode: 'chat' | 'plan'
  response: string
  referencedObjectTitle?: string   // Pass B: for object_reference intent
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

    // Handle completion_report intent
    if (intent === 'completion_report') {
      const contextData = conversation.context as any
      const lastSuggestedActions = contextData?.lastSuggestedActions || []
      
      // Fetch open tasks to match against
      const openTasks = await prisma.task.findMany({
        where: { 
          workspaceId, 
          archivedAt: null, 
          completedAt: null 
        },
        select: { id: true, title: true }
      })
      
      // Find matches
      const matchedTasks = lastSuggestedActions
        .filter((action: any) => action.taskId)
        .map((action: any) => {
          const task = openTasks.find(t => t.id === action.taskId)
          return task ? { taskId: task.id, title: task.title } : null
        })
        .filter((t: any) => t !== null)
      
      // Store pending completions
      if (matchedTasks.length > 0) {
        await prisma.aIConversation.update({
          where: { id: conversation.id },
          data: {
            context: {
              ...contextData,
              pendingCompletions: matchedTasks
            }
          }
        })
      }
    }

    // Handle task_update_confirm intent
    if (intent === 'task_update_confirm') {
      const contextData = conversation.context as any
      const pendingCompletions = contextData?.pendingCompletions || []
      
      if (pendingCompletions.length > 0) {
        // Mark tasks as complete
        await prisma.task.updateMany({
          where: { 
            id: { in: pendingCompletions.map((t: any) => t.taskId) },
            workspaceId 
          },
          data: { completedAt: new Date() }
        })
        
        // Clear pending completions from context
        await prisma.aIConversation.update({
          where: { id: conversation.id },
          data: {
            context: {
              ...contextData,
              pendingCompletions: []
            }
          }
        })
      }
    }

    // --- Pass B: Object grounding ---
    // Collect real objects to surface in UI
    let resolvedObjects: ObjectRef[] = []
    const ctxData = conversation.context as any

    if (intent === 'task_list') {
      // Return real tasks with IDs
      const listedTasks = await prisma.task.findMany({
        where: { workspaceId, archivedAt: null, completedAt: null },
        orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }],
        take: 10,
        select: { id: true, title: true, priority: true, dueAt: true, description: true, companyId: true },
      })
      resolvedObjects = listedTasks.map(t => ({
        type: 'task' as const,
        id: t.id,
        title: t.title,
        meta: {
          priority: t.priority,
          dueAt: t.dueAt,
          description: t.description,
          companyId: t.companyId,
        },
      }))
      // Store in context so future refs can use them
      await prisma.aIConversation.update({
        where: { id: conversation.id },
        data: {
          context: {
            ...ctxData,
            lastListedObjects: resolvedObjects,
          },
        },
      })
    }

    if (intent === 'object_reference') {
      // Resolve "this task", "that note", "add this to it" etc.
      const refTitle = aiResponse.referencedObjectTitle?.toLowerCase() || ''
      const lastListed: ObjectRef[] = ctxData?.lastListedObjects || []
      const lastSuggested: any[] = ctxData?.lastSuggestedActions || []

      // Try to match against last listed objects first
      let match = lastListed.find(o =>
        refTitle && o.title.toLowerCase().includes(refTitle.slice(0, 20))
      )

      // Fallback: last suggested actions that have a real taskId
      if (!match && lastSuggested.length > 0) {
        const withId = lastSuggested.filter(a => a.taskId)
        if (withId.length === 1) {
          // Unambiguous — use it
          match = { type: 'task', id: withId[0].taskId, title: withId[0].title }
        }
      }

      if (match) {
        resolvedObjects = [match]
        // Store resolved object for follow-up references
        await prisma.aIConversation.update({
          where: { id: conversation.id },
          data: {
            context: {
              ...ctxData,
              lastResolvedObject: match,
            },
          },
        })
      }
    }

    // Track newly created objects from plan mode
    if (planResult && planResult.tasksCreated?.length > 0) {
      const createdRefs: ObjectRef[] = planResult.tasksCreated.map((t: any) => ({
        type: 'task' as const,
        id: t.id,
        title: t.title,
        meta: { source: 'plan' },
      }))
      if (planResult.noteId) {
        createdRefs.push({
          type: 'note' as const,
          id: planResult.noteId,
          title: planResult.noteTitle || 'Plan note',
          meta: { source: 'plan' },
        })
      }
      await prisma.aIConversation.update({
        where: { id: conversation.id },
        data: {
          context: {
            ...((conversation.context as any) || {}),
            lastCreatedObjects: createdRefs,
          },
        },
      })
    }
    // --- End Pass B ---

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

    // Extract and store suggested actions after daily_priority or goal_progress
    if (intent === 'daily_priority' || intent === 'goal_progress') {
      await extractAndStoreLastActions(
        aiResponse.response,
        tasks,
        conversation.id,
        conversation.context as any,
        intent
      )
    }

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
      ...(resolvedObjects.length > 0 && { objects: resolvedObjects }),
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

  const lastActionsCtx = conversationContext?.lastSuggestedActions?.length > 0
    ? `\n### Last suggested actions\n${conversationContext.lastSuggestedActions.map((a: any) => `- ${a.title}${a.taskId ? ` (task ID: ${a.taskId})` : ' (recommendation only)'}`).join('\n')}`
    : ''

  const pendingCtx = conversationContext?.pendingCompletions?.length > 0
    ? `\n### Pending task completions (awaiting confirmation)\n${conversationContext.pendingCompletions.map((t: any) => `- ${t.title} (ID: ${t.taskId})`).join('\n')}`
    : ''

  const lastListedCtx = conversationContext?.lastListedObjects?.length > 0
    ? `\n### Last listed objects (use these IDs for references)\n${conversationContext.lastListedObjects.map((o: any) => `- [${o.type}] ${o.title} (ID: ${o.id})`).join('\n')}`
    : ''

  const lastCreatedCtx = conversationContext?.lastCreatedObjects?.length > 0
    ? `\n### Last created objects\n${conversationContext.lastCreatedObjects.map((o: any) => `- [${o.type}] ${o.title} (ID: ${o.id})`).join('\n')}`
    : ''

  const lastResolvedCtx = conversationContext?.lastResolvedObject
    ? `\n### Currently resolved object (the "it"/"this" in conversation)\n- [${conversationContext.lastResolvedObject.type}] ${conversationContext.lastResolvedObject.title} (ID: ${conversationContext.lastResolvedObject.id})`
    : ''

  return `You are Zebi Chat — an operating partner for a founder.
${lastListedCtx}
${lastCreatedCtx}
${lastResolvedCtx}

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
${lastActionsCtx}
${pendingCtx}

---

## How to respond

You must ALWAYS return valid JSON in this exact shape:
{
  "intent": "daily_priority" | "goal_progress" | "planning" | "task_creation" | "summary" | "chat" | "completion_report" | "task_update_confirm" | "priority_rejection",
  "mode": "chat" | "plan",
  "response": "your response text here",
  "plan": { ... } // only when mode is "plan"
}

---

## Core operating principles

### 1. Act first, explain second
If the user's intent is clear and safe, do it. Then confirm. Do not narrate before acting.
Never drift back into suggestion mode when the user asked for a specific action.

### 2. Object-aware language
Every reply that involves an operation must name the object type.
- tasks, documents, notes, projects, objectives — use the real name
- "I added a document to the task..." not "I updated things..."
- "I marked 3 tasks complete..." not "Done."

### 3. Honest provenance labelling
Always be explicit about whether something is:
- a recommendation ("suggested next action — not yet in Zebi")
- a stored task ("this task exists in Zebi under [objective]")
- an AI-generated task ("created from the previous planning step")
Never blur these three categories.

### 4. Specific post-action confirmations
After any change, confirm:
- what object type changed
- what operation was performed
- what it is now called or what its new state is
Never reply with just "Done." — always follow with the specific detail.

### 5. Rejected-priority rerouting
When the user rejects a recommended priority:
- acknowledge in one line
- give the next-best option
- explain the trade-off (why this is now the best alternative)
Format: "Fair. If [X] is off the table, the next best move is [Y] because [specific reason]."

---

## Intent classification rules

Classify the user's intent before forming your answer:

- **daily_priority**: "what should I work on today?", "what matters most today?", "what do I need to do today?", "plan my day"
- **goal_progress**: "what gets me closer to my goals?", "how do I move faster?", "what would have the biggest impact?", "what's the best use of my time?"
- **planning**: "make a plan for X", "plan out X", "help me organise X", "create tasks for X", "turn this into a plan"
- **task_creation**: "create a task", "add a task", "turn that into tasks"
- **summary**: "what have I been working on?", "what's the status of X?"
- **completion_report**: "I've done those", "sorted", "done", "finished", "completed", "all done", "that's done", "I did those", "done now"
- **task_update_confirm**: "yes", "yes please", "go ahead", "do it", "yep", "sure", "confirm"
- **priority_rejection**: "I can't work on that", "what else should I work on", "something else", "not today", "can't do that one", "skip that", "not that one"
- **task_list**: "show me my tasks", "list tasks", "what tasks do I have", "show tasks", "what's open", "what's in my backlog"
- **object_reference**: "this task", "that one", "add this to it", "attach it to", "link that to" — the user is referencing an object from earlier in the conversation
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

### completion_report
The user is saying work is done.
- Check lastSuggestedActions from conversation context to map against real tasks
- Apply confidence threshold: high (2+ matches) / medium (1 match) / low (no matches)
- Ask for confirmation before marking anything complete
- Use these exact patterns:
  - High: "Nice. Want me to mark those as complete in Zebi?"
  - Medium: "I can match [N] of those to tasks in Zebi. Want me to close those?"
  - Low: "Those looked more like recommendations than tracked tasks. I can log that as progress or move to the next priority — which works better?"
- Never auto-complete without confirmation
- Keep it short and direct

### task_update_confirm
The user has confirmed they want tasks marked complete.
- Confirm the updates were applied
- Keep it brief: "Done. [number] tasks marked complete."
- Do NOT generate a new priority list yet (that is Pass 2)
- End with something natural like: "What's next?" or "Want me to pull up the next priority?"

### priority_rejection
The user has rejected or deprioritised the recommended task.
Format:
"Fair. If [rejected item] is off the table today, the next best move is [next best option] because [specific reason tied to objectives/revenue/deadlines/blockers].

Do these instead:
1. [specific action]
2. [specific action]
3. [specific action]"

The "because" must be specific — tied to a real objective, deadline, blocker, or revenue path from the workspace context.
Do not just pick the next item. Explain the trade-off.

### task_list
Return up to 10 open tasks. Format each as a clear one-liner with priority emoji.
The server will attach real task objects with IDs to the response.
In your response text, summarise briefly: "Here are your [N] open tasks." then list them.
Do NOT make up IDs — the server handles object attachment.

### object_reference
The user is referencing a specific object (task, note, doc) from earlier in the conversation.
- Check "Last listed objects" and "Last suggested actions" context above for IDs
- If you can identify the object: include "referencedObjectTitle" in your JSON response with the matched title
- If ambiguous: ask which object they mean, name the candidates
- Once resolved, confirm the action and the specific object name + ID

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

  // Create or update note using Task model pattern (which works)
  if (existingNoteId) {
    try {
      await prisma.$executeRaw`
        UPDATE "Note" SET title = ${plan.noteTitle || 'Untitled'}, body = ${plan.noteBody || ''}, "updatedAt" = now()
        WHERE id = ${existingNoteId}
      `
      noteId = existingNoteId
    } catch (e) {
      console.error('[handlePlanMode] Note update failed:', e)
      // Fall through to create new
      const rows = await prisma.$queryRaw<{id: string}[]>`
        INSERT INTO "Note" ("workspaceId", title, body, "noteType", "companyId", "projectId", "objectiveId", "createdBy")
        VALUES (${workspaceId}, ${plan.noteTitle || 'Untitled'}, ${plan.noteBody || ''}, 'plan',
          ${plan.companyId || null}, ${plan.projectId || null}, ${plan.objectiveId || null},
          ${DEFAULT_USER_ID}::uuid)
        RETURNING id
      `
      noteId = rows[0].id
    }
  } else {
    const rows = await prisma.$queryRaw<{id: string}[]>`
      INSERT INTO "Note" ("workspaceId", title, body, "noteType", "companyId", "projectId", "objectiveId", "createdBy")
      VALUES (${workspaceId}, ${plan.noteTitle || 'Untitled'}, ${plan.noteBody || ''}, 'plan',
        ${plan.companyId || null}, ${plan.projectId || null}, ${plan.objectiveId || null},
        ${DEFAULT_USER_ID}::uuid)
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

async function extractAndStoreLastActions(
  response: string,
  tasks: any[],
  conversationId: string,
  conversationContext: any,
  intentType: string
): Promise<void> {
  // Extract numbered action items from the response
  const actionLines = response.match(/^\d+\.\s+(.+)$/gm) || []
  const actions = actionLines.map(line => line.replace(/^\d+\.\s+/, '').trim())
  
  // Try to match each action to a real task (fuzzy: substring match)
  const lastSuggestedActions = actions.map(actionTitle => {
    const matchedTask = tasks.find(t => 
      t.title.toLowerCase().includes(actionTitle.toLowerCase().slice(0, 20)) ||
      actionTitle.toLowerCase().includes(t.title.toLowerCase().slice(0, 20))
    )
    return {
      title: actionTitle,
      taskId: matchedTask?.id || null
    }
  })

  if (lastSuggestedActions.length > 0) {
    await prisma.aIConversation.update({
      where: { id: conversationId },
      data: {
        context: {
          ...conversationContext,
          lastSuggestedActions,
          lastIntentType: intentType
        }
      }
    })
  }
}
