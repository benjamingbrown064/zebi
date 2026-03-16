import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const companyId = searchParams.get('companyId')
    const objectiveId = searchParams.get('objectiveId')
    const status = searchParams.get('status')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const where: any = { workspaceId }
    
    if (companyId) where.companyId = companyId
    if (objectiveId) where.objectiveId = objectiveId
    if (status) where.status = status

    const projects = await prisma.project.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        objective: {
          select: {
            id: true,
            title: true,
          },
        },
        tasks: {
          select: {
            id: true,
            status: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Map database 'name' field to frontend 'title' field and calculate progress
    const mappedProjects = projects.map(project => {
      // Calculate progress from tasks
      const totalTasks = project.tasks.length
      const completedTasks = project.tasks.filter(t => t.status.name === 'Done' || t.status.name === 'Check').length
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      
      // Determine status
      let status = 'active'
      if (project.archivedAt) {
        status = 'completed'
      } else if (totalTasks === 0) {
        status = 'planning'
      }

      return {
        id: project.id,
        title: project.name,
        description: project.description,
        status,
        progress,
        color: null,
        startDate: null,
        deadline: null,
        company: project.company,
        objective: project.objective,
        _count: project._count,
      }
    })

    return NextResponse.json({
      projects: mappedProjects,
      count: mappedProjects.length,
    })
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspaceId,
      companyId,
      objectiveId,
      title,
      description,
      status = 'planning',
      color,
      startDate,
      deadline,
      budget,
      createdBy,
    } = body

    if (!workspaceId || !title || !createdBy) {
      return NextResponse.json(
        { error: 'workspaceId, title, and createdBy are required' },
        { status: 400 }
      )
    }

    const project = await prisma.project.create({
      data: {
        workspaceId,
        companyId: companyId || null,
        objectiveId: objectiveId || null,
        name: title,
        description: description || null,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        objective: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
