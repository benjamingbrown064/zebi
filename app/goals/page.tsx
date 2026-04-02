import { getWorkspaceFromAuth } from '@/lib/workspace'
import { redirect } from 'next/navigation'
import GoalsClientWrapper from './goals-client-wrapper'
import GoalsListServer from './goals-list-server'
import { Suspense } from 'react'

export const runtime = 'nodejs'
export const revalidate = 60

export default async function GoalsPage() {
  let workspaceId: string

  try {
    const workspace = await getWorkspaceFromAuth()
    if (!workspace) redirect('/login')
    workspaceId = workspace.id
  } catch {
    redirect('/login')
  }

  return (
    <GoalsClientWrapper workspaceId={workspaceId}>
      <Suspense fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded p-6 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="h-5 w-3/4 bg-[#e8e4e4] rounded mb-2" />
                  <div className="h-4 w-1/2 bg-[#e8e4e4] rounded" />
                </div>
                <div className="h-6 w-12 bg-[#e8e4e4] rounded" />
              </div>
              <div className="h-2 w-full bg-[#e8e4e4] rounded mb-4" />
              <div className="flex items-center justify-between pt-4">
                <div className="h-3 w-24 bg-[#e8e4e4] rounded" />
                <div className="flex gap-2">
                  <div className="h-8 w-8 bg-[#e8e4e4] rounded" />
                  <div className="h-8 w-8 bg-[#e8e4e4] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      }>
        <GoalsListServer workspaceId={workspaceId} />
      </Suspense>
    </GoalsClientWrapper>
  )
}
