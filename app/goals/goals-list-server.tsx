import { prisma } from '@/lib/prisma'
import GoalCard from './goal-card'

interface GoalsListServerProps {
  workspaceId: string
}

export default async function GoalsListServer({ workspaceId }: GoalsListServerProps) {
  // Fetch goals with optimized query - minimal data needed for list view
  const rawGoals = await prisma.goal.findMany({
    where: { 
      workspaceId, 
      status: { in: ['active', 'paused'] } 
    },
    select: {
      id: true,
      name: true,
      currentValue: true,
      targetValue: true,
      unit: true,
      endDate: true,
      metricType: true,
      workspaceId: true,
      // Get task count for progress calculation
      _count: {
        select: { 
          tasks: {
            where: { completedAt: { not: null } }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  })

  // Serialize dates for client components
  const goals = rawGoals.map(goal => ({
    ...goal,
    endDate: goal.endDate.toISOString(),
    currentValue: goal.currentValue.toString(),
    targetValue: goal.targetValue.toString(),
  }))

  if (goals.length === 0) {
    return (
      <div className="text-center py-12 md:py-20">
        <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#A3A3A3]" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 6l3-3 4 4 7-7v4l-7 7-4-4-3 3z"/>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">No goals yet</h3>
        <p className="text-[#A3A3A3] mb-6">Create your first goal to get started</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile: List View */}
      <div className="block md:hidden space-y-3">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} isMobile />
        ))}
      </div>

      {/* Desktop: Card Grid */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </>
  )
}
