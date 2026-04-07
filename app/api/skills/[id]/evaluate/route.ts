import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateAIAuth } from '@/lib/doug-auth'

const DEFAULT_WORKSPACE = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'

// POST /api/skills/[id]/evaluate — submit a skill evaluation after task completion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: skillId } = await params
    const body = await request.json()
    const workspaceId = body.workspaceId || DEFAULT_WORKSPACE

    // Validate skill exists
    const skill = await prisma.skill.findUnique({ where: { id: skillId } })
    if (!skill) {
      return NextResponse.json({ success: false, error: 'Skill not found' }, { status: 404 })
    }

    // Determine agent from auth or body
    const auth = validateAIAuth(request)
    const agentId = auth.valid ? auth.assistant! : (body.agentId || 'unknown')

    // Determine agentSkillRole
    let agentSkillRole = 'incidental-user'
    if (skill.ownerAgent === agentId) {
      agentSkillRole = 'owner'
    } else if (skill.maintainerAgents?.includes(agentId)) {
      agentSkillRole = 'regular-user'
    } else {
      // Check if this agent has this skill as required in their knowledge links
      const knowledgeLink = await prisma.agentKnowledgeLink.findFirst({
        where: { workspaceId, agentId, skillId, required: true }
      })
      if (knowledgeLink) agentSkillRole = 'regular-user'
    }

    // Validate required fields
    if (!body.qualityScore || !['met', 'partial', 'not_met'].includes(body.qualityScore)) {
      return NextResponse.json({ success: false, error: 'qualityScore must be met | partial | not_met' }, { status: 400 })
    }

    const evaluation = await prisma.skillEvaluation.create({
      data: {
        workspaceId,
        skillId,
        taskId:         body.taskId        || null,
        skillVersion:   skill.version,
        agentId,
        agentSkillRole,
        qualityScore:   body.qualityScore,
        confidence:     body.confidence    || 'medium',
        strengthNotes:  body.strengthNotes || null,
        gapNotes:       body.gapNotes      || null,
        deviationNotes: body.deviationNotes || null,
        suggestUpdate:  body.suggestUpdate  ?? false,
      }
    })

    return NextResponse.json({ success: true, evaluation })
  } catch (e: any) {
    console.error('POST /api/skills/[id]/evaluate error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// GET /api/skills/[id]/evaluate — evaluation history + aggregate stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: skillId } = await params
    const workspaceId = request.nextUrl.searchParams.get('workspaceId') || DEFAULT_WORKSPACE
    const agentId = request.nextUrl.searchParams.get('agentId')

    const where: any = { skillId, workspaceId }
    if (agentId) where.agentId = agentId

    const [evaluations, skill] = await Promise.all([
      prisma.skillEvaluation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.skill.findUnique({
        where: { id: skillId },
        select: { version: true, ownerAgent: true, maintainerAgents: true }
      })
    ])

    if (!skill) {
      return NextResponse.json({ success: false, error: 'Skill not found' }, { status: 404 })
    }

    // Aggregate stats for current version
    const currentVersionEvals = evaluations.filter(e => e.skillVersion === skill.version)
    const total = currentVersionEvals.length
    const met     = currentVersionEvals.filter(e => e.qualityScore === 'met').length
    const partial = currentVersionEvals.filter(e => e.qualityScore === 'partial').length
    const notMet  = currentVersionEvals.filter(e => e.qualityScore === 'not_met').length
    const metPct  = total > 0 ? Math.round((met / total) * 100) : null
    const suggestCount = currentVersionEvals.filter(e => e.suggestUpdate).length

    return NextResponse.json({
      success: true,
      evaluations,
      stats: {
        currentVersion: skill.version,
        total,
        met, partial, notMet,
        metPct,
        suggestCount,
        ownerAgent: skill.ownerAgent,
      }
    })
  } catch (e: any) {
    console.error('GET /api/skills/[id]/evaluate error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
