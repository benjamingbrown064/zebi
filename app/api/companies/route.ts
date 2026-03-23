import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const revalidate = 120 // Cache for 120s — invalidated on writes


const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

// GET /api/companies - List all companies
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const includeArchived = searchParams.get('includeArchived') === 'true'

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const companies = await prisma.company.findMany({
      where: {
        workspaceId,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      include: {
        _count: {
          select: {
            projects: { where: { archivedAt: null } },
            tasks: { where: { archivedAt: null, completedAt: null } },
            documents: true,
            insights: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(companies)
  } catch (error) {
    console.error('Failed to fetch companies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    )
  }
}

// POST /api/companies - Create a new company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspaceId,
      name,
      industry,
      stage,
      businessModel,
      missionStatement,
      executiveSummary,
      vision,
      targetCustomers,
      marketSize,
      coreProduct,
      positioning,
      logoUrl,
      websiteUrl,
      revenue,
    } = body

    if (!workspaceId || !name) {
      return NextResponse.json(
        { error: 'workspaceId and name are required' },
        { status: 400 }
      )
    }

    const company = await prisma.company.create({
      data: {
        workspaceId,
        name,
        industry,
        stage,
        businessModel,
        missionStatement,
        executiveSummary,
        vision,
        targetCustomers,
        marketSize,
        coreProduct,
        positioning,
        logoUrl,
        websiteUrl,
        revenue: revenue ? parseFloat(revenue) : null,
        createdBy: PLACEHOLDER_USER_ID,
      },
      include: {
        _count: {
          select: {
            projects: { where: { archivedAt: null } },
            tasks: { where: { archivedAt: null, completedAt: null } },
            documents: true,
            insights: true,
          },
        },
      },
    })

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    console.error('Failed to create company:', error)
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    )
  }
}
