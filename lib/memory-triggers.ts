import {
  extractMemoriesFromTask,
  extractMemoriesFromDocument,
  extractMemoriesFromProject,
  MemoryExtractionResult,
} from './memory-extractor'

/**
 * Trigger memory extraction when a task is completed
 * Call this from task update endpoints when completedAt is set
 */
export async function onTaskCompleted(
  taskId: string,
  userId: string
): Promise<MemoryExtractionResult | null> {
  try {
    console.log(`[Memory Trigger] Task completed: ${taskId}`)
    
    // Extract memories from the completed task
    const result = await extractMemoriesFromTask(taskId, userId)
    
    if (result && result.highConfidenceCount > 0) {
      console.log(
        `[Memory Trigger] Extracted ${result.highConfidenceCount} high-confidence memories from task`
      )
    } else {
      console.log('[Memory Trigger] No memories extracted from task')
    }
    
    return result
  } catch (error) {
    console.error('[Memory Trigger] Error in onTaskCompleted:', error)
    return null
  }
}

/**
 * Trigger memory extraction when a document is saved/updated
 * Call this from document save endpoints
 */
export async function onDocumentSaved(
  documentId: string,
  userId: string
): Promise<MemoryExtractionResult | null> {
  try {
    console.log(`[Memory Trigger] Document saved: ${documentId}`)
    
    // Extract memories from the saved document
    const result = await extractMemoriesFromDocument(documentId, userId)
    
    if (result && result.highConfidenceCount > 0) {
      console.log(
        `[Memory Trigger] Extracted ${result.highConfidenceCount} high-confidence memories from document`
      )
    } else {
      console.log('[Memory Trigger] No memories extracted from document')
    }
    
    return result
  } catch (error) {
    console.error('[Memory Trigger] Error in onDocumentSaved:', error)
    return null
  }
}

/**
 * Trigger memory extraction when a project is completed/archived
 * Call this from project update endpoints when project is marked as complete
 */
export async function onProjectCompleted(
  projectId: string,
  userId: string
): Promise<MemoryExtractionResult | null> {
  try {
    console.log(`[Memory Trigger] Project completed: ${projectId}`)
    
    // Extract memories from the completed project
    const result = await extractMemoriesFromProject(projectId, userId)
    
    if (result && result.highConfidenceCount > 0) {
      console.log(
        `[Memory Trigger] Extracted ${result.highConfidenceCount} high-confidence memories from project`
      )
    } else {
      console.log('[Memory Trigger] No memories extracted from project')
    }
    
    return result
  } catch (error) {
    console.error('[Memory Trigger] Error in onProjectCompleted:', error)
    return null
  }
}

/**
 * Batch extract memories from multiple completed tasks
 * Useful for processing a backlog of completed tasks
 */
export async function batchExtractFromTasks(
  taskIds: string[],
  userId: string
): Promise<{
  processed: number
  totalMemories: number
  errors: number
}> {
  let processed = 0
  let totalMemories = 0
  let errors = 0

  for (const taskId of taskIds) {
    try {
      const result = await extractMemoriesFromTask(taskId, userId)
      processed++
      
      if (result) {
        totalMemories += result.highConfidenceCount
      }
    } catch (error) {
      console.error(`[Memory Trigger] Failed to process task ${taskId}:`, error)
      errors++
    }
  }

  console.log(
    `[Memory Trigger] Batch processing complete: ${processed} tasks, ${totalMemories} memories, ${errors} errors`
  )

  return { processed, totalMemories, errors }
}

/**
 * Batch extract memories from multiple documents
 * Useful for processing existing documents
 */
export async function batchExtractFromDocuments(
  documentIds: string[],
  userId: string
): Promise<{
  processed: number
  totalMemories: number
  errors: number
}> {
  let processed = 0
  let totalMemories = 0
  let errors = 0

  for (const documentId of documentIds) {
    try {
      const result = await extractMemoriesFromDocument(documentId, userId)
      processed++
      
      if (result) {
        totalMemories += result.highConfidenceCount
      }
    } catch (error) {
      console.error(`[Memory Trigger] Failed to process document ${documentId}:`, error)
      errors++
    }
  }

  console.log(
    `[Memory Trigger] Batch processing complete: ${processed} documents, ${totalMemories} memories, ${errors} errors`
  )

  return { processed, totalMemories, errors }
}

/**
 * Batch extract memories from multiple projects
 * Useful for processing completed projects
 */
export async function batchExtractFromProjects(
  projectIds: string[],
  userId: string
): Promise<{
  processed: number
  totalMemories: number
  errors: number
}> {
  let processed = 0
  let totalMemories = 0
  let errors = 0

  for (const projectId of projectIds) {
    try {
      const result = await extractMemoriesFromProject(projectId, userId)
      processed++
      
      if (result) {
        totalMemories += result.highConfidenceCount
      }
    } catch (error) {
      console.error(`[Memory Trigger] Failed to process project ${projectId}:`, error)
      errors++
    }
  }

  console.log(
    `[Memory Trigger] Batch processing complete: ${processed} projects, ${totalMemories} memories, ${errors} errors`
  )

  return { processed, totalMemories, errors }
}
