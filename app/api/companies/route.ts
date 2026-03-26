import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

// GET /api/companies - List spaces/companies (AI assistant endpoint)
export async function GET(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    const spaces = await prisma.space.findMany({
      where: { workspaceId, archivedAt: null },
      include: {
        _count: {
          select: {
            projects: { where: { archivedAt: null } },
            tasks: { where: { archivedAt: null, completedAt: null } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(spaces)
  } catch (error) {
    console.error('Failed to fetch companies:', error)
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  }
}

// POST /api/companies - Create a space/company (AI assistant endpoint)
export async function POST(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, name, industry, stage, missionStatement, websiteUrl } = body

    if (!workspaceId || !name) {
      return NextResponse.json({ error: 'workspaceId and name are required' }, { status: 400 })
    }

    const space = await prisma.space.create({
      data: {
        workspaceId,
        name,
        industry: industry || null,
        stage: stage || null,
        missionStatement: missionStatement || null,
        websiteUrl: websiteUrl || null,
        createdBy: PLACEHOLDER_USER_ID,
      },
    })

    return NextResponse.json(space, { status: 201 })
  } catch (error) {
    console.error('Failed to create company:', error)
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }
}
