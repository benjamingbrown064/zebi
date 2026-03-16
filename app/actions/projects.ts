'use server'

import { prisma } from '@/lib/prisma'

export interface Project {
  id: string
  name: string
  description?: string | null
  archivedAt?: Date | null
}

/**
 * Get all projects for a workspace (non-archived)
 */
export async function getProjects(workspaceId: string): Promise<Project[]> {
  try {
    const projects = await prisma.project.findMany({
      where: {
        workspaceId,
        archivedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        description: true,
        archivedAt: true,
      },
    })

    return projects
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('getProjects error for workspace', workspaceId, ':', errorMsg)
    return []
  }
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        archivedAt: true,
      },
    })

    return project
  } catch (err) {
    console.error('getProject error:', err)
    return null
  }
}
