import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'
import { requireWorkspace } from '@/lib/workspace'

export const dynamic = 'force-dynamic'

/**
 * GET /api/skills?workspaceId=...&category=research&tags=outreach,email&status=active
 * List skills with optional filters
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

    const { searchParams } = request.nextUrl
    const category  = searchParams.get('category')  || undefined
    const skillType = searchParams.get('skillType') || undefined
    const status    = searchParams.get('status')    || 'active'
    const search    = searchParams.get('search')    || undefined
    const tags      = searchParams.get('tags')?.split(',').filter(Boolean) || undefined

    const where: any = { workspaceId }
    if (status !== 'all') where.status = status
    if (category)  where.category  = category
    if (skillType) where.skillType = skillType
    if (tags?.length) where.tags = { hasSome: tags }
    if (search) {
      where.OR = [
        { title:       { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const skills = await prisma.skill.findMany({
      where,
      select: {
        id: true, title: true, description: true,
        category: true, skillType: true, tags: true,
        status: true, version: true, createdBy: true,
        lastUpdatedBy: true, createdAt: true, updatedAt: true,
        // Don't return full steps/criteria in list — saves bandwidth
        _count: { select: { tasks: true } },
      },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    })

    return NextResponse.json({ success: true, count: skills.length, skills })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * POST /api/skills
 * Create a new skill
 *
 * Required: workspaceId, title, category, steps, qualityCriteria
 * Optional: description, skillType, tags, examples, status, createdBy
 *
 * steps shape: [{ order: 1, title: "...", description: "...", tips?: "..." }]
 * qualityCriteria shape: { good: ["..."], bad: ["..."], checkBefore: ["..."] }
 * examples shape: { good: ["..."], bad: ["..."] }
 */
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

    // Validate required fields
    const missing: string[] = []
    if (!body.title)    missing.push('title')
    if (!body.category) missing.push('category')
    if (!body.steps)    missing.push('steps')
    if (!body.qualityCriteria) missing.push('qualityCriteria')

    if (missing.length > 0) {
      return NextResponse.json({
        error: `Missing required fields: ${missing.join(', ')}`,
        required: {
          title:           'string',
          category:        'string — research | outreach | content | scraping | mailer | lead-gen | build | ops | other',
          steps:           'array — [{ order: number, title: string, description: string, tips?: string }]',
          qualityCriteria: 'object — { good: string[], bad: string[], checkBefore: string[] }',
        },
        optional: {
          description: 'string',
          skillType:   'procedure | checklist | template | sop — default "procedure"',
          tags:        'string[]',
          examples:    '{ good: string[], bad: string[] }',
          status:      'active | draft | archived — default "active"',
          createdBy:   'string — user UUID or agent name',
        },
      }, { status: 400 })
    }

    const skill = await prisma.skill.create({
      data: {
        workspaceId,
        title:           body.title,
        description:     body.description     || null,
        category:        body.category,
        skillType:       body.skillType        || 'procedure',
        tags:            body.tags             || [],
        steps:           body.steps,
        qualityCriteria: body.qualityCriteria,
        examples:        body.examples         || null,
        status:           body.status           || 'active',
        ownerAgent:       body.ownerAgent       || null,
        maintainerAgents: body.maintainerAgents || [],
        createdBy:        body.createdBy        || null,
        lastUpdatedBy:    body.createdBy        || null,
      },
    })

    return NextResponse.json({ success: true, skill }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
