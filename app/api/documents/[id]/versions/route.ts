import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAIAuth } from '@/lib/doug-auth';

const DEFAULT_USER_ID = 'system';

// GET /api/documents/[id]/versions — full version history with authorship + change log
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      select: { workspaceId: true, version: true },
    });
    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    const versions = await prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        createdAt: true,
        createdBy: true,
        authorName: true,
        authorAgent: true,
        authorType: true,
        changeDescription: true,
        changeTags: true,
        changeNotes: true,
        snapshotTitle: true,
        snapshotTags: true,
        // content omitted from list — fetched on demand
      },
    });

    return NextResponse.json({ success: true, versions, currentVersion: document.version });
  } catch (error) {
    console.error('GET /api/documents/[id]/versions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch versions' }, { status: 500 });
  }
}

// GET /api/documents/[id]/versions/[versionId]/content — fetch content of a specific version
// (handled via query param: ?versionId=...)
// POST /api/documents/[id]/versions — manually snapshot current state
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Determine author
    const auth = validateAIAuth(request);
    const authorAgent = auth.valid ? auth.assistant : null;
    const authorName  = body.authorName || (auth.valid ? (auth.assistant?.charAt(0).toUpperCase() + auth.assistant!.slice(1)) : 'Unknown');
    const authorType  = auth.valid ? 'agent' : (body.authorType || 'user');

    const newVersion = document.version + 1;

    const [updatedDoc, version] = await Promise.all([
      prisma.document.update({
        where: { id },
        data: { version: newVersion },
      }),
      prisma.documentVersion.create({
        data: {
          documentId: id,
          version: newVersion,
          contentRich: body.contentRich || document.contentRich,
          createdBy: authorAgent || body.createdBy || DEFAULT_USER_ID,
          authorName,
          authorAgent,
          authorType,
          changeDescription: body.changeDescription || null,
          changeTags: body.changeTags || [],
          changeNotes: body.changeNotes || null,
          snapshotTitle: document.title,
          snapshotTags: {
            functionTags: (document as any).functionTags || [],
            typeTags: (document as any).typeTags || [],
            stageTags: (document as any).stageTags || [],
          },
        },
      }),
    ]);

    return NextResponse.json({ success: true, version, currentVersion: newVersion }, { status: 201 });
  } catch (error) {
    console.error('POST /api/documents/[id]/versions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create version' }, { status: 500 });
  }
}
