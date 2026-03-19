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

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hasFetched = useRef(false)
  const [state, setState] = useState<WorkspaceContextValue>({
    workspaceId: null,
    workspaceName: null,
    role: null,
    loading: true,
    error: null,
    refetch: async () => {},
  })

  const fetchWorkspace = useCallback(async () => {
    const publicRoutes = ['/login', '/signup', '/auth/callback', '/auth/confirm']
    const isPublicRoute = pathname === '/' || publicRoutes.some(route => pathname?.startsWith(route))

    if (isPublicRoute) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    try {
      const res = await fetch('/api/workspaces/current', {
        credentials: 'include',
      })

      if (res.status === 401) {
        setState(prev => ({
          ...prev, workspaceId: null, workspaceName: null, role: null,
          loading: false, error: new Error('Unauthorized'),
        }))
        return
      }

      if (!res.ok) throw new Error(`Failed: ${res.status}`)

      const data = await res.json()
      setState(prev => ({
        ...prev,
        workspaceId: data.workspace?.id || null,
        workspaceName: data.workspace?.name || null,
        role: data.workspace?.role || null,
        loading: false, error: null,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev, workspaceId: null, workspaceName: null, role: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }))
    }
  }, [pathname])

  // Fetch ONCE on mount, not on every pathname change
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true
      fetchWorkspace()
    }
  }, [])

  // Only re-fetch if we navigate to/from a public route (login/signup)
  useEffect(() => {
    const publicRoutes = ['/login', '/signup', '/auth/callback', '/auth/confirm']
    const isPublicRoute = pathname === '/' || publicRoutes.some(route => pathname?.startsWith(route))

    if (isPublicRoute && state.workspaceId) {
      // Went to login page — clear workspace
      setState(prev => ({ ...prev, workspaceId: null, loading: false }))
      hasFetched.current = false
    } else if (!isPublicRoute && !state.workspaceId && !state.loading && hasFetched.current) {
      // Came back from login — re-fetch
      hasFetched.current = false
      fetchWorkspace()
    }
  }, [pathname])

  // Expose refetch
  useEffect(() => {
    setState(prev => ({ ...prev, refetch: fetchWorkspace }))
  }, [fetchWorkspace])

  return (
    <WorkspaceContext.Provider value={state}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return context
}
