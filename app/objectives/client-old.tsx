'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ObjectiveCard from '@/components/ObjectiveCard'
import ObjectiveForm from '@/components/ObjectiveForm'
import { FaPlus, FaSpinner } from 'react-icons/fa'

interface Objective {
  id: string
  title: string
  description?: string | null
  companyId?: string | null
  spaceName?: string | null
  goalId?: string | null
  goalName?: string | null
  objectiveType: string
  metricType: string
  currentValue: number
  targetValue: number
  unit?: string | null
  startDate: string
  deadline: string
  status: string
  progressPercent: number
  priority: number
  activeBlockers: number
  nextMilestone?: {
    title: string
    targetValue: number
    targetDate: string
    daysUntil: number
  }
  aiWork?: string
  humanWork?: string
  taskCount: number
  projectCount: number
}

interface Space {
  id: string
  name: string
}

interface Goal {
  id: string
  name: string
}

interface ObjectivesClientProps {
  initialObjectives: Objective[]
  spaces: Space[]
  goals: Goal[]
  workspaceId: string
}

const PAGE_SIZE = 25

export default function ObjectivesClient({
  initialObjectives,
  spaces,
  goals,
  workspaceId,
}: ObjectivesClientProps) {
  const router = useRouter()
  const [objectives, setObjectives] = useState<Objective[]>(initialObjectives)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialObjectives.length === PAGE_SIZE)
  const [page, setPage] = useState(0)

  const observerTarget = useRef<HTMLDivElement>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [spaceFilter, setSpaceFilter] = useState<string>('all')

  // Load more objectives
  const loadMoreObjectives = useCallback(async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const response = await fetch(
        `/api/objectives?workspaceId=${workspaceId}&limit=${PAGE_SIZE}&offset=${nextPage * PAGE_SIZE}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch objectives')
      }

      const data = await response.json()
      const fetchedObjectives = data.objectives || []

      if (fetchedObjectives.length === 0) {
        setHasMore(false)
        setLoadingMore(false)
        return
      }

      setObjectives(prev => [...prev, ...fetchedObjectives])
      setPage(nextPage)
      setHasMore(fetchedObjectives.length === PAGE_SIZE)
    } catch (err) {
      console.error('Failed to load more objectives:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [page, loadingMore, hasMore, workspaceId])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreObjectives()
        }
      },
      { threshold: 1.0 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loadingMore, loadMoreObjectives])

  // Apply filters
  const filteredObjectives = objectives.filter((obj) => {
    if (statusFilter !== 'all' && obj.status !== statusFilter) return false
    if (spaceFilter !== 'all' && obj.companyId !== spaceFilter) return false
    return true
  })

  // Apply sorting (deadline ascending)
  const sortedObjectives = [...filteredObjectives].sort((a, b) => {
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  })

  // Group by status
  const groupedObjectives = {
    on_track: sortedObjectives.filter((obj) => obj.status === 'on_track'),
    at_risk: sortedObjectives.filter((obj) => obj.status === 'at_risk'),
    blocked: sortedObjectives.filter((obj) => obj.status === 'blocked'),
    active: sortedObjectives.filter((obj) => obj.status === 'active'),
    completed: sortedObjectives.filter((obj) => obj.status === 'completed'),
  }

  const handleCreateObjective = async (objectiveData: any) => {
    try {
      const response = await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...objectiveData,
          workspaceId,
          createdBy: 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74',
          autoBreakdown: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create objective')
      }

      router.refresh()
    } catch (err) {
      console.error('Failed to create objective:', err)
      throw err
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div className="ml-64">
        {/* Header */}
        <header className="bg-white border-b border-[#E5E5E5]">
          <div className="max-w-[1280px] mx-auto px-12 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[30px] leading-[36px] font-medium text-[#1A1A1A]">
                  Objectives
                </h1>
                <p className="text-[13px] leading-[20px] text-[#A3A3A3] mt-1">
                  {sortedObjectives.length} {sortedObjectives.length === 1 ? 'objective' : 'objectives'}
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium text-[15px] transition-colors"
              >
                <FaPlus className="text-sm" /> New Objective
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-[1280px] mx-auto px-12 py-12">
          {/* Summary Stats */}
          <div className="grid grid-cols-5 gap-6 mb-12">
            <div className="bg-white rounded-[14px] border border-[#E5E5E5] p-5">
              <p className="text-[13px] leading-[20px] text-[#A3A3A3] mb-1">Total</p>
              <p className="text-[24px] leading-[32px] font-medium text-[#1A1A1A]">
                {objectives.length}
              </p>
            </div>
            <div className="bg-[#ECFDF5] rounded-[14px] border border-[#A7F3D0] p-5">
              <p className="text-[13px] leading-[20px] text-[#059669] mb-1">On Track</p>
              <p className="text-[24px] leading-[32px] font-medium text-[#047857]">
                {groupedObjectives.on_track.length}
              </p>
            </div>
            <div className="bg-[#FFFBEB] rounded-[14px] border border-[#FDE68A] p-5">
              <p className="text-[13px] leading-[20px] text-[#D97706] mb-1">At Risk</p>
              <p className="text-[24px] leading-[32px] font-medium text-[#B45309]">
                {groupedObjectives.at_risk.length}
              </p>
            </div>
            <div className="bg-[#FEF2F2] rounded-[14px] border border-[#FECACA] p-5">
              <p className="text-[13px] leading-[20px] text-[#DC2626] mb-1">Blocked</p>
              <p className="text-[24px] leading-[32px] font-medium text-[#B91C1C]">
                {groupedObjectives.blocked.length}
              </p>
            </div>
            <div className="bg-[#EFF6FF] rounded-[14px] border border-[#BFDBFE] p-5">
              <p className="text-[13px] leading-[20px] text-[#2563EB] mb-1">Completed</p>
              <p className="text-[24px] leading-[32px] font-medium text-[#1D4ED8]">
                {groupedObjectives.completed.length}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mb-8">
            <span className="text-[13px] text-[#A3A3A3]">Filter:</span>

            {/* Status Filter */}
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'on_track', label: 'On Track' },
                { value: 'at_risk', label: 'At Risk' },
                { value: 'blocked', label: 'Blocked' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-4 py-2 rounded-[10px] text-[13px] font-medium transition-colors ${
                    statusFilter === filter.value
                      ? 'bg-[#FEF2F2] text-[#DD3A44] border border-[#DD3A44]'
                      : 'bg-white text-[#525252] border border-[#E5E5E5] hover:bg-[#F5F5F5]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Space Filter */}
            {spaces.length > 0 && (
              <select
                value={spaceFilter}
                onChange={(e) => setSpaceFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-[#E5E5E5] rounded-[10px] text-[13px] text-[#525252] focus:outline-none focus:border-[#DD3A44] focus:ring-2 focus:ring-[#DD3A44] focus:ring-offset-2"
              >
                <option value="all">All Spaces</option>
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Objectives Grid */}
          {sortedObjectives.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[15px] text-[#A3A3A3] mb-6">No objectives found</p>
              <button
                onClick={() => setIsFormOpen(true)}
                className="px-6 py-3 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium transition-colors"
              >
                Create Your First Objective
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {sortedObjectives.map((objective) => (
                  <ObjectiveCard
                    key={objective.id}
                    id={objective.id}
                    title={objective.title}
                    spaceName={objective.spaceName || undefined}
                    companyId={objective.companyId || undefined}
                    currentValue={objective.currentValue}
                    targetValue={objective.targetValue}
                    unit={objective.unit || undefined}
                    deadline={new Date(objective.deadline)}
                    status={objective.status}
                    progressPercent={objective.progressPercent}
                    nextMilestone={
                      objective.nextMilestone
                        ? {
                            ...objective.nextMilestone,
                            targetDate: new Date(objective.nextMilestone.targetDate),
                          }
                        : undefined
                    }
                    aiWork={objective.aiWork}
                    humanWork={objective.humanWork}
                    activeBlockers={objective.activeBlockers}
                  />
                ))}
              </div>

              {/* Infinite scroll trigger */}
              <div ref={observerTarget} className="py-8 flex justify-center">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-[#A3A3A3]">
                    <FaSpinner className="animate-spin" />
                    <span className="text-[13px]">Loading more...</span>
                  </div>
                )}
                {!loadingMore && !hasMore && objectives.length > 0 && (
                  <p className="text-[13px] text-[#A3A3A3]">All objectives loaded</p>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Create Form Modal */}
      <ObjectiveForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleCreateObjective}
        workspaceId={workspaceId}
        spaces={spaces}
        goals={goals}
      />
    </div>
  )
}
