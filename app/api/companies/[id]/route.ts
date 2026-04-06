import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'

/**
 * GET /api/companies/[id]
 * GET /api/spaces/[id] alias — returns a single space/company
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = validateAIAuth(request)
    let workspaceId: string | null = null

    if (auth.valid) {
      workspaceId = request.nextUrl.searchParams.get('workspaceId')
      if (!workspaceId) {
        return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
      }
    }

    const space = await prisma.space.findFirst({
      where: { id, ...(workspaceId ? { workspaceId } : {}) },
      include: {
        _count: {
          select: {
            projects:  { where: { archivedAt: null } },
            tasks:     { where: { archivedAt: null, completedAt: null } },
            documents: true,
            insights:  true,
          },
        },
      },
    })

    if (!space) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, company: space, space })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * PATCH /api/companies/[id]
 * Update a space/company
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = validateAIAuth(request)
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name, industry, stage, businessModel, missionStatement, executiveSummary,
      vision, websiteUrl, revenue, description,
    } = body

    const space = await prisma.space.update({
      where: { id },
      data: {
        ...(name              !== undefined && { name }),
        ...(industry          !== undefined && { industry }),
        ...(stage             !== undefined && { stage }),
        ...(businessModel     !== undefined && { businessModel }),
        ...(missionStatement  !== undefined && { missionStatement }),
        ...(executiveSummary  !== undefined && { executiveSummary }),
        ...(description       !== undefined && { executiveSummary: description }),
        ...(vision            !== undefined && { vision }),
        ...(websiteUrl        !== undefined && { websiteUrl }),
        ...(revenue           !== undefined && { revenue: revenue ? parseFloat(revenue) : null }),
      },
    })

    return NextResponse.json({ success: true, company: space, space })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * DELETE /api/companies/[id]
 * Archive a space/company (sets archivedAt timestamp — not a hard delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = validateAIAuth(request)
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const space = await prisma.space.update({
      where: { id },
      data: { archivedAt: new Date() },
    })

    return NextResponse.json({ success: true, archived: true, id: space.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
