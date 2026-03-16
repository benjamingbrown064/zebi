'use client'

import { useWorkspace } from '@/lib/use-workspace'
import { useEffect, useState } from 'react'
import AIChatButton from './AIChatButton'
import { createClient } from '@/lib/supabase-client'

/**
 * Dynamic AI Chat Button that loads workspace/user from authenticated session
 * SECURITY: No hardcoded IDs - fetches from context
 */
export default function DynamicAIChatButton() {
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
      setLoading(false)
    }

    if (!workspaceLoading) {
      loadUser()
    }
  }, [workspaceLoading])

  // Don't render until we have both workspace and user
  if (loading || workspaceLoading || !workspaceId || !userId) {
    return null
  }

  return <AIChatButton workspaceId={workspaceId} userId={userId} />
}
