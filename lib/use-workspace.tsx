'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Client-side workspace context for React components
 * SECURITY: Fetches workspace from authenticated API
 */

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
  const [state, setState] = useState<WorkspaceContextValue>({
    workspaceId: null,
    workspaceName: null,
    role: null,
    loading: true,
    error: null,
    refetch: async () => {},
  })

  const fetchWorkspace = async () => {
    // Don't fetch on public routes
    const publicRoutes = ['/login', '/signup', '/auth/callback', '/auth/confirm']
    const isPublicRoute = pathname === '/' || publicRoutes.some(route => pathname?.startsWith(route))
    
    console.log('[WorkspaceProvider] fetchWorkspace called', { pathname, isPublicRoute })
    
    if (isPublicRoute) {
      console.log('[WorkspaceProvider] Skipping fetch for public route')
      setState(prev => ({
        ...prev,
        loading: false,
      }))
      return
    }

    try {
      console.log('[WorkspaceProvider] Fetching workspace from /api/workspaces/current')
      const res = await fetch('/api/workspaces/current', {
        credentials: 'include', // Ensure cookies are sent
        cache: 'no-store', // Don't cache workspace requests
      })
      
      console.log('[WorkspaceProvider] API response:', res.status)
      
      if (res.status === 401) {
        // Unauthorized - likely no session
        console.error('[WorkspaceProvider] 401 Unauthorized - no valid session')
        setState(prev => ({
          ...prev,
          workspaceId: null,
          workspaceName: null,
          role: null,
          loading: false,
          error: new Error('Unauthorized: No valid session'),
        }))
        return
      }
      
      if (res.status === 404) {
        // No workspace found for user
        console.error('[WorkspaceProvider] 404 - no workspace found for user')
        setState(prev => ({
          ...prev,
          workspaceId: null,
          workspaceName: null,
          role: null,
          loading: false,
          error: new Error('No workspace found'),
        }))
        return
      }
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('[WorkspaceProvider] API error:', res.status, errorText)
        throw new Error(`Failed to fetch workspace: ${res.status}`)
      }
      
      const data = await res.json()
      console.log('[WorkspaceProvider] Workspace loaded:', data.workspace)
      
      setState(prev => ({
        ...prev,
        workspaceId: data.workspace?.id || null,
        workspaceName: data.workspace?.name || null,
        role: data.workspace?.role || null,
        loading: false,
        error: null,
      }))
    } catch (error) {
      console.error('[WorkspaceProvider] Failed to load workspace:', error)
      setState(prev => ({
        ...prev,
        workspaceId: null,
        workspaceName: null,
        role: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }))
    }
  }

  useEffect(() => {
    fetchWorkspace()
  }, [pathname])

  // Add refetch method to state
  useEffect(() => {
    setState(prev => ({
      ...prev,
      refetch: fetchWorkspace,
    }))
  }, [])

  return (
    <WorkspaceContext.Provider value={state}>
      {children}
    </WorkspaceContext.Provider>
  )
}

/**
 * Hook to access workspace context in client components
 * 
 * @returns Current workspace info
 * @example
 * const { workspaceId, loading } = useWorkspace()
 * if (loading) return <LoadingSpinner />
 * if (!workspaceId) return <NoWorkspace />
 */
export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  
  if (context === undefined) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  
  return context
}
