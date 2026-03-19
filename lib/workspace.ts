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

// In-process workspace cache: avoids repeated DB lookups per userId
// Entries expire after 5 minutes. Cleared on logout.
const workspaceCache = new Map<string, { workspace: UserWorkspace; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCachedWorkspace(userId: string): UserWorkspace | null {
  const entry = workspaceCache.get(userId)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    workspaceCache.delete(userId)
    return null
  }
  return entry.workspace
}

function setCachedWorkspace(userId: string, workspace: UserWorkspace) {
  workspaceCache.set(userId, { workspace, expiresAt: Date.now() + CACHE_TTL_MS })
}

/**
 * Create Supabase SSR client that reads from request cookies
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
 * Get user's workspace from database (server-side only).
 *
 * PERF: Uses getSession() (local JWT decode) instead of getUser() (network round-trip)
 * since middleware already validated the session. Falls back to getUser() if session
 * is absent (e.g. during initial SSR before cookie hydration).
 */
export async function getWorkspaceFromAuth(): Promise<UserWorkspace | null> {
  const supabase = createSupabaseServerClient()

  // getSession() decodes the JWT locally — no network call to Supabase
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !session?.user) {
    // Fall back to getUser() for edge cases (e.g. fresh login, expired local token)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized: No valid session')
    }
    return getWorkspaceCached(user.id)
  }

  return getWorkspaceCached(session.user.id)
}

async function getWorkspaceCached(userId: string): Promise<UserWorkspace | null> {
  // Check in-process cache first
  const cached = getCachedWorkspace(userId)
  if (cached) return cached

  const workspace = await getUserWorkspace(userId)
  if (workspace) setCachedWorkspace(userId, workspace)
  return workspace
}

/**
 * Get workspace for a specific user ID
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
      createdAt: 'asc',
    },
  })

  if (!membership) return null

  return {
    id: membership.workspace.id,
    name: membership.workspace.name,
    role: membership.role as 'owner' | 'admin' | 'member' | 'guest',
  }
}

/**
 * Get all workspaces a user is a member of
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

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  return getWorkspaceCached(session.user.id)
}
