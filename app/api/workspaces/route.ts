import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workspaces
 * Create a new workspace with default statuses
 */
export async function POST(req: NextRequest) {
  try {
    const { name, userId } = await req.json();

    if (!name || !userId) {
      return NextResponse.json(
        { error: 'name and userId are required' },
        { status: 400 }
      );
    }

    // Create workspace with default statuses in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create workspace
      const workspace = await tx.workspace.create({
        data: {
          name,
          ownerId: userId,
          plan: 'free'
        }
      });

      // Add user as workspace owner
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: userId,
          role: 'owner'
        }
      });

      // Create default statuses
      const defaultStatuses = [
        { type: 'inbox', name: 'Inbox', sortOrder: 0 },
        { type: 'active', name: 'Active', sortOrder: 1 },
        { type: 'blocked', name: 'Blocked', sortOrder: 2 },
        { type: 'review', name: 'Review', sortOrder: 3 },
        { type: 'done', name: 'Done', sortOrder: 4 },
        { type: 'archived', name: 'Archived', sortOrder: 5 }
      ];

      await Promise.all(
        defaultStatuses.map(status =>
          tx.status.create({
            data: {
              workspaceId: workspace.id,
              type: status.type,
              name: status.name,
              sortOrder: status.sortOrder,
              isSystem: true
            }
          })
        )
      );

      return workspace;
    });

    return NextResponse.json({
      success: true,
      workspace: {
        id: result.id,
        name: result.name
      }
    });
  } catch (error) {
    console.error('Failed to create workspace:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
}
