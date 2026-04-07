import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAIAuth } from '@/lib/doug-auth'

const SYSTEM_AUTHOR = 'system';

function markdownToTiptap(text: string) {
  const lines = text.split(/\r?\n/)
  const nodes: object[] = []
  for (const line of lines) {
    if (!line.trim()) continue
    const hm = line.match(/^(#{1,3})\s+(.+)/)
    if (hm) { nodes.push({ type: 'heading', attrs: { level: hm[1].length }, content: [{ type: 'text', text: hm[2] }] }); continue }
    nodes.push({ type: 'paragraph', content: [{ type: 'text', text: line }] })
  }
  return { type: 'doc', content: nodes }
}

// GET /api/documents/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        versions: {
          select: {
            id: true, version: true, createdAt: true, createdBy: true,
            authorName: true, authorAgent: true, authorType: true,
            changeDescription: true, changeTags: true, snapshotTitle: true,
          },
          orderBy: { version: 'desc' }
        }
      }
    });
    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error('GET /api/documents/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch document' }, { status: 500 });
  }
}

// PUT /api/documents/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, documentType } = body;

    // Resolve content
    const rawText: string | undefined = body.content ?? body.body
    let contentRich = body.contentRich
    if (!contentRich || (contentRich?.content?.length === 0 && rawText)) {
      if (rawText) contentRich = markdownToTiptap(rawText)
    }

    const existingDoc = await prisma.document.findUnique({ where: { id: params.id } });
    if (!existingDoc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const contentChanged = contentRich &&
      JSON.stringify(contentRich) !== JSON.stringify(existingDoc.contentRich)

    const titleChanged = title !== undefined && title !== existingDoc.title

    // Determine author
    const auth = validateAIAuth(request)
    const authorAgent = auth.valid ? auth.assistant : null
    const authorName  = body.authorName
      || (auth.valid ? (auth.assistant!.charAt(0).toUpperCase() + auth.assistant!.slice(1)) : (body.authorName || 'Benjamin'))
    const authorType  = auth.valid ? 'agent' : 'user'

    // Build update
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (documentType !== undefined) updateData.documentType = documentType
    if (contentRich !== undefined) updateData.contentRich = contentRich
    if (body.projectId !== undefined) updateData.projectId = body.projectId || null
    if (body.companyId !== undefined) updateData.companyId = body.companyId || null
    if (body.functionTags !== undefined) updateData.functionTags = body.functionTags
    if (body.typeTags !== undefined) updateData.typeTags = body.typeTags
    if (body.stageTags !== undefined) updateData.stageTags = body.stageTags
    if (body.canonical !== undefined) updateData.canonical = body.canonical
    if (body.supersededBy !== undefined) updateData.supersededBy = body.supersededBy || null

    // Always snapshot when content or title changes (not on tag-only changes)
    const shouldVersion = (contentChanged || titleChanged) && body.autoSave !== true
    if (shouldVersion) {
      updateData.version = existingDoc.version + 1
    }

    const document = await prisma.document.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } }
      }
    });

    // Create version record
    if (shouldVersion) {
      // Determine change tags automatically
      const autoTags: string[] = []
      if (contentChanged) autoTags.push('content')
      if (titleChanged) autoTags.push('title')
      const explicitTags: string[] = body.changeTags || []
      const changeTags = [...new Set([...autoTags, ...explicitTags])]

      await prisma.documentVersion.create({
        data: {
          documentId: document.id,
          version: document.version,
          contentRich: (contentRich ?? existingDoc.contentRich) as any,
          createdBy: authorAgent || SYSTEM_AUTHOR,
          authorName,
          authorAgent,
          authorType,
          changeDescription: body.changeDescription || (titleChanged && contentChanged
            ? `Updated title and content`
            : titleChanged ? `Renamed to "${title}"`
            : contentChanged ? `Updated content`
            : `Saved`),
          changeTags,
          changeNotes: body.changeNotes || null,
          snapshotTitle: title ?? existingDoc.title,
          snapshotTags: {
            functionTags: (document as any).functionTags || [],
            typeTags: (document as any).typeTags || [],
            stageTags: (document as any).stageTags || [],
          },
        }
      });
    }

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error('PUT /api/documents/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update document' }, { status: 500 });
  }
}

// PATCH /api/documents/[id] — alias for PUT
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(request, { params });
}

// DELETE /api/documents/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const document = await prisma.document.findUnique({ where: { id: params.id } });
    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }
    await prisma.document.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/documents/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete document' }, { status: 500 });
  }
}
