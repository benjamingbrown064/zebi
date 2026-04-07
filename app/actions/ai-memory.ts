'use server'

import { prisma } from '@/lib/prisma'

export interface AIMemory {
  id: string
  workspaceId: string
  companyId: string | null
  projectId: string | null
  memoryType: string
  title: string
  description: string
  confidenceScore: number
  source: string | null
  createdAt: Date
  updatedAt: Date
  createdBy: string | null // "doug", "harvey", user UUID, or null
  authorAgent: string | null
  entryType: string | null
  date: string | null
  tags: string[]
  completed: any
  decisions: any
  blockers: any
  pending: any
  tomorrowFirst: any
  space?: {
    id: string
    name: string
  } | null
  project?: {
    id: string
    name: string
  } | null
}

export interface CreateAIMemoryInput {
  companyId?: string
  projectId?: string
  memoryType: string
  entryType?: string
  authorAgent?: string
  title: string
  description: string
  confidenceScore: number
  source?: string
  createdBy?: string
  date?: string        // "YYYY-MM-DD"
  tags?: string[]
  completed?: any
  decisions?: any
  blockers?: any
  pending?: any
  tomorrowFirst?: any
}

export interface UpdateAIMemoryInput {
  companyId?: string
  projectId?: string
  memoryType?: string
  title?: string
  description?: string
  confidenceScore?: number
  source?: string
}

export interface AIMemoryFilters {
  companyId?: string
  projectId?: string
  memoryType?: string
  entryType?: string
  authorAgent?: string
  search?: string
  minConfidence?: number
  date?: string       // filter to single date "YYYY-MM-DD"
  tags?: string[]
}

/**
 * Get all AI memories for a workspace with optional filters
 */
export async function getAIMemories(
  workspaceId: string,
  filters?: AIMemoryFilters
): Promise<AIMemory[]> {
  try {
    const where: any = { workspaceId }

    if (filters?.companyId) {
      where.companyId = filters.companyId
    }

    if (filters?.projectId) {
      where.projectId = filters.projectId
    }

    if (filters?.memoryType) {
      where.memoryType = filters.memoryType
    }

    if (filters?.minConfidence !== undefined) {
      where.confidenceScore = { gte: filters.minConfidence }
    }

    if (filters?.entryType)   where.entryType  = filters.entryType
    if (filters?.authorAgent) where.authorAgent = filters.authorAgent
    if (filters?.date)        where.date        = filters.date
    if (filters?.tags?.length) where.tags = { hasSome: filters.tags }

    if (filters?.search) {
      where.OR = [
        { title:       { contains: filters.search, mode: 'insensitive' as any } },
        { description: { contains: filters.search, mode: 'insensitive' as any } },
      ]
    }

    const memories = await prisma.aIMemory.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return memories as unknown as AIMemory[]
  } catch (error) {
    console.error('Error fetching AI memories:', error)
    throw new Error('Failed to fetch AI memories')
  }
}

/**
 * Get a single AI memory by ID
 */
export async function getAIMemory(
  workspaceId: string,
  memoryId: string
): Promise<AIMemory | null> {
  try {
    const memory = await prisma.aIMemory.findFirst({
      where: {
        id: memoryId,
        
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return memory as unknown as AIMemory
  } catch (error) {
    console.error('Error fetching AI memory:', error)
    throw new Error('Failed to fetch AI memory')
  }
}

/**
 * Create a new AI memory
 */
export async function createAIMemory(
  workspaceId: string,
  userId: string,
  input: CreateAIMemoryInput
): Promise<AIMemory> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const memory = await prisma.aIMemory.create({
      data: {
        workspaceId,
        companyId:      input.companyId   || null,
        projectId:      input.projectId   || null,
        memoryType:     input.memoryType,
        entryType:      input.entryType   || 'note',
        authorAgent:    input.authorAgent || null,
        title:          input.title,
        description:    input.description,
        confidenceScore: input.confidenceScore,
        source:         input.source      || null,
        createdBy:      input.createdBy   || userId,
        date:           input.date        || today,
        tags:           input.tags        || [],
        completed:      input.completed   ?? null,
        decisions:      input.decisions   ?? null,
        blockers:       input.blockers    ?? null,
        pending:        input.pending     ?? null,
        tomorrowFirst:  input.tomorrowFirst ?? null,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return memory as unknown as AIMemory
  } catch (error) {
    console.error('Error creating AI memory:', error)
    throw new Error('Failed to create AI memory')
  }
}

/**
 * Update an existing AI memory
 */
export async function updateAIMemory(
  workspaceId: string,
  memoryId: string,
  updates: UpdateAIMemoryInput
): Promise<AIMemory> {
  try {
    const memory = await prisma.aIMemory.update({
      where: {
        id: memoryId,
        
      },
      data: updates,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return memory as unknown as AIMemory
  } catch (error) {
    console.error('Error updating AI memory:', error)
    throw new Error('Failed to update AI memory')
  }
}

/**
 * Delete an AI memory
 */
export async function deleteAIMemory(
  workspaceId: string,
  memoryId: string
): Promise<boolean> {
  try {
    await prisma.aIMemory.delete({
      where: {
        id: memoryId,
        
      },
    })

    return true
  } catch (error) {
    console.error('Error deleting AI memory:', error)
    throw new Error('Failed to delete AI memory')
  }
}

/**
 * Get memory types for filtering
 */
export async function getMemoryTypes(): Promise<string[]> {
  return [
    'space',
    'project',
    'strategic',
    'research',
    'conversation',
  ]
}
