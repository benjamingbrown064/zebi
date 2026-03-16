import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const workspaceId = searchParams.get('workspaceId')

    if (!taskId || !workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const attachments = await prisma.taskAttachment.findMany({
      where: { taskId, workspaceId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      attachments: attachments.map(a => ({
        id: a.id,
        filename: a.filename,
        mimeType: a.mimeType,
        sizeBytes: Number(a.sizeBytes),
        storagePath: a.storagePath,
        createdAt: a.createdAt.toISOString(),
      }))
    })
  } catch (err) {
    console.error('List attachments error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
