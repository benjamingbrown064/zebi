import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'


// GET /api/projects/[id] - Get single project with tasks
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = await requireWorkspace()
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        workspaceId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        objective: {
          select: {
            id: true,
            title: true,
            status: true,
            progressPercent: true,
            deadline: true,
          },
        },
        tasks: {
          where: { archivedAt: null },
          include: {
            status: {
              select: {
                name: true,
                type: true,
              },
            },
          },
          orderBy: [
            { completedAt: 'asc' },
            { priority: 'asc' },
            { createdAt: 'desc' },
          ],
        },
        documents: {
          orderBy: { updatedAt: 'desc' },
          take: 5,
        },
        files: {
          orderBy: { uploadedAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Failed to fetch project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// PUT /api/projects/[id] - Update project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      companyId,
      objectiveId,
      priority,
      timeline,
      owner,
    } = body

    const project = await prisma.project.update({
      where: {
        id: params.id,
      },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(companyId !== undefined && { companyId }),
        ...(objectiveId !== undefined && { objectiveId }),
        ...(priority !== undefined && { priority }),
        ...(timeline !== undefined && { timeline }),
        ...(owner !== undefined && { owner }),
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Failed to update project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id] - Archive project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.update({
      where: {
        id: params.id,
      },
      data: {
        archivedAt: new Date(),
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Failed to archive project:', error)
    return NextResponse.json(
      { error: 'Failed to archive project' },
      { status: 500 }
    )
  }
}
