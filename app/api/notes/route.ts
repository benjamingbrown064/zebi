import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireWorkspace } from '@/lib/workspace';
import { validateAIAuth } from '@/lib/doug-auth';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

// GET /api/notes - List notes with filters
export async function GET(request: NextRequest) {
  try {
    const auth = validateAIAuth(request);
    let workspaceId: string;

    if (auth.valid) {
      const wid = new URL(request.url).searchParams.get('workspaceId');
      if (!wid) return NextResponse.json({ success: false, error: 'workspaceId is required' }, { status: 400 });
      workspaceId = wid;
    } else {
      workspaceId = await requireWorkspace();
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const projectId = searchParams.get('projectId');
    const objectiveId = searchParams.get('objectiveId');
    const taskId = searchParams.get('taskId');
    const noteType = searchParams.get('noteType');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = { workspaceId };
    if (companyId) where.companyId = companyId;
    if (projectId) where.projectId = projectId;
    if (objectiveId) where.objectiveId = objectiveId;
    if (taskId) where.taskId = taskId;
    if (noteType) where.noteType = noteType;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        select: {
          id: true,
          title: true,
          body: true,
          summary: true,
          noteType: true,
          author: true,
          authorAgent: true,
          authorType: true,
          companyId: true,
          projectId: true,
          objectiveId: true,
          taskId: true,
          workspaceId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.note.count({ where }),
    ]);

    return NextResponse.json({ success: true, notes, total, limit, offset });

  } catch (error) {
    console.error('GET /api/notes error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// POST /api/notes - Create new note
export async function POST(request: NextRequest) {
  try {
    const auth = validateAIAuth(request);
    let workspaceId: string;

    const body = await request.json();
    const { title, body: noteBody, summary, noteType, author, authorAgent, authorType, companyId, projectId, objectiveId, taskId } = body;

    if (auth.valid) {
      if (!body.workspaceId) return NextResponse.json({ success: false, error: 'workspaceId is required' }, { status: 400 });
      workspaceId = body.workspaceId;
    } else {
      workspaceId = await requireWorkspace();
    }

    if (!title) {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 });
    }

    // Resolve author identity from relay header if not provided in body
    const resolvedAuthorAgent = authorAgent || request.headers.get('x-actor-agent') || null
    const resolvedAuthorType  = authorType  || (resolvedAuthorAgent ? 'agent' : 'user')

    const noteData = {
      workspaceId,
      title,
      body: noteBody || '',
      summary: summary || null,
      noteType: noteType || 'general',
      author: author || null,
      authorAgent: resolvedAuthorAgent,
      authorType: resolvedAuthorType,
      companyId: companyId || null,
      projectId: projectId || null,
      objectiveId: objectiveId || null,
      taskId: taskId || null,
      createdBy: DEFAULT_USER_ID,
    };

    const note = await prisma.note.create({
      data: noteData,
      select: {
        id: true,
        title: true,
        body: true,
        summary: true,
        noteType: true,
        author: true,
        authorAgent: true,
        authorType: true,
        companyId: true,
        projectId: true,
        objectiveId: true,
        taskId: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, note }, { status: 201 });

  } catch (error) {
    console.error('POST /api/notes error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create note' }, { status: 500 });
  }
}
