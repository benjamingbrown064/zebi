'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import TaskDetailModal from '@/components/TaskDetailModal'
import QuickAddModal from '@/components/QuickAddModal'
import TasksTable from '@/components/TasksTable'
import ResponsivePageContainer from '@/components/responsive/ResponsivePageContainer'
import ResponsiveHeader from '@/components/responsive/ResponsiveHeader'
import MobileListItem from '@/components/responsive/MobileListItem'
import { FaPlus, FaSearch, FaFilter, FaSpinner, FaCircle, FaCheckCircle, FaClock } from 'react-icons/fa'
import { getTasks, createTask, updateTask, deleteTask, Task } from '@/app/actions/tasks'
import { getStatuses, Status } from '@/app/actions/statuses'
import { useWorkspace } from '@/lib/use-workspace'

const PLACEHOLDER_USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'
const PAGE_SIZE = 25

export default function TasksPage() {
  const router = useRouter()
  const { workspaceId, loading: workspaceLoading } = useWorkspace()
  const [tasks, setTasks] = useState<Task[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  const observerTarget = useRef<HTMLDivElement>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPriorities, setSelectedPriorities] = useState<number[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'status' | 'updated' | 'created'>('dueDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load initial data
  useEffect(() => {
    if (workspaceLoading || !workspaceId) return
    
    async function loadInitialData() {
      try {
        const [fetchedTasks, fetchedStatuses] = await Promise.all([
          getTasks(workspaceId!, { limit: PAGE_SIZE, offset: 0 }),
          getStatuses(workspaceId!),
        ])

        setTasks(fetchedTasks)
        setStatuses(fetchedStatuses)
        setHasMore(fetchedTasks.length === PAGE_SIZE)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load data:', err)
        setLoading(false)
      }
    }

    loadInitialData()
  }, [workspaceId, workspaceLoading])

  const loadMoreTasks = useCallback(async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const fetchedTasks = await getTasks(workspaceId!, { limit: PAGE_SIZE, offset: nextPage * PAGE_SIZE })

      if (fetchedTasks.length === 0) {
        setHasMore(false)
        setLoadingMore(false)
        return
      }

      setTasks(prev => [...prev, ...fetchedTasks])
      setPage(nextPage)
      setHasMore(fetchedTasks.length === PAGE_SIZE)
    } catch (err) {
      console.error('Failed to load more tasks:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [page, loadingMore, hasMore, workspaceId])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreTasks()
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
  }, [hasMore, loadingMore, loadMoreTasks])

  const getInboxStatusId = (): string => {
    const inbox = statuses.find(s => s.type === 'inbox')
    return inbox?.id || ''
  }

  const handleAddTask = async (taskInput: { title: string; priority: number; tags?: string[]; goalId?: string }) => {
    const inboxStatusId = getInboxStatusId()
    if (!inboxStatusId) return

    const newTask = await createTask(workspaceId!, PLACEHOLDER_USER_ID, {
      title: taskInput.title,
      priority: taskInput.priority,
      statusId: inboxStatusId,
      tagNames: taskInput.tags,
      goalId: taskInput.goalId,
    })

    if (newTask) {
      setTasks([newTask, ...tasks])
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    const updated = await updateTask(workspaceId!, taskId, updates)
    if (updated) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updated } : t))
    }
  }

  // Apply filters
  let filteredTasks = [...tasks]

  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    filteredTasks = filteredTasks.filter(
      t => t.title.toLowerCase().includes(query) || 
           t.description?.toLowerCase().includes(query)
    )
  }

  if (selectedPriorities.length > 0) {
    filteredTasks = filteredTasks.filter(t => selectedPriorities.includes(t.priority))
  }

  if (selectedStatuses.length > 0) {
    filteredTasks = filteredTasks.filter(t => selectedStatuses.includes(t.statusId))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <FaSpinner className="animate-spin text-[#DD3A44] text-2xl" />
      </div>
    )
  }

  const mainPaddingClass = isMobile ? 'pt-16' : sidebarCollapsed ? 'ml-20' : 'ml-64'

  const getPriorityBadge = (priority: number) => {
    const colors = {
      1: 'bg-red-100 text-red-700 border-red-200',
      2: 'bg-orange-100 text-orange-700 border-orange-200',
      3: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      4: 'bg-blue-100 text-blue-700 border-blue-200',
    }
    const labels = { 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4' }
    return (
      <span className={`px-2 py-1 rounded-[6px] text-[11px] font-semibold border ${colors[priority as keyof typeof colors]}`}>
        {labels[priority as keyof typeof labels]}
      </span>
    )
  }

  const getStatusBadge = (statusId: string) => {
    const status = statuses.find(s => s.id === statusId)
    if (!status) {
      return (
        <span className="flex items-center gap-1.5 text-[12px] text-[#A3A3A3]">
          <FaCircle className="text-[8px]" />
          No status
        </span>
      )
    }
    
    // Map status type to color
    const statusColors: Record<string, string> = {
      inbox: '#A3A3A3',
      planned: '#3B82F6',
      active: '#10B981',
      completed: '#059669',
      cancelled: '#6B7280',
    }
    const statusColor = statusColors[status.type] || '#A3A3A3'
    
    return (
      <span className="flex items-center gap-1.5 text-[12px] text-[#525252]">
        <FaCircle className="text-[8px]" style={{ color: statusColor }} />
        {status.name}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar 
        workspaceName="My Workspace"
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <div className={mainPaddingClass}>
        <ResponsiveHeader
          title="All Tasks"
          subtitle={`${filteredTasks.length} ${filteredTasks.length === 1 ? 'task' : 'tasks'}${
            (searchQuery || selectedPriorities.length > 0 || selectedStatuses.length > 0) ? ' (filtered)' : ''
          }`}
          primaryAction={
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium text-[13px] md:text-[15px] transition-colors min-h-[44px]"
            >
              <FaPlus className="text-sm" />
              <span className="hidden sm:inline">Add Task</span>
              <span className="sm:hidden">Add</span>
            </button>
          }
          secondaryActions={[
            {
              label: 'Search',
              icon: <FaSearch />,
              onClick: () => setIsSearchOpen(true),
            },
            {
              label: isFiltersOpen ? 'Hide Filters' : 'Show Filters',
              icon: <FaFilter />,
              onClick: () => setIsFiltersOpen(!isFiltersOpen),
            },
          ]}
        >
          {/* Filters Panel - Mobile friendly */}
          {isFiltersOpen && (
            <div className="mt-4 p-4 bg-[#F5F5F5] rounded-[10px] space-y-4">
              {/* Priority Filter */}
              <div>
                <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                  Priority
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { num: 1, label: 'P1' },
                    { num: 2, label: 'P2' },
                    { num: 3, label: 'P3' },
                    { num: 4, label: 'P4' },
                  ].map((p) => (
                    <button
                      key={p.num}
                      onClick={() => {
                        if (selectedPriorities.includes(p.num)) {
                          setSelectedPriorities(selectedPriorities.filter(x => x !== p.num))
                        } else {
                          setSelectedPriorities([...selectedPriorities, p.num])
                        }
                      }}
                      className={`px-3 py-2 rounded-[6px] text-[13px] font-medium transition min-h-[44px] ${
                        selectedPriorities.includes(p.num)
                          ? 'bg-[#DD3A44] text-white'
                          : 'bg-white text-[#525252] border border-[#E5E5E5] hover:bg-[#F5F5F5]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[13px] font-medium text-[#1A1A1A] mb-2">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {statuses.slice(0, 5).map((status) => (
                    <button
                      key={status.id}
                      onClick={() => {
                        if (selectedStatuses.includes(status.id)) {
                          setSelectedStatuses(selectedStatuses.filter(x => x !== status.id))
                        } else {
                          setSelectedStatuses([...selectedStatuses, status.id])
                        }
                      }}
                      className={`px-3 py-2 rounded-[6px] text-[13px] font-medium transition min-h-[44px] ${
                        selectedStatuses.includes(status.id)
                          ? 'bg-[#DD3A44] text-white'
                          : 'bg-white text-[#525252] border border-[#E5E5E5] hover:bg-[#F5F5F5]'
                      }`}
                    >
                      {status.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              {(searchQuery || selectedPriorities.length > 0 || selectedStatuses.length > 0) && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedPriorities([])
                    setSelectedStatuses([])
                  }}
                  className="w-full px-4 py-2 text-[13px] bg-white text-[#525252] border border-[#E5E5E5] rounded-[10px] hover:bg-[#F5F5F5] transition-colors font-medium min-h-[44px]"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </ResponsiveHeader>

        <ResponsivePageContainer>
          <div className="py-6 md:py-12">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 md:py-20">
                <p className="text-[15px] text-[#A3A3A3] mb-6">No tasks found</p>
                <button
                  onClick={() => setIsQuickAddOpen(true)}
                  className="px-6 py-3 bg-[#DD3A44] hover:bg-[#C7333D] text-white rounded-[10px] font-medium transition-colors min-h-[44px]"
                >
                  Create First Task
                </button>
              </div>
            ) : (
              <>
                {/* Mobile: List View */}
                <div className="block lg:hidden space-y-3">
                  {filteredTasks.map((task) => (
                    <MobileListItem
                      key={task.id}
                      title={task.title}
                      description={task.description || undefined}
                      icon={
                        <div className="w-10 h-10 rounded-[6px] bg-[#F5F5F5] flex items-center justify-center">
                          {task.completedAt ? (
                            <FaCheckCircle className="text-[#10B981]" />
                          ) : (
                            <FaCircle className="text-[#A3A3A3] text-xs" />
                          )}
                        </div>
                      }
                      badge={getPriorityBadge(task.priority)}
                      metadata={[
                        { label: 'Status', value: getStatusBadge(task.statusId) },
                        ...(task.dueAt ? [{ 
                          label: 'Due', 
                          value: new Date(task.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        }] : []),
                        ...(task.project ? [{ label: 'Project', value: task.project.name }] : []),
                      ]}
                      href={`/tasks/${task.id}`}
                    />
                  ))}
                </div>

                {/* Desktop: Table View */}
                <div className="hidden lg:block">
                  <TasksTable
                    tasks={filteredTasks}
                    onTaskClick={(task) => router.push(`/tasks/${task.id}`)}
                    onComplete={async (taskId) => {
                      await handleUpdateTask(taskId, { completedAt: new Date().toISOString() } as any)
                    }}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={(newSortBy, newSortOrder) => {
                      setSortBy(newSortBy as any)
                      setSortOrder(newSortOrder)
                    }}
                    statuses={statuses}
                  />
                </div>
              </>
            )}

            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="py-8 flex justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-[#A3A3A3]">
                  <FaSpinner className="animate-spin" />
                  <span className="text-[13px]">Loading more tasks...</span>
                </div>
              )}
              {!loadingMore && !hasMore && tasks.length > 0 && (
                <p className="text-[13px] text-[#A3A3A3]">All tasks loaded</p>
              )}
            </div>
          </div>
        </ResponsivePageContainer>
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-12 md:pt-20 px-4"
          onClick={() => setIsSearchOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-2xl rounded-[14px] shadow-lg p-4 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border border-[#E5E5E5] rounded-[10px] px-4 py-3">
              <FaSearch className="text-[#A3A3A3]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="flex-1 outline-none bg-transparent text-[#1A1A1A] text-[15px] placeholder-[#A3A3A3]"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[#A3A3A3] hover:text-[#525252] min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      {isQuickAddOpen && (
        <QuickAddModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onAdd={handleAddTask}
          workspaceId={workspaceId!}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}
