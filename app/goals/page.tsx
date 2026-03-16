import { Suspense } from 'react'
import { headers } from 'next/headers'
import Sidebar from '@/components/Sidebar'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'
import GoalsClientWrapper from './goals-client-wrapper'
import GoalsListServer from './goals-list-server'
import { prisma } from '@/lib/prisma'

// Enable edge runtime for faster cold starts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Add revalidation for edge caching
export const revalidate = 30 // Revalidate every 30 seconds

async function getWorkspaceId() {
  // Get workspace ID from session/auth - simplified for now
  // In production, this would come from your auth system
  const headersList = headers()
  const userId = headersList.get('x-user-id') || 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'
  
  // Find user's default workspace
  const workspace = await prisma.workspace.findFirst({
    where: {
      members: {
        some: { userId }
      }
    },
    select: { id: true }
  })
  
  return workspace?.id || ''
}

export default async function GoalsPage() {
  const workspaceId = await getWorkspaceId()

  if (!workspaceId) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">No Workspace Found</h2>
          <p className="text-[#A3A3A3]">Please create or select a workspace to continue.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Sidebar - loaded immediately */}
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={false}
        onCollapsedChange={() => {}}
      />

      <div className="ml-64">
        <ResponsivePageContainer>
          <GoalsClientWrapper workspaceId={workspaceId}>
            {/* Suspense boundary - show loading state while fetching goals */}
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
