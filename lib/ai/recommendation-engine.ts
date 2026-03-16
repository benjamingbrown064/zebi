import { buildContext, formatContextForPrompt } from './context-builder'
import { chatCompletion } from './openai-client'
import { prisma } from '@/lib/prisma'

export interface Recommendation {
  id: string
  type: 'task' | 'objective' | 'blocker' | 'priority' | 'deadline'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  reasoning: string
  actions: RecommendationAction[]
  confidence: number
  createdAt: Date
  expiresAt: Date
}

export interface RecommendationAction {
  type: 'navigate' | 'create_task' | 'update_priority' | 'set_deadline'
  label: string
  params: Record<string, any>
}

export class RecommendationEngine {
  async generateDailyRecommendations(
    workspaceId: string,
    userId: string
  ): Promise<Recommendation[]> {
    // 1. Build context
    const context = await buildContext(workspaceId, userId)
    const formattedContext = formatContextForPrompt(context)

    // 2. Generate recommendations via AI
    const prompt = this.buildRecommendationPrompt(formattedContext)
    const response = await chatCompletion(
      [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: prompt },
      ],
      {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 2000,
      }
    )

    // 3. Parse AI response
    const recommendations = this.parseRecommendations(response.content)

    // 4. Save to database
    await this.saveRecommendations(workspaceId, userId, recommendations)

    return recommendations
  }

  private getSystemPrompt(): string {
    return `You are a productivity AI assistant analyzing a user's workspace.

Your task: Generate 3-5 actionable recommendations for what the user should work on today.

Consider:
- Task priorities (P0 = critical, P1 = high, P2 = medium, P3 = low)
- Upcoming deadlines (next 3 days = urgent, next 7 days = soon)
- Blocked tasks (need attention to unblock team)
- Objective progress (falling behind = needs focus)
- Task age (old incomplete tasks = may need review)

Output format (JSON):
{
  "recommendations": [
    {
      "type": "task|objective|blocker|priority|deadline",
      "priority": "high|medium|low",
      "title": "Clear action title",
      "description": "2-3 sentence explanation",
      "reasoning": "Why this matters now",
      "actions": [
        {
          "type": "navigate|create_task|update_priority|set_deadline",
          "label": "Button text",
          "params": {"taskId": "...", "url": "/tasks/123"}
        }
      ],
      "confidence": 85
    }
  ]
}`
  }

  private buildRecommendationPrompt(context: string): string {
    return `Analyze this workspace and recommend what the user should focus on today.

${context}

Generate 3-5 recommendations prioritized by urgency and impact.`
  }

  private parseRecommendations(content: string): Recommendation[] {
    try {
      // Extract JSON from markdown code blocks if present
      let jsonContent = content
      const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/)
      if (jsonMatch) {
        jsonContent = jsonMatch[1]
      } else {
        // Try to find JSON object in the content
        const objMatch = content.match(/\{[\s\S]*"recommendations"[\s\S]*\}/)
        if (objMatch) {
          jsonContent = objMatch[0]
        }
      }

      const parsed = JSON.parse(jsonContent)
      return parsed.recommendations.map((r: any) => ({
        id: crypto.randomUUID(),
        type: r.type,
        priority: r.priority,
        title: r.title,
        description: r.description,
        reasoning: r.reasoning,
        actions: r.actions,
        confidence: r.confidence,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      }))
    } catch (error) {
      console.error('Failed to parse recommendations:', error)
      console.error('Content:', content)
      return []
    }
  }

  private async saveRecommendations(
    workspaceId: string,
    userId: string,
    recommendations: Recommendation[]
  ): Promise<void> {
    // Mark old recommendations as expired
    await prisma.aISuggestion.updateMany({
      where: {
        workspaceId,
        userId,
        status: 'pending',
      },
      data: {
        status: 'expired',
      },
    })

    // Save new recommendations
    for (const rec of recommendations) {
      await prisma.aISuggestion.create({
        data: {
          workspaceId,
          userId,
          type: rec.type,
          title: rec.title,
          description: rec.description,
          reasoning: rec.reasoning,
          actions: rec.actions as any, // Cast to any for Prisma JSON type
          status: 'pending',
          confidence: rec.confidence,
          expiresAt: rec.expiresAt,
        },
      })
    }
  }
}
