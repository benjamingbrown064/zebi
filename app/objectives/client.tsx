'use client'
import { cachedFetch, invalidateCache } from '@/lib/client-cache'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react'
import Sidebar from '@/components/Sidebar'
import ObjectiveCard from '@/components/ObjectiveCard'
import ObjectiveForm from '@/components/ObjectiveForm'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader'
import VoiceEntityModal from '@/components/voice-entity/VoiceEntityModal'
import { FaPlus, FaSpinner, FaMicrophone } from 'react-icons/fa'

interface Objective {
  id: string
  title: string
  description?: string | null
  companyId?: string | null
  companyName?: string | null
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

interface Company {
  id: string
  name: string
}

interface Goal {
  id: string
  name: string
}

interface ObjectivesClientProps {
  initialObjectives: Objective[]
  companies: Company[]
  goals: Goal[]
  workspaceId: string
}

const PAGE_SIZE = 25

export default function ObjectivesClient({
  initialObjectives,
  companies,
  goals,
  workspaceId,
}: ObjectivesClientProps) {
  const router = useRouter()
  const [objectives, setObjectives] = useState<Objective[]>(initialObjectives)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialObjectives.length === PAGE_SIZE)
  const [page, setPage] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  const observerTarget = useRef<HTMLDivElement>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
    if (companyFilter !== 'all' && obj.companyId !== companyFilter) return false
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

  const handleVoiceSuccess = (objectiveId: string) => {
    router.refresh()
  }

  const mainPaddingClass = isMobile ? '' : sidebarCollapsed ? 'ml-20' : 'ml-64'

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      <Sidebar
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div className={mainPaddingClass}>
        {/* Responsive Header */}
        <ResponsiveHeader
          title="Objectives"
          subtitle={`${sortedObjectives.length} ${sortedObjectives.length === 1 ? 'objective' : 'objectives'}`}
          primaryAction={
            <Dropdown>
              <DropdownTrigger>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium text-[13px] transition-colors min-h-[44px]">
                  <FaPlus className="text-sm" />
                  <span className="hidden sm:inline">New Objective</span>
                  <span className="sm:hidden">New</span>
                </button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Create objective options">
                <DropdownItem
                  key="form"
                  startContent={<FaPlus className="text-lg" />}
                  onPress={() => setIsFormOpen(true)}
                >
                  Create with Form
                </DropdownItem>
                <DropdownItem
                  key="voice"
                  startContent={<FaMicrophone className="text-lg" />}
                  onPress={() => setIsVoiceModalOpen(true)}
                  className="text-[#006766]"
                >
                  Create via Voice
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          }
        />

        {/* Main Content */}
        <ResponsivePageContainer>
          <div className="py-6 md:py-12">
            {/* Summary Stats - Responsive Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6 mb-6 md:mb-12">
              <div className="bg-white rounded-[10px] md:rounded-[14px] p-4 md:p-5">
                <p className="text-[11px] md:text-[13px] leading-[20px] text-[#A3A3A3] mb-1">Total</p>
                <p className="text-[20px] md:text-[24px] leading-[28px] md:leading-[32px] font-medium text-[#1A1A1A]">
                  {objectives.length}
                </p>
              </div>
              <div className="bg-[#ECFDF5] rounded-[10px] md:rounded-[14px] border border-[#A7F3D0] p-4 md:p-5">
                <p className="text-[11px] md:text-[13px] leading-[20px] text-[#059669] mb-1">On Track</p>
                <p className="text-[20px] md:text-[24px] leading-[28px] md:leading-[32px] font-medium text-[#047857]">
                  {groupedObjectives.on_track.length}
                </p>
              </div>
              <div className="bg-[#FFFBEB] rounded-[10px] md:rounded-[14px] border border-[#FDE68A] p-4 md:p-5">
                <p className="text-[11px] md:text-[13px] leading-[20px] text-[#D97706] mb-1">At Risk</p>
                <p className="text-[20px] md:text-[24px] leading-[28px] md:leading-[32px] font-medium text-[#B45309]">
                  {groupedObjectives.at_risk.length}
                </p>
              </div>
              <div className="bg-[#FEF2F2] rounded-[10px] md:rounded-[14px] border border-[#FECACA] p-4 md:p-5">
                <p className="text-[11px] md:text-[13px] leading-[20px] text-[#DC2626] mb-1">Blocked</p>
                <p className="text-[20px] md:text-[24px] leading-[28px] md:leading-[32px] font-medium text-[#B91C1C]">
                  {groupedObjectives.blocked.length}
                </p>
              </div>
              <div className="bg-[#EFF6FF] rounded-[10px] md:rounded-[14px] border border-[#BFDBFE] p-4 md:p-5 col-span-2 sm:col-span-1">
                <p className="text-[11px] md:text-[13px] leading-[20px] text-[#2563EB] mb-1">Completed</p>
                <p className="text-[20px] md:text-[24px] leading-[28px] md:leading-[32px] font-medium text-[#1D4ED8]">
                  {groupedObjectives.completed.length}
                </p>
              </div>
            </div>

            {/* Filters - Responsive */}
            <div className="mb-6 md:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-[13px] text-[#A3A3A3]">Filter:</span>

