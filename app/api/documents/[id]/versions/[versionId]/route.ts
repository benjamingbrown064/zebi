import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/documents/[id]/versions/[versionId] — fetch full content of a specific version
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params;

    const version = await prisma.documentVersion.findFirst({
      where: { id: versionId, documentId: id },
    });

    if (!version) {
      return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, version });
  } catch (error) {
    console.error('GET /api/documents/[id]/versions/[versionId] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch version' }, { status: 500 });
  }
}
