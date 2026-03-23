import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'
import OpenAI from 'openai'

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'
const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface PlanResponse {
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
    const [companies, recentTasks] = await Promise.all([
      prisma.company.findMany({
        where: { workspaceId, archivedAt: null },
        select: { id: true, name: true, industry: true },
      }),
      prisma.task.findMany({
        where: { workspaceId, archivedAt: null, completedAt: null },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, companyId: true },
      }),
    ])

    // Build system prompt with workspace context
    const systemPrompt = buildSystemPrompt(companies, recentTasks, activeMode, conversation.context as any)

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
  companies: Array<{ id: string; name: string; industry: string | null }>,
  recentTasks: Array<{ id: string; title: string; companyId: string | null }>,
  operatingMode?: string,
  conversationContext?: any
): string {
  const companyContext = companies.length > 0
    ? `Available companies:\n${companies.map(c => `- ${c.name} (ID: ${c.id}${c.industry ? `, Industry: ${c.industry}` : ''})`).join('\n')}`
    : 'No companies in workspace yet.'

  const taskContext = recentTasks.length > 0
    ? `Recent tasks:\n${recentTasks.slice(0, 5).map(t => `- ${t.title}${t.companyId ? ` (Company: ${companies.find(c => c.id === t.companyId)?.name || 'Unknown'})` : ''}`).join('\n')}`
    : 'No recent tasks.'

  const modeContext = operatingMode
    ? `\nCurrent operating mode: ${operatingMode}`
    : ''

  return `You are Zebi Chat, an intelligent planning assistant built into the Zebi workspace.

Your job is to help users turn conversations into actionable plans.

## Two Modes:

1. **Chat mode** (default): Answer questions, provide context, have conversations
2. **Plan mode**: Create structured plans with notes and tasks

## Detecting Plan Mode:

Switch to plan mode when the user wants to:
- Create a plan ("make a plan for...", "plan out...", "organize this")
- Turn ideas into tasks ("what should I do to...", "help me plan...")
- Break down a goal into steps
- Create action items from a discussion

Don't switch to plan mode for simple questions or status requests.

## Workspace Context:

${companyContext}

${taskContext}${modeContext}

## Response Format:

Always return valid JSON:

\`\`\`json
{
  "mode": "chat" | "plan",
  "response": "Your conversational response here",
  "plan": {
    "noteTitle": "Brief plan title",
    "noteBody": "Detailed plan description with context",
    "tasks": [
      {
        "title": "Task 1",
        "description": "What needs to be done",
        "priority": 1
      }
    ],
    "companyId": "abc-123",
    "needsConfirmation": false,
    "confirmationQuestion": "Which company is this for?"
  }
}
\`\`\`

## Context Inference:

- Infer company/project from conversation history when possible
- Use task context to understand what the user is working on
- Only set needsConfirmation: true if genuinely ambiguous (not just missing)
- Reference company IDs from the workspace context above

## Task Creation Rules:

- Create 3-5 focused tasks, not a giant dump
- Priority: 1 (high), 2 (medium), 3 (low)
- Each task should be actionable and specific
- Include clear descriptions

## Continuity:

Check conversation history to maintain context across messages.
If updating an existing plan, reference previous tasks/notes.`
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

  // Create or update note directly via Prisma
  if (existingNoteId) {
    try {
      const updated = await prisma.note.update({
        where: { id: existingNoteId },
        data: { title: plan.noteTitle, body: plan.noteBody },
      })
      noteId = updated.id
    } catch {
      // Note may have been deleted — create a new one
      const note = await prisma.note.create({
        data: {
          workspaceId, title: plan.noteTitle, body: plan.noteBody,
          noteType: 'plan', companyId: plan.companyId || null,
          projectId: plan.projectId || null, objectiveId: plan.objectiveId || null,
          createdBy: DEFAULT_USER_ID,
        },
      })
      noteId = note.id
    }
  } else {
    const note = await prisma.note.create({
      data: {
        workspaceId, title: plan.noteTitle, body: plan.noteBody,
        noteType: 'plan', companyId: plan.companyId || null,
        projectId: plan.projectId || null, objectiveId: plan.objectiveId || null,
        createdBy: DEFAULT_USER_ID,
      },
    })
    noteId = note.id
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