                {/* Status Filter - Horizontal scroll on mobile */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'on_track', label: 'On Track' },
                    { value: 'at_risk', label: 'At Risk' },
                    { value: 'blocked', label: 'Blocked' },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setStatusFilter(filter.value)}
                      className={`
                        px-4 py-2 rounded-[10px] text-[13px] font-medium transition-colors whitespace-nowrap min-h-[44px]
                        ${
                          statusFilter === filter.value
                            ? 'bg-[#FEF2F2] text-[#DD3A44] border border-[#DD3A44]'
                            : 'bg-white text-[#525252] hover:bg-[#F5F5F5]'
                        }
                      `}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Company Filter */}
                {companies.length > 0 && (
                  <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="px-4 py-2 bg-white  rounded-[10px] text-[13px] text-[#525252] focus:outline-none focus:border-[#DD3A44] focus:ring-2 focus:ring-[#DD3A44] focus:ring-offset-2 min-h-[44px] w-full sm:w-auto"
                  >
                    <option value="all">All Companies</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Objectives Grid - Responsive */}
            {sortedObjectives.length === 0 ? (
              <div className="text-center py-12 md:py-20">
                <p className="text-[15px] text-[#A3A3A3] mb-6">No objectives found</p>
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="px-6 py-3 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium transition-colors min-h-[44px]"
                >
                  Create First Objective
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {sortedObjectives.map((objective) => (
                  <ObjectiveCard
                    key={objective.id}
                    id={objective.id}
                    title={objective.title}
                    companyName={objective.companyName || undefined}
                    companyId={objective.companyId || undefined}
                    currentValue={Number(objective.currentValue)}
                    targetValue={Number(objective.targetValue)}
                    unit={objective.unit || undefined}
                    deadline={new Date(objective.deadline)}
                    status={objective.status}
                    progressPercent={Number(objective.currentValue) / Number(objective.targetValue) * 100}
                    activeBlockers={objective.activeBlockers}
                  />
                ))}
              </div>
            )}

            {/* Infinite Scroll Trigger */}
            {hasMore && (
              <div
                ref={observerTarget}
                className="flex items-center justify-center py-8"
              >
                {loadingMore && <FaSpinner className="animate-spin text-[#DD3A44] text-2xl" />}
              </div>
            )}
          </div>
        </ResponsivePageContainer>
      </div>

      {/* Create Objective Modal */}
      {isFormOpen && (
        <ObjectiveForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSave={handleCreateObjective}
          workspaceId={workspaceId}
          companies={companies}
          goals={goals}
        />
      )}

      {/* Voice Entity Modal */}
      <VoiceEntityModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        entityType="objective"
        onSuccess={handleVoiceSuccess}
      />
    </div>
  )
}
