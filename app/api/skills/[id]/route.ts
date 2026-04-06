import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'

/**
 * GET /api/skills/[id] — full skill including steps, qualityCriteria, examples
 * PATCH /api/skills/[id] — update (bumps version)
 * DELETE /api/skills/[id] — archive (sets status = archived)
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const skill = await prisma.skill.findUnique({
      where: { id },
      include: {
        _count: { select: { tasks: true } },
      },
    })

    if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })

    return NextResponse.json({ success: true, skill })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = validateAIAuth(request)
    const body = await request.json()

    const existing = await prisma.skill.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })

    const updatedBy = auth.valid ? (auth.assistant ?? body.updatedBy ?? null) : body.updatedBy ?? null

    const skill = await prisma.skill.update({
      where: { id },
      data: {
        ...(body.title           !== undefined && { title: body.title }),
        ...(body.description     !== undefined && { description: body.description }),
        ...(body.category        !== undefined && { category: body.category }),
        ...(body.skillType       !== undefined && { skillType: body.skillType }),
        ...(body.tags            !== undefined && { tags: body.tags }),
        ...(body.steps           !== undefined && { steps: body.steps }),
        ...(body.qualityCriteria !== undefined && { qualityCriteria: body.qualityCriteria }),
        ...(body.examples        !== undefined && { examples: body.examples }),
        ...(body.status          !== undefined && { status: body.status }),
        lastUpdatedBy: updatedBy,
        // Bump version if steps or qualityCriteria changed
        ...(body.steps || body.qualityCriteria ? { version: { increment: 1 } } : {}),
      },
    })

    return NextResponse.json({ success: true, skill })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = validateAIAuth(request)
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const skill = await prisma.skill.update({
      where: { id },
      data: { status: 'archived' },
    })

    return NextResponse.json({ success: true, archived: true, id: skill.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
