import { generateJSONCompletion, AIMessage } from './anthropic'
import { prisma } from './prisma'

const DEFAULT_WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'

export type MemoryType = 'space' | 'project' | 'strategic' | 'research'

export interface MemoryExtractionInput {
  context: string
  contextType: 'task' | 'document' | 'project' | 'note'
  companyId?: string
  projectId?: string
  userId: string
}

export interface ExtractedMemory {
  memoryType: MemoryType
  title: string
  description: string
  confidenceScore: number // 1-10
  source: string
}

export interface MemoryExtractionResult {
  memories: ExtractedMemory[]
  totalExtracted: number
  highConfidenceCount: number
}

/**
 * Extract memories from context using Claude AI
 * Returns structured memories ready to be saved to database
 */
export async function extractMemories(
  input: MemoryExtractionInput
): Promise<MemoryExtractionResult> {
  const { context, contextType, companyId, projectId, userId } = input

  // Build prompt for memory extraction
  const systemPrompt = buildExtractionPrompt(contextType)
  
  const messages: AIMessage[] = [
    {
      role: 'user',
      content: `${systemPrompt}\n\nContext to analyze:\n\n${context}`,
    },
  ]

  try {
    // Call Claude to extract structured memories
    const response = await generateJSONCompletion<{
      memories: ExtractedMemory[]
    }>(messages, {
      model: 'claude-sonnet-4-20250514',
      maxTokens: 4096,
      temperature: 0.7,
    })

    // Validate and filter memories
    const validMemories = response.memories.filter(
      (m) =>
        m.title &&
        m.description &&
        m.memoryType &&
        m.confidenceScore >= 1 &&
        m.confidenceScore <= 10
    )

    // Save high-confidence memories to database (score >= 6)
    const highConfidenceMemories = validMemories.filter((m) => m.confidenceScore >= 6)
    
    if (highConfidenceMemories.length > 0) {
      await saveMemoriesToDatabase(highConfidenceMemories, {
        companyId,
        projectId,
        userId,
        contextType,
      })
    }

    return {
      memories: validMemories,
      totalExtracted: validMemories.length,
      highConfidenceCount: highConfidenceMemories.length,
    }
  } catch (error) {
    console.error('[Memory Extractor] Failed to extract memories:', error)
    throw new Error('Failed to extract memories from context')
  }
}

/**
 * Save extracted memories to database
 */
async function saveMemoriesToDatabase(
  memories: ExtractedMemory[],
  metadata: {
    companyId?: string
    projectId?: string
    userId: string
    contextType: string
  }
): Promise<void> {
  const { companyId, projectId, userId, contextType } = metadata

  try {
    await prisma.aIMemory.createMany({
      data: memories.map((memory) => ({
        workspaceId: DEFAULT_WORKSPACE_ID,
        companyId: companyId || undefined,
        projectId: projectId || undefined,
        memoryType: memory.memoryType,
        title: memory.title,
        description: memory.description,
        confidenceScore: memory.confidenceScore,
        source: memory.source || `auto_extracted_from_${contextType}`,
        createdBy: userId,
      })),
    })

    console.log(
      `[Memory Extractor] Saved ${memories.length} memories (${contextType})`
    )
  } catch (error) {
    console.error('[Memory Extractor] Failed to save memories to database:', error)
    throw error
  }
}

/**
 * Build extraction prompt based on context type
 */
function buildExtractionPrompt(contextType: string): string {
  const basePrompt = `You are an AI memory extraction system. Your job is to analyze the provided context and extract valuable learnings, insights, and knowledge.

Extract 4 types of memories:

1. **Space Memory** (memoryType: "space")
   - Customer preferences, needs, pain points
   - Competitive advantages or differentiators
   - Market positioning insights
   - Customer feedback or behavior patterns

2. **Project Memory** (memoryType: "project")
   - Key decisions made and their rationale
   - Technical blockers and how they were resolved
   - Lessons learned during execution
   - Best practices discovered

3. **Strategic Memory** (memoryType: "strategic")
   - What worked well vs what didn't
   - Market shifts or trends observed
   - Business model insights
   - Growth opportunities identified

4. **Research Memory** (memoryType: "research")
   - Market data and statistics
   - Competitor intelligence
   - Industry trends
   - Technology insights

For each memory, provide:
- **title**: Short, descriptive title (max 100 chars)
- **description**: Detailed explanation of the insight (2-4 sentences)
- **memoryType**: One of: space, project, strategic, research
- **confidenceScore**: 1-10 (how confident you are this is valuable knowledge)
- **source**: Brief description of where this came from

Only extract memories that are:
- Actionable or informative
- Not obvious or generic
- Worth remembering for future decision-making

Return a JSON object with this structure:
{
  "memories": [
    {
      "memoryType": "space",
      "title": "...",
      "description": "...",
      "confidenceScore": 8,
      "source": "..."
    }
  ]
}

If no valuable memories can be extracted, return an empty memories array.`

  const contextSpecificGuidance: Record<string, string> = {
    task: '\n\nFocus on: what was learned during completion, blockers encountered, decisions made, and outcomes achieved.',
    document: '\n\nFocus on: key facts, strategic insights, customer learnings, and market intelligence documented.',
    project: '\n\nFocus on: major decisions, technical learnings, what worked/didn\'t work, and strategic outcomes.',
    note: '\n\nFocus on: insights shared, problems discussed, solutions proposed, and context provided.',
  }

  return basePrompt + (contextSpecificGuidance[contextType] || '')
}

/**
 * Extract memories from completed task
 */
