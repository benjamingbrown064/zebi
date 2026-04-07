import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_WORKSPACE = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'

// GET /api/agents/[id]/profile-summary
// Lightweight version-check endpoint for agent startup.
// Returns profileVersion + required skill/document versions only.
// Agents compare this against their last loaded state — only fetch full
// profile if something has changed. Keeps the heartbeat-frequency calls cheap.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const workspaceId =
      request.nextUrl.searchParams.get('workspaceId') || DEFAULT_WORKSPACE

    const agent = await prisma.agent.findUnique({
      where: { workspaceId_id: { workspaceId, id } },
      select: {
        id: true,
        name: true,
        profileVersion: true,
        updatedAt: true,
        knowledgeLinks: {
          where: { required: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            linkType: true,
            title: true,
            skillId: true,
            documentId: true,
            order: true,
            skill: { select: { id: true, version: true } },
            document: { select: { id: true, version: true } },
          }
        }
      }
    })

    if (!agent) {
      return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })
    }

    // Build a compact version map agents can compare cheaply
    const requiredVersions: Record<string, number> = {}
    for (const link of agent.knowledgeLinks) {
      if (link.skill) requiredVersions[`skill:${link.skillId}`] = link.skill.version
      if (link.document) requiredVersions[`doc:${link.documentId}`] = link.document.version
    }

    return NextResponse.json({
      success: true,
      id: agent.id,
      name: agent.name,
      profileVersion: agent.profileVersion,
      updatedAt: agent.updatedAt,
      requiredVersions,
      // Convenience: full fetch URL if reload needed
      fullProfileUrl: `https://zebi.app/api/agents/${id}?workspaceId=${workspaceId}&includeSkillContent=true`,
      requiredLinks: agent.knowledgeLinks.map(l => ({
        id: l.id,
        linkType: l.linkType,
        title: l.title,
        skillId: l.skillId,
        documentId: l.documentId,
        order: l.order,
        currentVersion: l.skill?.version ?? l.document?.version ?? null,
      }))
    })
  } catch (e: any) {
    console.error('GET /api/agents/[id]/profile-summary error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
