import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/workspace'
import { validateAIAuth } from '@/lib/doug-auth'

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

// GET /api/documents - List documents with filters
export async function GET(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    let workspaceId: string

    if (auth.valid) {
      const wid = new URL(request.url).searchParams.get('workspaceId')
      if (!wid) return NextResponse.json({ success: false, error: 'workspaceId is required' }, { status: 400 })
      workspaceId = wid
    } else {
      workspaceId = await requireWorkspace()
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const projectId = searchParams.get('projectId');
    const documentType = searchParams.get('documentType');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = { workspaceId };
    if (companyId) where.companyId = companyId;
    if (projectId) where.projectId = projectId;
    if (documentType) where.documentType = documentType;
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          versions: {
            select: { id: true, version: true, createdAt: true },
            orderBy: { version: 'desc' },
            take: 1
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.document.count({ where })
    ]);

    return NextResponse.json({ success: true, documents, total, limit, offset });

  } catch (error) {
    console.error('GET /api/documents error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch documents' }, { status: 500 });
  }
}

/** Convert plain markdown/text string to minimal TipTap JSON */
function markdownToTiptap(text: string): object {
  const lines = text.split(/\r?\n/)
  const nodes: object[] = []

  for (const line of lines) {
    if (!line.trim()) continue

    const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      nodes.push({
        type: 'heading',
        attrs: { level: headingMatch[1].length },
        content: [{ type: 'text', text: headingMatch[2] }],
      })
      continue
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)/)
    if (bulletMatch) {
      nodes.push({
        type: 'bulletList',
        content: [{
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: bulletMatch[1] }] }],
        }],
      })
      continue
    }

    nodes.push({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })
  }

  return { type: 'doc', content: nodes }
}

// POST /api/documents - Create new document
export async function POST(request: NextRequest) {
  try {
    const auth = validateAIAuth(request)
    let workspaceId: string

    const body = await request.json();
    // Accept: contentRich (TipTap JSON), content or body (markdown/plain text)
    const { companyId, projectId, title, documentType } = body;
    const rawText: string | undefined = body.content ?? body.body
    let contentRich = body.contentRich

    // If Harvey sent plain text/markdown, convert it
    if (!contentRich || (contentRich?.content?.length === 0 && rawText)) {
      contentRich = rawText ? markdownToTiptap(rawText) : { type: 'doc', content: [] }
    }

    if (auth.valid) {
      if (!body.workspaceId) return NextResponse.json({ success: false, error: 'workspaceId is required' }, { status: 400 })
      workspaceId = body.workspaceId
    } else {
      workspaceId = await requireWorkspace()
    }

    const docData = {
      workspaceId,
      companyId: companyId || null,
      projectId: projectId || null,
      title: title || 'Untitled Document',
      documentType: documentType || 'notes',
      contentRich,
      version: 1,
      createdBy: DEFAULT_USER_ID
    };

    const document = await prisma.document.create({
      data: docData,
      include: {
        company: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } }
      }
    });

    await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        version: 1,
        contentRich: document.contentRich as any,
        createdBy: DEFAULT_USER_ID
      }
    });

    return NextResponse.json({ success: true, document }, { status: 201 });

  } catch (error) {
    console.error('POST /api/documents error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create document' }, { status: 500 });
  }
}