export async function extractMemoriesFromTask(
  taskId: string,
  userId: string
): Promise<MemoryExtractionResult | null> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        company: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        objective: { select: { id: true, title: true } },
        comments: {
          select: { bodyRich: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!task) {
      console.warn('[Memory Extractor] Task not found:', taskId)
      return null
    }

    // Build context from task data
    const context = buildTaskContext(task)

    // Skip extraction if context is too short (less than 50 chars)
    if (context.length < 50) {
      console.log('[Memory Extractor] Skipping task - insufficient content')
      return null
    }

    return await extractMemories({
      context,
      contextType: 'task',
      companyId: task.companyId || undefined,
      projectId: task.projectId || undefined,
      userId,
    })
  } catch (error) {
    console.error('[Memory Extractor] Failed to extract from task:', error)
    return null
  }
}

/**
 * Extract memories from saved document
 */
export async function extractMemoriesFromDocument(
  documentId: string,
  userId: string
): Promise<MemoryExtractionResult | null> {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        company: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    })

    if (!document) {
      console.warn('[Memory Extractor] Document not found:', documentId)
      return null
    }

    // Build context from document
    const context = buildDocumentContext(document)

    // Skip extraction if context is too short
    if (context.length < 100) {
      console.log('[Memory Extractor] Skipping document - insufficient content')
      return null
    }

    return await extractMemories({
      context,
      contextType: 'document',
      companyId: document.companyId || undefined,
      projectId: document.projectId || undefined,
      userId,
    })
  } catch (error) {
    console.error('[Memory Extractor] Failed to extract from document:', error)
    return null
  }
}

/**
 * Extract memories from completed project
 */
export async function extractMemoriesFromProject(
  projectId: string,
  userId: string
): Promise<MemoryExtractionResult | null> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        company: { select: { id: true, name: true } },
        objective: { select: { id: true, title: true } },
        tasks: {
          where: { completedAt: { not: null } },
          select: {
            title: true,
            description: true,
            completedAt: true,
          },
          orderBy: { completedAt: 'desc' },
          take: 10,
        },
        documents: {
          select: { title: true, documentType: true },
          take: 5,
        },
      },
    })

    if (!project) {
      console.warn('[Memory Extractor] Project not found:', projectId)
      return null
    }

    // Build context from project data
    const context = buildProjectContext(project)

    // Skip extraction if context is too short
    if (context.length < 100) {
      console.log('[Memory Extractor] Skipping project - insufficient content')
      return null
    }

    return await extractMemories({
      context,
      contextType: 'project',
      companyId: project.companyId || undefined,
      projectId: project.id,
      userId,
    })
  } catch (error) {
    console.error('[Memory Extractor] Failed to extract from project:', error)
    return null
  }
}

// Helper: Build context string from task data
function buildTaskContext(task: any): string {
  const parts: string[] = []

  parts.push(`Task: ${task.title}`)

  if (task.description) {
    parts.push(`Description: ${task.description}`)
  }

  if (task.space?.name) {
    parts.push(`Space: ${task.space.name}`)
  }

  if (task.project?.name) {
    parts.push(`Project: ${task.project.name}`)
  }

  if (task.objective?.title) {
    parts.push(`Objective: ${task.objective.title}`)
  }

  if (task.comments && task.comments.length > 0) {
    parts.push('\nComments:')
    task.comments.forEach((comment: any) => {
      // Extract text from rich text JSON
      const text = extractTextFromRichJSON(comment.bodyRich)
      if (text) {
        parts.push(`- ${text}`)
      }
    })
  }

  return parts.join('\n')
}

// Helper: Build context string from document data
function buildDocumentContext(document: any): string {
  const parts: string[] = []

  parts.push(`Document: ${document.title}`)
  parts.push(`Type: ${document.documentType}`)

  if (document.space?.name) {
    parts.push(`Space: ${document.space.name}`)
  }

  if (document.project?.name) {
    parts.push(`Project: ${document.project.name}`)
  }

  // Extract text from rich content
  const content = extractTextFromRichJSON(document.contentRich)
  if (content) {
    parts.push(`\nContent:\n${content}`)
  }

  return parts.join('\n')
}

// Helper: Build context string from project data
function buildProjectContext(project: any): string {
  const parts: string[] = []

  parts.push(`Project: ${project.name}`)

  if (project.description) {
    parts.push(`Description: ${project.description}`)
  }

  if (project.space?.name) {
    parts.push(`Space: ${project.space.name}`)
  }

  if (project.objective?.title) {
    parts.push(`Objective: ${project.objective.title}`)
  }

  if (project.tasks && project.tasks.length > 0) {
    parts.push(`\nCompleted Tasks (${project.tasks.length}):`)
    project.tasks.forEach((task: any) => {
      parts.push(`- ${task.title}`)
      if (task.description) {
        parts.push(`  ${task.description}`)
      }
    })
  }

  if (project.documents && project.documents.length > 0) {
    parts.push(`\nDocuments (${project.documents.length}):`)
    project.documents.forEach((doc: any) => {
      parts.push(`- ${doc.title} (${doc.documentType})`)
    })
  }

  return parts.join('\n')
}

// Helper: Extract plain text from TipTap/ProseMirror JSON
function extractTextFromRichJSON(richJSON: any): string {
  if (!richJSON) return ''

  try {
    if (typeof richJSON === 'string') {
      return richJSON
    }

    if (richJSON.type === 'doc' && richJSON.content) {
      return richJSON.content
        .map((node: any) => extractTextFromNode(node))
        .filter(Boolean)
        .join('\n')
    }

    return ''
  } catch (error) {
    console.warn('[Memory Extractor] Failed to parse rich JSON:', error)
    return ''
  }
}

function extractTextFromNode(node: any): string {
  if (!node) return ''

  if (node.type === 'text') {
    return node.text || ''
  }

  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractTextFromNode).filter(Boolean).join(' ')
  }

  return ''
}
