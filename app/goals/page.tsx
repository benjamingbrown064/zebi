import { Suspense } from 'react'
import Sidebar from '@/components/Sidebar'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'
import GoalsClientWrapper from './goals-client-wrapper'
import GoalsListServer from './goals-list-server'
import { requireWorkspace } from '@/lib/workspace'
import { redirect } from 'next/navigation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function GoalsPage() {
  let workspaceId: string

  try {
    workspaceId = await requireWorkspace()
  } catch {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={false}
        onCollapsedChange={() => {}}
      />

      <div className="ml-64">
        <ResponsivePageContainer>
          <GoalsClientWrapper workspaceId={workspaceId}>
            <Suspense fallback={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-[14px] border border-[#E5E5E5] p-6 animate-pulse"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
                        <div className="h-4 w-1/2 bg-gray-200 rounded" />
                      </div>
                      <div className="h-6 w-12 bg-gray-200 rounded" />
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded mb-4" />
                    <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E5]">
                      <div className="h-3 w-24 bg-gray-200 rounded" />
                      <div className="flex gap-2">
                        <div className="h-8 w-8 bg-gray-200 rounded" />
                        <div className="h-8 w-8 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }>
              <GoalsListServer workspaceId={workspaceId} />
            </Suspense>
          </GoalsClientWrapper>
        </ResponsivePageContainer>
      </div>
    </div>
  )
}
