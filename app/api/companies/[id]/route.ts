import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspace } from '@/lib/workspace'
import { validateAIAuth } from '@/lib/doug-auth'

// GET /api/companies/[id] - Get single company
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const company = await prisma.company.findFirst({
      where: { id: params.id, workspaceId },
      include: {
        projects: {
          where: { archivedAt: null },
          include: {
            tasks: { where: { archivedAt: null }, select: { id: true, completedAt: true } },
            objective: { select: { id: true, title: true, status: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        documents: { orderBy: { updatedAt: 'desc' } },
        insights: {
          where: { status: { in: ['new', 'reviewed'] } },
          orderBy: { createdAt: 'desc' },
        },
        memories: { orderBy: { updatedAt: 'desc' } },
        files: { orderBy: { uploadedAt: 'desc' } },
        objectives: {
          where: { status: { in: ['active', 'on_track', 'at_risk', 'blocked'] } },
          orderBy: { deadline: 'asc' },
          select: { id: true, title: true, description: true, status: true, deadline: true },
        },
        tasks: {
          where: { archivedAt: null, completedAt: null },
          orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }],
          include: {
            project: { select: { id: true, name: true } },
            objective: { select: { id: true, title: true } },
          },
        },
        _count: {
          select: {
            projects: { where: { archivedAt: null } },
            tasks: { where: { archivedAt: null, completedAt: null } },
            documents: true,
            insights: true,
            memories: true,
            files: true,
            objectives: { where: { status: { in: ['active', 'on_track', 'at_risk', 'blocked'] } } },
          },
        },
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json(company)
  } catch (error) {
    console.error('Failed to fetch company:', error)
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 })
  }
}

// PUT /api/companies/[id] - Update company
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      name, industry, stage, businessModel, missionStatement, executiveSummary,
      vision, strategicObjectives, revenueTargets, targetCustomers, marketSize,
      competitors, differentiators, coreProduct, pricing, features, roadmap,
      usps, positioning, aiImprovementAreas, aiOpportunities, logoUrl, websiteUrl, revenue,
    } = body

    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(industry !== undefined && { industry }),
        ...(stage !== undefined && { stage }),
        ...(businessModel !== undefined && { businessModel }),
        ...(missionStatement !== undefined && { missionStatement }),
        ...(executiveSummary !== undefined && { executiveSummary }),
        ...(vision !== undefined && { vision }),
        ...(strategicObjectives !== undefined && { strategicObjectives }),
        ...(revenueTargets !== undefined && { revenueTargets }),
        ...(targetCustomers !== undefined && { targetCustomers }),
        ...(marketSize !== undefined && { marketSize }),
        ...(competitors !== undefined && { competitors }),
        ...(differentiators !== undefined && { differentiators }),
        ...(coreProduct !== undefined && { coreProduct }),
        ...(pricing !== undefined && { pricing }),
        ...(features !== undefined && { features }),
        ...(roadmap !== undefined && { roadmap }),
        ...(usps !== undefined && { usps }),
        ...(positioning !== undefined && { positioning }),
        ...(aiImprovementAreas !== undefined && { aiImprovementAreas }),
        ...(aiOpportunities !== undefined && { aiOpportunities }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(websiteUrl !== undefined && { websiteUrl }),
        ...(revenue !== undefined && { revenue: revenue ? parseFloat(revenue) : null }),
      },
    })

    return NextResponse.json(company)
  } catch (error) {
    console.error('Failed to update company:', error)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }
}

// DELETE /api/companies/[id] - Archive company
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const company = await prisma.company.update({
      where: { id: params.id },
      data: { archivedAt: new Date() },
    })
    return NextResponse.json(company)
  } catch (error) {
    console.error('Failed to archive company:', error)
    return NextResponse.json({ error: 'Failed to archive company' }, { status: 500 })
  }
}
