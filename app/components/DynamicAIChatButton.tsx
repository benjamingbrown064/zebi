'use client'

import { useWorkspace } from '@/lib/use-workspace'
import AIChatButton from './AIChatButton'

const FALLBACK_USER_ID = '00000000-0000-0000-0000-000000000000'

export default function DynamicAIChatButton() {
  const { workspaceId, loading } = useWorkspace()

  if (loading || !workspaceId) return null

  return <AIChatButton workspaceId={workspaceId} userId={FALLBACK_USER_ID} />
}
