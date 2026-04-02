import { NextRequest, NextResponse } from 'next/server'
import { requireDougAuth } from '@/lib/doug-auth'
import { getDougWorkspaceId } from '@/lib/doug-workspace'
import { prisma } from '@/lib/prisma'

const DEFAULT_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

/**
 * POST /api/doug/space
 *
 * Create a new space (canonical endpoint — replaces /api/doug/company)
 * 
 * Body:
 * {
 *   "name": "Love Warranty",
 *   "industry": "Automotive" (optional),
 *   "stage": "seed|mvp|launch|growth|scale" (optional),
 *   "businessModel": "SaaS|Marketplace|Service|Product" (optional),
 *   "revenue": 105000 (optional),
 *   "missionStatement": "..." (optional),
 *   "websiteUrl": "..." (optional)
 * }
 */
export async function POST(request: NextRequest) {
  const authError = requireDougAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    const body = await request.json()
    const {
      name,
      industry,
      stage,
      businessModel,
      revenue,
      missionStatement,
      websiteUrl,
      userId,
    } = body

    // Resolve workspace from Doug API context
    const workspaceId = await getDougWorkspaceId(userId)

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      )
    }

    const space = await prisma.space.create({
      data: {
        workspaceId,
        name,
        industry: industry || null,
        stage: stage || null,
        businessModel: businessModel || null,
        revenue: revenue ? parseFloat(revenue) : null,
        missionStatement: missionStatement || null,
        websiteUrl: websiteUrl || null,
        createdBy: userId || DEFAULT_USER_ID,
      },
      include: {
        _count: {
          select: {
            projects: true,
            objectives: true,
          },
        },
      },
    })

    return NextResponse.json({
      company: {
        id: space.id,
        name: space.name,
        industry: space.industry,
        stage: space.stage,
        revenue: space.revenue ? Number(space.revenue) : null,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[Doug API] Failed to create space:', error)
    return NextResponse.json(
      { error: 'Failed to create space' },
      { status: 500 }
    )
  }
}
