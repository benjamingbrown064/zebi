import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/**
 * Server-side workspace helpers for proper data isolation
 * SECURITY: Never use DEFAULT_WORKSPACE_ID - always fetch from database
 */

export interface UserWorkspace {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member' | 'guest'
}

/**
 * Create Supabase SSR client that reads from request cookies
 * This is required for API routes to see the authenticated session
 */
function createSupabaseServerClient() {
  const cookieStore = cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Cookie setting can fail in middleware
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Cookie removal can fail in middleware
          }
        },
      },
    }
  )
}

/**
 * Get user's workspace from database (server-side only)
 * Used in API routes and server components
 * 
 * @returns User's workspace or null if not found
 * @throws Error if not authenticated
 */
export async function getWorkspaceFromAuth(): Promise<UserWorkspace | null> {
  const supabase = createSupabaseServerClient()
  
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error('Auth error in getWorkspaceFromAuth:', authError)
    throw new Error('Unauthorized: No valid session')
  }

  if (!user) {
    console.warn('No user found in session')
    throw new Error('Unauthorized: No valid session')
  }

  const workspace = await getUserWorkspace(user.id)
  
  if (!workspace) {
    console.warn(`No workspace found for user ${user.id}`)
  }
  
  return workspace
}

/**
 * Get workspace for a specific user ID
 * 
 * @param userId - Supabase user ID
 * @returns User's workspace or null if not found
 */
export async function getUserWorkspace(userId: string): Promise<UserWorkspace | null> {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc', // Get the first/primary workspace
    },
  })

  if (!membership) {
    return null
  }

  return {
    id: membership.workspace.id,
    name: membership.workspace.name,
    role: membership.role as 'owner' | 'admin' | 'member' | 'guest',
  }
}

/**
 * Get all workspaces a user is a member of
 * 
 * @param userId - Supabase user ID
 * @returns Array of workspaces
 */
export async function getUserWorkspaces(userId: string): Promise<UserWorkspace[]> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  return memberships.map(m => ({
    id: m.workspace.id,
    name: m.workspace.name,
    role: m.role as 'owner' | 'admin' | 'member' | 'guest',
  }))
}

/**
 * Verify user has access to a workspace
 * 
 * @param userId - Supabase user ID
 * @param workspaceId - Workspace ID to check
 * @returns true if user has access, false otherwise
 */
export async function hasWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  })

  return membership !== null
}

/**
 * Get workspace ID from auth session (throws if not found)
 * Use this when workspace is required
 * 
 * @returns Workspace ID
 * @throws Error if no workspace found or not authenticated
 */
export async function requireWorkspace(): Promise<string> {
  const workspace = await getWorkspaceFromAuth()
  
  if (!workspace) {
    throw new Error('No workspace found for user')
  }
  
  return workspace.id
}

/**
 * Middleware helper: Get workspace from request cookies
 * Used in middleware.ts for workspace isolation
 */
export async function getWorkspaceFromRequest(
  request: Request
): Promise<UserWorkspace | null> {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  return getUserWorkspace(user.id)
}
