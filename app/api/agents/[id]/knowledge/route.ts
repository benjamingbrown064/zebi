import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_WORKSPACE = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'

function getWorkspaceId(req: NextRequest, body?: any): string {
  return body?.workspaceId || req.nextUrl.searchParams.get('workspaceId') || DEFAULT_WORKSPACE
}

// POST /api/agents/[id]/knowledge — add knowledge link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const workspaceId = getWorkspaceId(request, body)

    if (!body.title || !body.linkType) {
      return NextResponse.json({ success: false, error: 'title and linkType are required' }, { status: 400 })
    }

    const link = await prisma.agentKnowledgeLink.create({
      data: {
        agentId: id,
        workspaceId,
        linkType: body.linkType,
        title: body.title,
        skillId: body.skillId || null,
        documentId: body.documentId || null,
        url: body.url || null,
        notes: body.notes || null,
        required: body.required ?? false,
        order: body.order ?? 0,
      },
    })

    return NextResponse.json({ success: true, link })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE /api/agents/[id]/knowledge?linkId=... — remove knowledge link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const linkId = request.nextUrl.searchParams.get('linkId')
    if (!linkId) return NextResponse.json({ success: false, error: 'linkId is required' }, { status: 400 })

    await prisma.agentKnowledgeLink.delete({ where: { id: linkId } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
