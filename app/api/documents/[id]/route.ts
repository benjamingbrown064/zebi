import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAIAuth } from '@/lib/doug-auth'

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

// GET /api/documents/[id] - Get single document
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
          select: { id: true, version: true, createdAt: true, createdBy: true },
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

// PUT /api/documents/[id] - Update document
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, documentType, createVersion } = body;

    // Accept contentRich (TipTap JSON) or content/body (markdown/plain text)
    const rawText: string | undefined = body.content ?? body.body
    let contentRich = body.contentRich
    if (!contentRich || (contentRich?.content?.length === 0 && rawText)) {
      if (rawText) {
        const lines = rawText.split(/\r?\n/)
        const nodes: object[] = []
        for (const line of lines) {
          if (!line.trim()) continue
          const hm = line.match(/^(#{1,3})\s+(.+)/)
          if (hm) { nodes.push({ type: 'heading', attrs: { level: hm[1].length }, content: [{ type: 'text', text: hm[2] }] }); continue }
          nodes.push({ type: 'paragraph', content: [{ type: 'text', text: line }] })
        }
        contentRich = { type: 'doc', content: nodes }
      }
    }

    const existingDoc = await prisma.document.findUnique({ where: { id: params.id } });
    if (!existingDoc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const contentChanged = contentRich &&
      JSON.stringify(contentRich) !== JSON.stringify(existingDoc.contentRich);

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (documentType !== undefined) updateData.documentType = documentType;
    if (contentRich !== undefined) updateData.contentRich = contentRich;
    if (body.projectId !== undefined) updateData.projectId = body.projectId || null;
    if (body.companyId !== undefined) updateData.companyId = body.companyId || null;
    if (contentChanged && createVersion) {
      updateData.version = existingDoc.version + 1;
    }

    const document = await prisma.document.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } }
      }
    });

    if (contentChanged && createVersion) {
      await prisma.documentVersion.create({
        data: {
          documentId: document.id,
          version: document.version,
          contentRich: document.contentRich as any,
          createdBy: DEFAULT_USER_ID
        }
      });
    }

    return NextResponse.json({ success: true, document });

  } catch (error) {
    console.error('PUT /api/documents/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update document' }, { status: 500 });
  }
}

// DELETE /api/documents/[id] - Delete document
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
