import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.aISuggestion.update({
      where: { id: params.id },
      data: {
        status: 'dismissed',
        dismissedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to dismiss recommendation:', error)
    return NextResponse.json({ error: 'Failed to dismiss' }, { status: 500 })
  }
}
