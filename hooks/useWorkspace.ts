import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ensureWorkspace } from '@/app/actions/workspace'

/**
 * Hook to get current user's workspace ID.
 * Automatically creates a workspace if one doesn't exist.
 */
export function useWorkspace() {
  const router = useRouter()
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function getWorkspace() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        setUserId(user.id)

        // Ensure workspace exists in database
        const wsId = await ensureWorkspace(user.id)
        if (!wsId) {
          setError('Failed to load workspace')
          setLoading(false)
          return
        }

        setWorkspaceId(wsId)
        setLoading(false)
      } catch (err) {
        console.error('getWorkspace error:', err)
        setError('Failed to load workspace')
        setLoading(false)
      }
    }

    getWorkspace()
  }, [router])

  return { workspaceId, userId, loading, error }
}
