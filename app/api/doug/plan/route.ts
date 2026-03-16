import { NextRequest, NextResponse } from 'next/server'
import { requireDougAuth } from '@/lib/doug-auth'
import { getDougWorkspaceId } from '@/lib/doug-workspace'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const DEFAULT_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * POST /api/doug/plan
 * 
 * Natural language planning - converts requests like
 * "What do I need to do to get to £10k MRR for Love Warranty?"
 * into structured objectives, projects, and tasks
 * 
 * Body:
 * {
 *   "request": "What do I need to do to get to £10k MRR for project X?",
 *   "execute": true  // Actually create the plan in the system
 * }
 */
export async function POST(request: NextRequest) {
  const authError = requireDougAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const body = await request.json()
    const { request: userRequest, execute = false, userId } = body

    // Resolve workspace from Doug API context
    const workspaceId = await getDougWorkspaceId(userId)

    if (!userRequest) {
      return NextResponse.json(
        { error: 'Missing required field: request' },
        { status: 400 }
      )
    }

    // Get current workspace context
    const [companies, goals, objectives] = await Promise.all([
      prisma.company.findMany({
        where: { workspaceId, archivedAt: null },
        select: { id: true, name: true, industry: true, stage: true, revenue: true },
      }),
      prisma.goal.findMany({
        where: { workspaceId, status: 'active' },
        select: { id: true, name: true, currentValue: true, targetValue: true, unit: true },
      }),
      prisma.objective.findMany({
        where: {
          workspaceId,
          status: { in: ['active', 'on_track', 'at_risk'] },
        },
        select: {
          id: true,
          title: true,
          currentValue: true,
          targetValue: true,
          unit: true,
          company: { select: { name: true } },
        },
        take: 10,
      }),
    ])

    // Build context for Claude
    const context = {
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        industry: c.industry,
        stage: c.stage,
        revenue: c.revenue ? `£${Number(c.revenue).toLocaleString()}` : null,
      })),
      goals: goals.map((g) => ({
        id: g.id,
        name: g.name,
        progress: `${g.currentValue}/${g.targetValue} ${g.unit || ''}`,
      })),
      activeObjectives: objectives.map((o) => ({
        title: o.title,
        company: o.company?.name,
        progress: `${o.currentValue}/${o.targetValue} ${o.unit || ''}`,
      })),
    }

    // Ask Claude to generate a structured plan
    const planningPrompt = `You are a business execution planner. The user is asking: "${userRequest}"

Current context:
${JSON.stringify(context, null, 2)}

Generate a structured execution plan. Break down the goal into:
1. One clear objective (SMART: specific, measurable, achievable, relevant, time-bound)
2. 3-5 key projects (major workstreams)
3. 3-6 tasks per project (actionable steps)
4. For each task, specify if it should be done by AI (automated/research/analysis) or Human (decision-making/creative/relationship work)

Return a JSON object with this exact structure:
{
  "objective": {
    "title": "Clear objective title",
    "description": "Why this matters",
    "targetValue": 10000,
    "metricType": "currency",
    "unit": "GBP",
    "deadline": "2026-06-30",
    "priority": 1,
    "companyId": "uuid-if-applicable-or-null"
  },
  "projects": [
    {
      "name": "Project name",
      "description": "What this project achieves",
      "tasks": [
        {
          "title": "Specific task",
          "description": "How to do it",
          "owner": "ai" or "human",
          "priority": 1-4,
          "estimatedDays": 3
        }
      ]
    }
  ],
  "summary": "Human-readable summary of the plan"
}

Be specific and actionable. For revenue goals, think about customer acquisition, pricing, retention. For growth goals, think about marketing, product, operations.`

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: planningPrompt,
        },
      ],
    })

    const responseText = completion.content[0].type === 'text' ? completion.content[0].text : ''
    
    // Extract JSON from response (Claude sometimes wraps it in markdown)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse plan from AI response')
    }

    const plan = JSON.parse(jsonMatch[0])

    // If execute=true, actually create everything in the system
    let created = null
    if (execute) {
      // Create objective
      const objective = await prisma.objective.create({
        data: {
          workspaceId,
          title: plan.objective.title,
          description: plan.objective.description,
          companyId: plan.objective.companyId,
          objectiveType: plan.objective.metricType === 'currency' ? 'revenue' : 'general',
          metricType: plan.objective.metricType,
          currentValue: 0,
          targetValue: plan.objective.targetValue,
          unit: plan.objective.unit,
          startDate: new Date(),
          deadline: new Date(plan.objective.deadline),
          status: 'active',
          progressPercent: 0,
          priority: plan.objective.priority,
          createdBy: userId || DEFAULT_USER_ID,
        },
      })

      // Create projects and tasks
      const createdProjects = []
      for (const projectPlan of plan.projects) {
        const project = await prisma.project.create({
          data: {
            workspaceId,
            objectiveId: objective.id,
            name: projectPlan.name,
            description: projectPlan.description,
          },
        })

        const createdTasks = []
        for (const taskPlan of projectPlan.tasks) {
          // Get default status
          const defaultStatus = await prisma.status.findFirst({
            where: { workspaceId },
            orderBy: { sortOrder: 'asc' },
          })

          if (!defaultStatus) {
            throw new Error('No status found in workspace')
          }

          const task = await prisma.task.create({
            data: {
              workspaceId,
              objectiveId: objective.id,
              projectId: project.id,
              title: taskPlan.title,
              description: taskPlan.description,
              priority: taskPlan.priority,
              statusId: defaultStatus.id,
              createdBy: userId || DEFAULT_USER_ID,
              aiGenerated: true,
              aiAgent: taskPlan.owner === 'ai' ? 'doug' : null,
            },
          })

          createdTasks.push({
            id: task.id,
            title: task.title,
            owner: taskPlan.owner,
            priority: task.priority,
          })
        }

        createdProjects.push({
          id: project.id,
          name: project.name,
          tasks: createdTasks,
        })
      }

      created = {
        objective: {
          id: objective.id,
          title: objective.title,
          url: `http://localhost:3001/objectives/${objective.id}`,
        },
        projects: createdProjects,
        totalTasks: createdProjects.reduce((sum, p) => sum + p.tasks.length, 0),
        aiTasks: createdProjects
          .flatMap((p) => p.tasks)
          .filter((t) => t.owner === 'ai').length,
        humanTasks: createdProjects
          .flatMap((p) => p.tasks)
          .filter((t) => t.owner === 'human').length,
      }
    }

    return NextResponse.json({
      request: userRequest,
      plan: {
        objective: plan.objective,
        projects: plan.projects.map((p: any) => ({
          name: p.name,
          description: p.description,
          tasks: p.tasks.map((t: any) => ({
            title: t.title,
            owner: t.owner,
            priority: t.priority,
            estimatedDays: t.estimatedDays,
          })),
        })),
        summary: plan.summary,
      },
      created: created || null,
      executed: execute,
    })
  } catch (error) {
    console.error('[Doug API] Failed to generate plan:', error)
    return NextResponse.json(
      { error: 'Failed to generate plan', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
