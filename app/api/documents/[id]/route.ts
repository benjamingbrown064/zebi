import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        company: {
          select: { id: true, name: true }
        },
        project: {
          select: { id: true, name: true }
        },
        versions: {
          select: {
            id: true,
            version: true,
            createdAt: true,
            createdBy: true
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
    return NextResponse.json(
      { success: false, error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

// PUT /api/documents/[id] - Update document
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, documentType, contentRich, createVersion } = body;

    // Get existing document
    const existingDoc = await prisma.document.findUnique({
      where: { id: params.id }
    });

    if (!existingDoc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Check if content changed
    const contentChanged = contentRich && 
      JSON.stringify(contentRich) !== JSON.stringify(existingDoc.contentRich);

    // Update document
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (documentType !== undefined) updateData.documentType = documentType;
    if (contentRich !== undefined) updateData.contentRich = contentRich;

    // Increment version if content changed and createVersion is true
    if (contentChanged && createVersion) {
      updateData.version = existingDoc.version + 1;
    }

    const document = await prisma.document.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: {
          select: { id: true, name: true }
        },
        project: {
          select: { id: true, name: true }
        }
      }
    });

    // Create version if requested and content changed
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
    return NextResponse.json(
      { success: false, error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get document
    const document = await prisma.document.findUnique({
      where: { id: params.id }
    });

    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Delete document (cascade will delete versions)
    await prisma.document.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('DELETE /api/documents/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
