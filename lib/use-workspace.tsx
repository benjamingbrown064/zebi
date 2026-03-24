'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'

export interface WorkspaceContextValue {
  workspaceId: string | null
  workspaceName: string | null
  role: string | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaceId: null,
  workspaceName: null,
  role: null,
  loading: true,
  error: null,
  refetch: async () => {},
})

const LS_KEY = 'zebi_workspace'
const LS_TTL = 10 * 60 * 1000 // 10 minutes

function readLocalCache(): { workspaceId: string; workspaceName: string; role: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const { data, expiresAt } = JSON.parse(raw)
    if (Date.now() > expiresAt) { localStorage.removeItem(LS_KEY); return null }
    return data
  } catch { return null }
}

function writeLocalCache(data: { workspaceId: string; workspaceName: string; role: string }) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, expiresAt: Date.now() + LS_TTL }))
  } catch {}
}

function clearLocalCache() {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(LS_KEY) } catch {}
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hasFetched = useRef(false)

  // Boot with loading state — hydration-safe (no localStorage on server)
  // Cache is applied after mount via useEffect to avoid server/client mismatch
  const [state, setState] = useState<WorkspaceContextValue>({
    workspaceId: null,
    workspaceName: null,
    role: null,
    loading: true,
    error: null,
    refetch: async () => {},
  })

  const fetchWorkspace = useCallback(async (force = false) => {
    const publicRoutes = ['/login', '/signup', '/auth/callback', '/auth/confirm']
    const isPublicRoute = pathname === '/' || publicRoutes.some(route => pathname?.startsWith(route))
    if (isPublicRoute) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    // Serve from localStorage cache unless forced
    if (!force) {
      const hit = readLocalCache()
      if (hit) {
        setState(prev => ({
          ...prev,
          workspaceId: hit.workspaceId,
          workspaceName: hit.workspaceName,
          role: hit.role,
          loading: false,
          error: null,
        }))
        return
      }
    }

    try {
      setState(prev => ({ ...prev, loading: true }))
      const res = await fetch('/api/workspaces/current', { credentials: 'include' })

      if (res.status === 401) {
        clearLocalCache()
        setState(prev => ({ ...prev, workspaceId: null, workspaceName: null, role: null, loading: false, error: new Error('Unauthorized') }))
        return
      }
      if (!res.ok) throw new Error(`Failed: ${res.status}`)

      const data = await res.json()
      const ws = {
        workspaceId: data.workspace?.id ?? null,
        workspaceName: data.workspace?.name ?? null,
        role: data.workspace?.role ?? null,
      }
      if (ws.workspaceId) writeLocalCache(ws as any)
      setState(prev => ({ ...prev, ...ws, loading: false, error: null }))
    } catch (error) {
      setState(prev => ({ ...prev, workspaceId: null, loading: false, error: error instanceof Error ? error : new Error('Unknown error') }))
    }
  }, [pathname])

  // Fetch once on mount — apply localStorage cache immediately if available
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true
      const cached = readLocalCache()
      if (cached) {
        setState(prev => ({
          ...prev,
          workspaceId: cached.workspaceId,
          workspaceName: cached.workspaceName,
          role: cached.role,
          loading: false,
        }))
      } else {
        fetchWorkspace()
      }
    }
  }, [])

  // Handle login/logout navigation
  useEffect(() => {
    const publicRoutes = ['/login', '/signup', '/auth/callback', '/auth/confirm']
    const isPublicRoute = pathname === '/' || publicRoutes.some(route => pathname?.startsWith(route))
    if (isPublicRoute && state.workspaceId) {
      clearLocalCache()
      setState(prev => ({ ...prev, workspaceId: null, loading: false }))
      hasFetched.current = false
    } else if (!isPublicRoute && !state.workspaceId && !state.loading && hasFetched.current) {
      hasFetched.current = false
      fetchWorkspace(true)
    }
  }, [pathname])

  useEffect(() => {
    setState(prev => ({ ...prev, refetch: () => fetchWorkspace(true) }))
  }, [fetchWorkspace])

  return (
    <WorkspaceContext.Provider value={state}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return context
}
