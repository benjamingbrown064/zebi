import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

// GET /api/documents/[id]/versions - Get all versions for a document
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get document
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      select: { workspaceId: true }
    });

    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Get all versions
    const versions = await prisma.documentVersion.findMany({
      where: { documentId: params.id },
      orderBy: { version: 'desc' }
    });

    return NextResponse.json({ success: true, versions });

  } catch (error) {
    console.error('GET /api/documents/[id]/versions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

// POST /api/documents/[id]/versions - Create a new version
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { contentRich } = body;

    // Get document
    const document = await prisma.document.findUnique({
      where: { id: params.id }
    });

    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Update document version and content
    const newVersion = document.version + 1;
    const updatedDocument = await prisma.document.update({
      where: { id: params.id },
      data: {
        version: newVersion,
        contentRich: contentRich || document.contentRich
      }
    });

    // Create version record
    const version = await prisma.documentVersion.create({
      data: {
        documentId: params.id,
        version: newVersion,
        contentRich: contentRich || document.contentRich,
        createdBy: DEFAULT_USER_ID
      }
    });

    return NextResponse.json({ success: true, version }, { status: 201 });

  } catch (error) {
    console.error('POST /api/documents/[id]/versions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create version' },
      { status: 500 }
    );
  }
}
