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
import { FaPlus, FaMicrophone } from 'react-icons/fa'

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
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialObjectives.length === PAGE_SIZE)
  const [page, setPage] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  const observerTarget = useRef<HTMLDivElement>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [spaceFilter, setSpaceFilter] = useState<string>('all')
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  
  // Advanced filter state
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedGoal, setSelectedGoal] = useState<string>('all')
  const [selectedObjectiveTypes, setSelectedObjectiveTypes] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<number[]>([])
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all')

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
    // Legacy filters (keep for backward compatibility)
    if (statusFilter !== 'all' && obj.status !== statusFilter) return false
    if (spaceFilter !== 'all' && obj.companyId !== spaceFilter) return false
    
    // Advanced filters
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(obj.status)) return false
    if (selectedGoal !== 'all' && obj.goalId !== selectedGoal) return false
    if (selectedObjectiveTypes.length > 0 && !selectedObjectiveTypes.includes(obj.objectiveType)) return false
    if (selectedPriorities.length > 0 && !selectedPriorities.includes(obj.priority)) return false
    
    // Date range filter
    if (selectedDateRange !== 'all') {
      const deadline = new Date(obj.deadline)
      const now = new Date()
      const daysDiff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (selectedDateRange === 'overdue' && daysDiff >= 0) return false
      if (selectedDateRange === 'week' && (daysDiff < 0 || daysDiff > 7)) return false
      if (selectedDateRange === 'month' && (daysDiff < 0 || daysDiff > 30)) return false
      if (selectedDateRange === 'none' && obj.deadline) return false
    }
    
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

  const clearAllFilters = () => {
    setStatusFilter('all')
    setSpaceFilter('all')
    setSelectedStatuses([])
    setSelectedGoal('all')
    setSelectedObjectiveTypes([])
    setSelectedPriorities([])
    setSelectedDateRange('all')
  }

  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    )
  }

  const toggleObjectiveType = (type: string) => {
    setSelectedObjectiveTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const togglePriority = (priority: number) => {
    setSelectedPriorities(prev => 
      prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
    )
  }

  const mainPaddingClass = isMobile ? '' : sidebarCollapsed ? 'ml-20' : 'ml-64'

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
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
                <button className="flex items-center gap-2 px-4 py-2.5 bg-[#000000] hover:bg-[#1A1C1C] text-white rounded font-medium text-[13px] transition-colors min-h-[44px]">
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
                  className="text-[#1A1C1C]"
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
              <div className="bg-white rounded md:rounded p-4 md:p-5">
                <p className="text-[11px] md:text-[13px] leading-[20px] text-[#A3A3A3] mb-1">Total</p>
                <p className="text-[20px] md:text-[24px] leading-[28px] md:leading-[32px] font-medium text-[#1A1A1A]">
                  {objectives.length}
                </p>
              </div>
              <div className="bg-[#F3F3F3] rounded md:rounded border border-[#C6C6C6] p-4 md:p-5">
                <p className="text-[11px] md:text-[13px] leading-[20px] text-[#059669] mb-1">On Track</p>
                <p className="text-[20px] md:text-[24px] leading-[28px] md:leading-[32px] font-medium text-[#047857]">
                  {groupedObjectives.on_track.length}
                </p>
              </div>
              <div className="bg-[#FFFBEB] rounded md:rounded border border-[#FDE68A] p-4 md:p-5">
                <p className="text-[11px] md:text-[13px] leading-[20px] text-[#D97706] mb-1">At Risk</p>
                <p className="text-[20px] md:text-[24px] leading-[28px] md:leading-[32px] font-medium text-[#B45309]">
                  {groupedObjectives.at_risk.length}
                </p>
              </div>
              <div className="bg-[#FEF2F2] rounded md:rounded border border-[#FECACA] p-4 md:p-5">
                <p className="text-[11px] md:text-[13px] leading-[20px] text-[#DC2626] mb-1">Blocked</p>
                <p className="text-[20px] md:text-[24px] leading-[28px] md:leading-[32px] font-medium text-[#B91C1C]">
                  {groupedObjectives.blocked.length}
                </p>
              </div>
              <div className="bg-[#EFF6FF] rounded md:rounded border border-[#BFDBFE] p-4 md:p-5 col-span-2 sm:col-span-1">
                <p className="text-[11px] md:text-[13px] leading-[20px] text-[#2563EB] mb-1">Completed</p>
                <p className="text-[20px] md:text-[24px] leading-[28px] md:leading-[32px] font-medium text-[#1D4ED8]">
                  {groupedObjectives.completed.length}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 md:mb-8">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E5E5E5] hover:bg-[#F9F9F9] text-[#1A1A1A] rounded font-medium text-[13px] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filters
                  {(selectedStatuses.length > 0 || selectedGoal !== 'all' || selectedObjectiveTypes.length > 0 || selectedPriorities.length > 0 || selectedDateRange !== 'all') && (
                    <span className="px-2 py-0.5 bg-[#1A1A1A] text-white rounded-full text-[11px] font-semibold">
                      {selectedStatuses.length + selectedObjectiveTypes.length + selectedPriorities.length + (selectedGoal !== 'all' ? 1 : 0) + (selectedDateRange !== 'all' ? 1 : 0)}
                    </span>
                  )}
                </button>
              </div>

              {/* Filter Panel */}
              {isFilterPanelOpen && (
                <div className="bg-white border border-[#E5E5E5] rounded p-6 space-y-6">
                  {/* Status */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-3 block">
                      Status
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'on_track', label: 'On Track' },
                        { value: 'at_risk', label: 'At Risk' },
                        { value: 'blocked', label: 'Blocked' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'draft', label: 'Draft' },
                        { value: 'paused', label: 'Paused' },
                      ].map((status) => (
                        <label key={status.value} className="flex items-center gap-2 px-3 py-2 bg-[#F9F9F9] rounded cursor-pointer hover:bg-[#F3F3F3] transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedStatuses.includes(status.value)}
                            onChange={() => toggleStatusFilter(status.value)}
                            className="w-4 h-4 text-[#1A1A1A] rounded focus:ring-[#1A1A1A]"
                          />
                          <span className="text-[13px] text-[#1A1A1A]">{status.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Space */}
                  {spaces.length > 0 && (
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-3 block">
                        Space
                      </label>
                      <select
                        value={spaceFilter}
                        onChange={(e) => setSpaceFilter(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#F9F9F9] border border-[#E5E5E5] rounded text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] focus:ring-2 focus:ring-[#1A1A1A]"
                      >
                        <option value="all">All Spaces</option>
                        {spaces.map((space) => (
                          <option key={space.id} value={space.id}>
                            {space.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Goal */}
                  {goals.length > 0 && (
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-3 block">
                        Goal
                      </label>
                      <select
                        value={selectedGoal}
                        onChange={(e) => setSelectedGoal(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#F9F9F9] border border-[#E5E5E5] rounded text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] focus:ring-2 focus:ring-[#1A1A1A]"
                      >
                        <option value="all">All Goals</option>
                        {goals.map((goal) => (
                          <option key={goal.id} value={goal.id}>
                            {goal.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Objective Type */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-3 block">
                      Objective Type
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'business', label: 'Business' },
                        { value: 'personal', label: 'Personal' },
                        { value: 'team', label: 'Team' },
                        { value: 'operational', label: 'Operational' },
                        { value: 'growth', label: 'Growth' },
                        { value: 'financial', label: 'Financial' },
                      ].map((type) => (
                        <label key={type.value} className="flex items-center gap-2 px-3 py-2 bg-[#F9F9F9] rounded cursor-pointer hover:bg-[#F3F3F3] transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedObjectiveTypes.includes(type.value)}
                            onChange={() => toggleObjectiveType(type.value)}
                            className="w-4 h-4 text-[#1A1A1A] rounded focus:ring-[#1A1A1A]"
                          />
                          <span className="text-[13px] text-[#1A1A1A]">{type.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-3 block">
                      Priority
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 1, label: 'Critical' },
                        { value: 2, label: 'High' },
                        { value: 3, label: 'Normal' },
                        { value: 4, label: 'Low' },
                      ].map((priority) => (
                        <button
                          key={priority.value}
                          onClick={() => togglePriority(priority.value)}
                          className={`px-4 py-2 rounded text-[13px] font-medium transition-colors ${
                            selectedPriorities.includes(priority.value)
                              ? 'bg-[#1A1A1A] text-white'
                              : 'bg-[#F9F9F9] text-[#1A1A1A] hover:bg-[#F3F3F3]'
                          }`}
                        >
                          {priority.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A3A3A3] mb-3 block">
                      Date Range
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'all', label: 'All' },
                        { value: 'overdue', label: 'Overdue' },
                        { value: 'week', label: 'Due this week' },
                        { value: 'month', label: 'Due this month' },
                        { value: 'none', label: 'No deadline' },
                      ].map((range) => (
                        <button
                          key={range.value}
                          onClick={() => setSelectedDateRange(range.value)}
                          className={`px-4 py-2 rounded text-[13px] font-medium transition-colors ${
                            selectedDateRange === range.value
                              ? 'bg-[#1A1A1A] text-white'
                              : 'bg-[#F9F9F9] text-[#1A1A1A] hover:bg-[#F3F3F3]'
                          }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear All */}
                  <div className="pt-4 border-t border-[#E5E5E5]">
                    <button
                      onClick={clearAllFilters}
                      className="w-full px-4 py-2.5 bg-[#F9F9F9] hover:bg-[#F3F3F3] text-[#1A1A1A] rounded font-medium text-[13px] transition-colors"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Objectives Grid - Responsive */}
            {sortedObjectives.length === 0 ? (
              <div className="text-center py-12 md:py-20">
                <p className="text-[15px] text-[#A3A3A3] mb-6">No objectives found</p>
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="px-6 py-3 bg-[#000000] hover:bg-[#1A1C1C] text-white rounded font-medium transition-colors min-h-[44px]"
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
                    spaceName={objective.spaceName || undefined}
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
                {loadingMore && <div className="w-6 h-6 border-2 border-[#E5E5E5] border-t-[#1A1C1C] rounded-full animate-spin" />}
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
          spaces={spaces}
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
