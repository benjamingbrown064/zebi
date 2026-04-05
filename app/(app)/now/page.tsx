export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getWorkspaceFromAuth } from '@/lib/workspace'
import NowClient from './client'

export default async function NowPage() {
  let workspace
  try {
    workspace = await getWorkspaceFromAuth()
  } catch {
    redirect('/login')
  }
  if (!workspace) redirect('/login')

  return <NowClient />
}
