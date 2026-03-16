import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processMessage } from '@/lib/ai/orchestrator'
import { requireWorkspace } from '@/lib/workspace'

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await requireWorkspace()
    const body = await request.json()
    const { message, conversationId, context } = body

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get or create conversation
    let conversation
    let conversationHistory: { role: 'user' | 'assistant'; content: string }[] = []

    if (conversationId) {
      conversation = await prisma.aIConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      if (conversation) {
        conversationHistory = conversation.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      }
    }

    if (!conversation) {
      conversation = await prisma.aIConversation.create({
        data: {
          workspaceId,
          userId: PLACEHOLDER_USER_ID,
          context: context || {},
        },
        include: { messages: true },
      })
    }

    // Save user message
    await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    })

    // Process message with AI orchestrator
    const aiResponse = await processMessage(
      workspaceId,
      PLACEHOLDER_USER_ID,
      message,
      conversationHistory
    )

    // Save assistant message
    const assistantMessage = await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse.content,
        actions: (aiResponse.actions || []) as any,
        metadata: aiResponse.metadata as any,
      },
    })

    return NextResponse.json({
      conversationId: conversation.id,
      message: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        actions: assistantMessage.actions,
        metadata: assistantMessage.metadata,
        createdAt: assistantMessage.createdAt,
      },
    })
  } catch (error) {
    console.error('[AI Chat] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
