import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

/**
 * Get current user ID from Supabase session
 */
async function getUserId(): Promise<string> {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id || PLACEHOLDER_USER_ID
}

// GET /api/inbox - List inbox items or get stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const action = searchParams.get('action')
    const status = searchParams.get('status')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    // Stats endpoint
    if (action === 'stats') {
      const [total, unprocessed, processed, converted, completed, archived] = await Promise.all([
        prisma.inboxItem.count({ where: { workspaceId } }),
        prisma.inboxItem.count({ where: { workspaceId, status: 'unprocessed' } }),
        prisma.inboxItem.count({ where: { workspaceId, status: 'processed' } }),
        prisma.inboxItem.count({ where: { workspaceId, status: 'converted' } }),
        prisma.inboxItem.count({ where: { workspaceId, status: 'completed' } }),
        prisma.inboxItem.count({ where: { workspaceId, status: 'archived' } }),
      ])

      return NextResponse.json({
        total,
        unprocessed,
        processed,
        converted,
        completed,
        archived,
      })
    }

    // List inbox items
    const items = await prisma.inboxItem.findMany({
      where: {
        workspaceId,
        ...(status && status !== 'all' ? { status } : {}),
      },
      include: {
        workspace: {
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
      orderBy: { capturedAt: 'desc' },
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Failed to fetch inbox items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inbox items' },
      { status: 500 }
    )
  }
}

// POST /api/inbox - Create a new inbox item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspaceId,
      rawText,
      sourceType,
      transcript,
      cleanedText,
      assigneeId,
      projectId,
      dueDate,
      priority,
      status,
      aiProcessed,
      aiSummary,
      aiSuggestions,
      metadata,
    } = body

    if (!workspaceId || !rawText || !sourceType) {
      return NextResponse.json(
        { error: 'workspaceId, rawText, and sourceType are required' },
        { status: 400 }
      )
    }

    const userId = await getUserId()

    const inboxItem = await prisma.inboxItem.create({
      data: {
        workspaceId,
        createdBy: userId,
        sourceType,
        rawText,
        transcript,
        cleanedText,
        assigneeId,
        projectId,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        status: status || 'unprocessed',
        aiProcessed: aiProcessed || false,
        aiSummary,
        aiSuggestions,
        metadata,
      },
      include: {
        workspace: {
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

    return NextResponse.json(inboxItem, { status: 201 })
  } catch (error) {
    console.error('Failed to create inbox item:', error)
    return NextResponse.json(
      { error: 'Failed to create inbox item' },
      { status: 500 }
    )
  }
}
