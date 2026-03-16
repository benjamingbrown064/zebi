import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'


export async function GET(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()
    const conversations = await prisma.aIConversation.findMany({
      where: { workspaceId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Just get first message for preview
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('[AI Conversations] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
