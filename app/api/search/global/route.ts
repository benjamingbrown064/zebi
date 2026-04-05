import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'

export async function GET(request: Request) {
  try {
    const workspaceId = await requireWorkspace()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    // Return empty if query too short
    if (query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const searchTerm = { contains: query, mode: 'insensitive' as const }
    const results: Array<{
      type: 'space' | 'project' | 'objective' | 'task' | 'document' | 'note'
      id: string
      title: string
      subtitle?: string
      href: string
    }> = []

    // Search Spaces
    const spaces = await prisma.space.findMany({
      where: {
        workspaceId,
        name: searchTerm,
      },
      take: 5,
      select: {
        id: true,
        name: true,
      },
    })
    spaces.forEach((space: any) => {
      results.push({
        type: 'space',
        id: space.id,
        title: space.name,
        href: `/spaces/${space.id}`,
      })
    })

    // Search Projects
    const projects = await prisma.project.findMany({
      where: {
        workspaceId,
        OR: [
          { name: searchTerm },
          { description: searchTerm },
        ],
      },
      take: 5,
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
    })
    projects.forEach(project => {
      results.push({
        type: 'project',
        id: project.id,
        title: project.name,
        subtitle: project.company?.name,
        href: `/projects/${project.id}`,
      })
    })

    // Search Objectives
    const objectives = await prisma.objective.findMany({
      where: {
        workspaceId,
        title: searchTerm,
      },
      take: 5,
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
    })
    objectives.forEach(objective => {
      results.push({
        type: 'objective',
        id: objective.id,
        title: objective.title,
        subtitle: objective.company?.name,
        href: `/objectives/${objective.id}`,
      })
    })

    // Search Tasks
    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
        title: searchTerm,
      },
      take: 5,
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
    })
    tasks.forEach(task => {
      results.push({
        type: 'task',
        id: task.id,
        title: task.title,
        subtitle: task.project?.name,
        href: `/tasks`,
      })
    })

    // Search Documents
    const documents = await prisma.document.findMany({
      where: {
        workspaceId,
        title: searchTerm,
      },
      take: 5,
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
    })
    documents.forEach(doc => {
      results.push({
        type: 'document',
        id: doc.id,
        title: doc.title,
        subtitle: doc.project?.name,
        href: `/documents/${doc.id}`,
      })
    })

    // Search Notes
    const notes = await prisma.note.findMany({
      where: {
        workspaceId,
        OR: [
          { title: searchTerm },
          { body: searchTerm },
        ],
      },
      take: 5,
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
    })
    notes.forEach(note => {
      results.push({
        type: 'note',
        id: note.id,
        title: note.title || 'Untitled Note',
        subtitle: note.company?.name || undefined,
        href: `/notes/${note.id}`,
      })
    })

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Global search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
