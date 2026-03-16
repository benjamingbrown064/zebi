import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import GoalDetailClient from './client'

export default async function GoalDetailPage({ params }: { params: { id: string } }) {
  try {
    // Fetch goal with minimal related data - optimize for speed
    const goal = await prisma.goal.findUnique({
      where: { id: params.id },
      include: {
        // Only count tasks, don't load all details
        _count: {
          select: { tasks: true }
        },
        // Load only essential objective fields - no company lookup to avoid extra queries
        objectives: {
          where: { status: { in: ['active', 'on_track', 'at_risk', 'blocked'] } },
          select: {
            id: true,
            title: true,
            status: true,
          },
          orderBy: { priority: 'asc' },
          take: 50, // Limit to prevent loading too many objectives
        },
      },
    })

    if (!goal) {
      return notFound()
    }

    return <GoalDetailClient goal={goal} />
  } catch (error) {
    console.error('Error loading goal:', error)
    return notFound()
  }
}
