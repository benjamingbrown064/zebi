import { NextRequest, NextResponse } from 'next/server'
import { requireDougAuth } from '@/lib/doug-auth'
import {
  extractMemories,
  extractMemoriesFromTask,
  extractMemoriesFromDocument,
  extractMemoriesFromProject,
  MemoryExtractionInput,
} from '@/lib/memory-extractor'
import {
  batchExtractFromTasks,
  batchExtractFromDocuments,
  batchExtractFromProjects,
} from '@/lib/memory-triggers'

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000' // System user for AI operations

/**
 * POST /api/ai/extract-memory
 * 
 * Extract memories from various contexts:
 * - Direct text context (manual extraction)
 * - Completed task
 * - Saved document
 * - Completed project
 * - Batch processing
 * 
 * Request Body Options:
 * 
 * 1. Direct context extraction:
 * {
 *   "mode": "direct",
 *   "context": "text content to analyze",
 *   "contextType": "task" | "document" | "project" | "note",
 *   "companyId": "optional-company-id",
 *   "projectId": "optional-project-id"
 * }
 * 
 * 2. Extract from task:
 * {
 *   "mode": "task",
 *   "taskId": "task-uuid"
 * }
 * 
 * 3. Extract from document:
 * {
 *   "mode": "document",
 *   "documentId": "document-uuid"
 * }
 * 
 * 4. Extract from project:
 * {
 *   "mode": "project",
 *   "projectId": "project-uuid"
 * }
 * 
 * 5. Batch processing:
 * {
 *   "mode": "batch",
 *   "batchType": "tasks" | "documents" | "projects",
 *   "ids": ["id1", "id2", "id3"]
 * }
 */
export async function POST(request: NextRequest) {
  const authError = requireDougAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const body = await request.json()
    const { mode } = body

    if (!mode) {
      return NextResponse.json(
        { error: 'Missing required field: mode' },
        { status: 400 }
      )
    }

    // Handle different extraction modes
    switch (mode) {
      case 'direct':
        return await handleDirectExtraction(body)

      case 'task':
        return await handleTaskExtraction(body)

      case 'document':
        return await handleDocumentExtraction(body)

      case 'project':
        return await handleProjectExtraction(body)

      case 'batch':
        return await handleBatchExtraction(body)

      default:
        return NextResponse.json(
          { error: `Invalid mode: ${mode}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Extract Memory API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to extract memories',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * Handle direct context extraction
 */
async function handleDirectExtraction(body: any) {
  const { context, contextType, companyId, projectId } = body

  if (!context) {
    return NextResponse.json(
      { error: 'Missing required field: context' },
      { status: 400 }
    )
  }

  if (!contextType) {
    return NextResponse.json(
      { error: 'Missing required field: contextType' },
      { status: 400 }
    )
  }

  if (!['task', 'document', 'project', 'note'].includes(contextType)) {
    return NextResponse.json(
      { error: 'Invalid contextType. Must be: task, document, project, or note' },
      { status: 400 }
    )
  }

  const input: MemoryExtractionInput = {
    context,
    contextType,
    companyId,
    projectId,
    userId: DEFAULT_USER_ID,
  }

  const result = await extractMemories(input)

  return NextResponse.json({
    success: true,
    mode: 'direct',
    result: {
      totalExtracted: result.totalExtracted,
      highConfidenceSaved: result.highConfidenceCount,
      memories: result.memories,
    },
  })
}

/**
 * Handle task extraction
 */
async function handleTaskExtraction(body: any) {
  const { taskId } = body

  if (!taskId) {
    return NextResponse.json(
      { error: 'Missing required field: taskId' },
      { status: 400 }
    )
  }

  const result = await extractMemoriesFromTask(taskId, DEFAULT_USER_ID)

  if (!result) {
    return NextResponse.json({
      success: false,
      mode: 'task',
      error: 'Task not found or insufficient content for extraction',
    })
  }

  return NextResponse.json({
    success: true,
    mode: 'task',
    taskId,
    result: {
      totalExtracted: result.totalExtracted,
      highConfidenceSaved: result.highConfidenceCount,
      memories: result.memories,
    },
  })
}

/**
 * Handle document extraction
 */
async function handleDocumentExtraction(body: any) {
  const { documentId } = body

  if (!documentId) {
    return NextResponse.json(
      { error: 'Missing required field: documentId' },
      { status: 400 }
    )
  }

  const result = await extractMemoriesFromDocument(documentId, DEFAULT_USER_ID)

  if (!result) {
    return NextResponse.json({
      success: false,
      mode: 'document',
      error: 'Document not found or insufficient content for extraction',
    })
  }

  return NextResponse.json({
    success: true,
    mode: 'document',
    documentId,
    result: {
      totalExtracted: result.totalExtracted,
      highConfidenceSaved: result.highConfidenceCount,
      memories: result.memories,
    },
  })
}

/**
 * Handle project extraction
 */
async function handleProjectExtraction(body: any) {
  const { projectId } = body

  if (!projectId) {
    return NextResponse.json(
      { error: 'Missing required field: projectId' },
      { status: 400 }
    )
  }

  const result = await extractMemoriesFromProject(projectId, DEFAULT_USER_ID)

  if (!result) {
    return NextResponse.json({
      success: false,
      mode: 'project',
      error: 'Project not found or insufficient content for extraction',
    })
  }

  return NextResponse.json({
    success: true,
    mode: 'project',
    projectId,
    result: {
      totalExtracted: result.totalExtracted,
      highConfidenceSaved: result.highConfidenceCount,
      memories: result.memories,
    },
  })
}

/**
 * Handle batch extraction
 */
async function handleBatchExtraction(body: any) {
  const { batchType, ids } = body

  if (!batchType) {
    return NextResponse.json(
      { error: 'Missing required field: batchType' },
      { status: 400 }
    )
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: 'Missing or invalid field: ids (must be non-empty array)' },
      { status: 400 }
    )
  }

  let result: { processed: number; totalMemories: number; errors: number }

  switch (batchType) {
    case 'tasks':
      result = await batchExtractFromTasks(ids, DEFAULT_USER_ID)
      break

    case 'documents':
      result = await batchExtractFromDocuments(ids, DEFAULT_USER_ID)
      break

    case 'projects':
      result = await batchExtractFromProjects(ids, DEFAULT_USER_ID)
      break

    default:
      return NextResponse.json(
        { error: `Invalid batchType: ${batchType}. Must be: tasks, documents, or projects` },
        { status: 400 }
      )
  }

  return NextResponse.json({
    success: true,
    mode: 'batch',
    batchType,
    result: {
      processed: result.processed,
      totalMemoriesExtracted: result.totalMemories,
      errors: result.errors,
    },
  })
}
