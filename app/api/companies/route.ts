import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

/**
 * GET /api/companies?workspaceId=...
 * POST /api/companies
 *
 * Alias for /api/spaces — the data model uses Space but agents reference
 * companies. Returns spaces shaped as companies for backward compatibility.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    let workspaceId: string
    if (auth.valid) {
      const wid = request.nextUrl.searchParams.get('workspaceId')
      if (!wid) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
      workspaceId = wid
    } else {
      workspaceId = await requireWorkspace()
    }

    const spaces = await prisma.space.findMany({
      where: { workspaceId, archivedAt: null },
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
      orderBy: { createdAt: 'desc' },
    })

    // Return as both spaces and companies for agent compatibility
    const companies = spaces.map(s => ({
      id:          s.id,
      name:        s.name,
      workspaceId: s.workspaceId,
      industry:    s.industry,
      stage:       s.stage,
      revenue:     s.revenue,
      description: s.executiveSummary,
      website:     s.websiteUrl,
      createdAt:   s.createdAt,
      updatedAt:   s.updatedAt,
      _count:      s._count,
    }))

    return NextResponse.json({ success: true, count: companies.length, companies, spaces: companies })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    const body = await request.json()

    let workspaceId: string
    if (auth.valid) {
      if (!body.workspaceId) return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
      workspaceId = body.workspaceId
    } else {
      workspaceId = await requireWorkspace()
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    // Resolve createdBy
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    })

    const space = await prisma.space.create({
      data: {
        workspaceId,
        name:        body.name.trim(),
        executiveSummary: body.description ?? body.executiveSummary ?? null,
        industry:         body.industry    ?? null,
        stage:            body.stage       ?? null,
        revenue:          body.revenue     ?? null,
        websiteUrl:       body.website     ?? body.websiteUrl ?? null,
        createdBy:   workspace?.ownerId ?? '00000000-0000-0000-0000-000000000000',
      },
    })

    return NextResponse.json({
      success: true,
      company: space,
      space,
    }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
