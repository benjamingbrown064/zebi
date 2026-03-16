import { NextRequest, NextResponse } from 'next/server'
import { requireDougAuth } from '@/lib/doug-auth'
import { getDougWorkspaceId } from '@/lib/doug-workspace'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/doug/setup-user
 * 
 * Create Doug user account and add to workspace
 * (One-time setup, idempotent)
 */
export async function POST(request: NextRequest) {
  const authError = requireDougAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    // Resolve workspace from Doug API context
    const workspaceId = await getDougWorkspaceId()

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if Doug user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const dougUser = existingUser?.users?.find(u => u.email === 'doug@zebi.app')

    let userId: string

    if (dougUser) {
      userId = dougUser.id
      console.log('[Doug Setup] Doug user already exists:', userId)
    } else {
      // Create Doug user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'doug@zebi.app',
        password: crypto.randomUUID(), // Random password (Doug uses API token, not password login)
        email_confirm: true,
        user_metadata: {
          name: 'Doug',
          role: 'ai_assistant',
          avatar: '🤖'
        }
      })

      if (createError || !newUser.user) {
        console.error('[Doug Setup] Failed to create user:', createError)
        return NextResponse.json(
          { error: 'Failed to create Doug user account' },
          { status: 500 }
        )
      }

      userId = newUser.user.id
      console.log('[Doug Setup] Created Doug user:', userId)
    }

    // Check if Doug is already a workspace member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: userId
        }
      }
    })

    if (!existingMember) {
      // Add Doug to workspace
      await prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: userId,
          role: 'member'
        }
      })
      console.log('[Doug Setup] Added Doug to workspace')
    } else {
      console.log('[Doug Setup] Doug already in workspace')
    }

    return NextResponse.json({
      success: true,
      dougUserId: userId,
      email: 'doug@zebi.app',
      workspace: workspaceId,
      message: 'Doug user ready - you can now assign tasks to doug@zebi.app'
    })
  } catch (error) {
    console.error('[Doug Setup] Failed:', error)
    return NextResponse.json(
      { error: 'Failed to setup Doug user' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/doug/setup-user
 * 
 * Check if Doug user exists
 */
export async function GET(request: NextRequest) {
  const authError = requireDougAuth(request)
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  try {
    // Resolve workspace from Doug API context
    const workspaceId = await getDougWorkspaceId()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data } = await supabaseAdmin.auth.admin.listUsers()
    const dougUser = data?.users?.find(u => u.email === 'doug@zebi.app')

    if (!dougUser) {
      return NextResponse.json({
        exists: false,
        message: 'Doug user not found - run POST to create'
      })
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: dougUser.id
        }
      }
    })

    return NextResponse.json({
      exists: true,
      dougUserId: dougUser.id,
      email: dougUser.email,
      inWorkspace: !!member,
      workspace: workspaceId
    })
  } catch (error) {
    console.error('[Doug Setup] Check failed:', error)
    return NextResponse.json(
      { error: 'Failed to check Doug user' },
      { status: 500 }
    )
  }
}
