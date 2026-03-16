import { prisma } from '@/lib/prisma'
import DashboardClient from './client'
import { getWorkspaceFromAuth } from '@/lib/workspace'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  // Get workspace from authenticated session
  let workspace
  try {
    workspace = await getWorkspaceFromAuth()
  } catch (error) {
    console.error('Failed to get workspace:', error)
    redirect('/login')
  }

  if (!workspace) {
    console.error('No workspace found for user')
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-[#1A1A1A] mb-2">No Workspace Found</h2>
          <p className="text-[#737373]">Please contact support to set up your workspace.</p>
        </div>
      </div>
    )
  }

  const workspaceId = workspace.id

  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Fetch all data server-side using authenticated user's workspace
    const [todaySelection, completedToday, projects, objectives, activityLog] = await Promise.all([
      // Today's planned tasks
      prisma.task.findMany({
        where: { 
          workspaceId,
          archivedAt: null,
          todayPinDate: { gte: todayStart }
        },
        orderBy: [
          { todayCategory: 'asc' },
          { todayOrder: 'asc' }
        ],
        take: 9 // Max 9 tasks visible
      }),
      
      // Tasks completed today
      prisma.task.findMany({
        where: {
          workspaceId,
          completedAt: { gte: todayStart }
        },
        orderBy: { completedAt: 'desc' },
        take: 10
      }),
      
      // Active projects with progress
      // OPTIMIZED: Use aggregation instead of loading all tasks
      prisma.project.findMany({
        where: { 
          workspaceId,
          archivedAt: null
        },
        include: {
          _count: {
            select: {
              tasks: {
                where: { archivedAt: null }
              }
            }
          },
          tasks: {
            where: { 
              archivedAt: null,
              completedAt: { not: null }
            },
            select: {
              id: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5 // Show 3-5 projects
      }),
      
      // Active objectives
      prisma.objective.findMany({
        where: { 
          workspaceId,
          status: { in: ['active', 'on_track', 'at_risk', 'blocked'] }
        },
        include: {
          company: {
            select: { name: true }
          },
          milestones: {
            where: { completedAt: null },
            orderBy: { targetDate: 'asc' },
            take: 1
          }
        },
        orderBy: { deadline: 'asc' },
        take: 3 // Show 2-3 objectives
      }),
      
      // Bot activity (AI-generated tasks from today)
      prisma.task.findMany({
        where: {
          workspaceId,
          aiGenerated: true,
          createdAt: { gte: todayStart }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          createdAt: true,
          aiAgent: true
        }
      })
    ])

    // Calculate project progress
    // OPTIMIZED: Use _count aggregation instead of loading all tasks
    const mappedProjects = projects.map(p => {
      const total = p._count.tasks
      const completed = p.tasks.length // Only completed tasks were loaded
      const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0
      
      return {
        id: p.id,
        name: p.name,
        progressPercent,
        tasksCompleted: completed,
        tasksTotal: total
      }
    })

    // Map objectives with next milestone
    const mappedObjectives = objectives.map(obj => {
      const nextMilestone = obj.milestones[0]
      const daysUntil = nextMilestone 
        ? Math.ceil((new Date(nextMilestone.targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null
      
      return {
        id: obj.id,
        title: obj.title,
        companyName: obj.company?.name,
        currentValue: Number(obj.currentValue),
        targetValue: Number(obj.targetValue),
        unit: obj.unit || '',
        nextMilestone: nextMilestone && daysUntil !== null ? {
          title: nextMilestone.title,
          daysUntil
        } : null
      }
    })

    // Categorize today's tasks and serialize
    const serializeTask = (t: any) => ({
      id: t.id,
      title: t.title,
      completedAt: t.completedAt?.toISOString() || null
    })
    
    const keyTask = todaySelection.find(t => t.todayCategory === 'main')
    const subTasks = todaySelection.filter(t => t.todayCategory === 'secondary').slice(0, 2)
    const hopeToComplete = todaySelection.filter(t => t.todayCategory === 'additional').slice(0, 3)
    const additionalTasks = todaySelection.filter(t => !t.todayCategory || t.todayCategory === 'other').slice(0, 5)

    return (
      <DashboardClient
        keyTask={keyTask ? serializeTask(keyTask) : undefined}
        subTasks={subTasks.map(serializeTask)}
        hopeToComplete={hopeToComplete.map(serializeTask)}
        additionalTasks={additionalTasks.map(serializeTask)}
        completedToday={completedToday.map(t => ({ id: t.id, title: t.title, completedAt: t.completedAt?.toISOString() }))}
        projects={mappedProjects}
        objectives={mappedObjectives}
        botActivity={activityLog.map(task => ({
          id: task.id,
          title: task.title,
          createdAt: task.createdAt.toISOString(),
          aiAgent: task.aiAgent
        }))}
      />
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Failed to load dashboard data:', msg)
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-red-600">Failed to load dashboard: {msg}</div>
      </div>
    )
  }
}
