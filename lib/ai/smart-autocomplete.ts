import { chatCompletion, ChatMessage } from './openai-client'
import { buildContext, formatContextForPrompt } from './context-builder'

export interface AutoCompleteResult {
  suggestions: string[]
  confidence: number
}

export interface DeadlineResult {
  deadline: Date | null
  reasoning: string
}

export interface RelatedTask {
  taskId: string
  title: string
  similarity: number
}

/**
 * Smart autocomplete for task descriptions, deadlines, and related tasks
 */
export class SmartAutocomplete {
  /**
   * Generate task description completions based on workspace context
   */
  async completeTaskDescription(
    workspaceId: string,
    userId: string,
    partialText: string,
    context?: {
      projectId?: string
      goalId?: string
      objectiveId?: string
    }
  ): Promise<AutoCompleteResult> {
    // Build workspace context
    const aiContext = await buildContext(workspaceId, userId)
    const workspaceContext = formatContextForPrompt(aiContext)

    // Create prompt for GPT-4o-mini
    const prompt = `Based on the workspace context and partial task description, suggest 3 ways to complete this task description.

${workspaceContext}

Partial Task: "${partialText}"

Requirements:
- Suggest realistic, actionable completions
- Keep completions brief (1 sentence max)
- Consider existing tasks to avoid duplication
- Be specific and relevant to the project/goal context

Output format (JSON):
{
  "suggestions": ["completion 1", "completion 2", "completion 3"],
  "confidence": 85
}`

    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are a task completion assistant. Always respond with valid JSON.' },
      { role: 'user', content: prompt },
    ]

    try {
      const response = await chatCompletion(messages, {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 500,
      })

      return this.parseAutocompleteResponse(response.content)
    } catch (error) {
      console.error('Autocomplete error:', error)
      return { suggestions: [], confidence: 0 }
    }
  }

  private parseAutocompleteResponse(content: string): AutoCompleteResult {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : content

      const parsed = JSON.parse(jsonStr.trim())
      return {
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
      }
    } catch (error) {
      console.error('Failed to parse autocomplete response:', error)
      return { suggestions: [], confidence: 0 }
    }
  }

  /**
   * Suggest a realistic deadline based on task priority and context
   */
  async suggestDeadline(
    workspaceId: string,
    userId: string,
    taskDescription: string,
    priority: number
  ): Promise<DeadlineResult> {
    const aiContext = await buildContext(workspaceId, userId)
    const workspaceContext = formatContextForPrompt(aiContext)

    const priorityLabel =
      priority === 0 ? 'Critical (P0)' :
      priority === 1 ? 'High (P1)' :
      priority === 2 ? 'Medium (P2)' : 'Low (P3)'

    const prompt = `Suggest a realistic deadline for this task based on priority and workspace context.

Task: "${taskDescription}"
Priority: ${priorityLabel}

${workspaceContext}

Output format (JSON):
{
  "daysFromNow": 7,
  "reasoning": "Given the high priority and upcoming objective deadline, this should be completed within a week"
}`

    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are a task planning assistant. Always respond with valid JSON.' },
      { role: 'user', content: prompt },
    ]

    try {
      const response = await chatCompletion(messages, {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 300,
      })

      return this.parseDeadlineResponse(response.content)
    } catch (error) {
      console.error('Deadline suggestion error:', error)
      return { deadline: null, reasoning: 'Unable to suggest deadline' }
    }
  }

  private parseDeadlineResponse(content: string): DeadlineResult {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : content

      const parsed = JSON.parse(jsonStr.trim())
      const daysFromNow = typeof parsed.daysFromNow === 'number' ? parsed.daysFromNow : 7
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + daysFromNow)

      return {
        deadline,
        reasoning: parsed.reasoning || 'Suggested based on priority',
      }
    } catch (error) {
      console.error('Failed to parse deadline response:', error)
      return { deadline: null, reasoning: 'Unable to suggest deadline' }
    }
  }

  /**
   * Find related tasks based on similarity to the new task description
   */
  async findRelatedTasks(
    workspaceId: string,
    userId: string,
    taskDescription: string
  ): Promise<RelatedTask[]> {
    const aiContext = await buildContext(workspaceId, userId)
    const workspaceContext = formatContextForPrompt(aiContext)

    const prompt = `Find tasks that are related or similar to this new task.

New Task: "${taskDescription}"

${workspaceContext}

Output format (JSON):
{
  "relatedTasks": [
    {"taskId": "abc-123", "title": "Related task title", "similarity": 85},
    {"taskId": "def-456", "title": "Another related task", "similarity": 70}
  ]
}`

    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are a task relationship analyzer. Always respond with valid JSON.' },
      { role: 'user', content: prompt },
    ]

    try {
      const response = await chatCompletion(messages, {
        model: 'gpt-4o-mini',
        temperature: 0.5,
        maxTokens: 500,
      })

      return this.parseRelatedTasksResponse(response.content)
    } catch (error) {
      console.error('Related tasks error:', error)
      return []
    }
  }

  private parseRelatedTasksResponse(content: string): RelatedTask[] {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : content

      const parsed = JSON.parse(jsonStr.trim())
      return Array.isArray(parsed.relatedTasks) ? parsed.relatedTasks : []
    } catch (error) {
      console.error('Failed to parse related tasks response:', error)
      return []
    }
  }
}
