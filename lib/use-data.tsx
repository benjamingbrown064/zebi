'use client'

import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useWorkspace } from './use-workspace'

// ── Query client singleton ────────────────────────────────────────────────────
let queryClientSingleton: QueryClient | undefined

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale-while-revalidate: show cached data immediately, refresh in bg
        staleTime: 60 * 1000,       // Data is "fresh" for 60s
        gcTime: 5 * 60 * 1000,      // Keep in memory for 5 min after last use
        refetchOnWindowFocus: false, // Don't refetch every time user switches tabs
        refetchOnMount: true,        // Do refetch if data is stale on mount
        retry: 1,                    // One retry on failure
      },
    },
  })
}

function getQueryClient() {
  if (typeof window === 'undefined') {
    // SSR: always make a new client
    return makeQueryClient()
  }
  if (!queryClientSingleton) queryClientSingleton = makeQueryClient()
  return queryClientSingleton
}

export { QueryClientProvider, getQueryClient }

// ── Shared fetcher ────────────────────────────────────────────────────────────
async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error(`API error ${res.status}: ${url}`)
  return res.json()
}

// ── Typed hooks ───────────────────────────────────────────────────────────────

export function useTasks(options?: { projectId?: string; statusId?: string; includeCompleted?: boolean }) {
  const { workspaceId } = useWorkspace()
  const params = new URLSearchParams()
  if (workspaceId) params.set('workspaceId', workspaceId)
  if (options?.projectId) params.set('projectId', options.projectId)
  if (options?.statusId) params.set('statusId', options.statusId)
  if (options?.includeCompleted) params.set('includeCompleted', 'true')

  return useQuery({
    queryKey: ['tasks', workspaceId, options],
    queryFn: () => apiFetch<{ tasks: any[] }>(`/api/tasks/direct?${params}`),
    enabled: !!workspaceId,
    select: (data) => data.tasks ?? [],
  })
}

export function useProjects() {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => apiFetch<any[]>(`/api/projects?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000, // projects change less often — 2min
  })
}

export function useCompanies() {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: ['companies', workspaceId],
    queryFn: () => apiFetch<any[]>(`/api/companies?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // companies rarely change — 5min
  })
}

export function useGoals() {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: ['goals', workspaceId],
    queryFn: () => apiFetch<any[]>(`/api/goals?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useObjectives() {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: ['objectives', workspaceId],
    queryFn: () => apiFetch<any[]>(`/api/objectives?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useStatuses() {
  const { workspaceId } = useWorkspace()
  return useQuery({
    queryKey: ['statuses', workspaceId],
    queryFn: () => apiFetch<any[]>(`/api/statuses?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000, // statuses almost never change — 10min
  })
}

// ── Mutation helpers (auto-invalidate cache on write) ─────────────────────────

export function useCreateTask() {
  const qc = useQueryClient()
  const { workspaceId } = useWorkspace()
  return useMutation({
    mutationFn: (data: any) => fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, workspaceId }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', workspaceId] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  const { workspaceId } = useWorkspace()
  return useMutation({
    mutationFn: ({ id, ...data }: any) => fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', workspaceId] })
    },
  })
}
